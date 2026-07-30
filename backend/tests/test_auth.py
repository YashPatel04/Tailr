from datetime import UTC

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "new@test.com",
            "password": "testpassword123",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Check your inbox to verify your email."


@pytest.mark.asyncio
async def test_register_duplicate_email_silent(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password

    user = User(
        id=uuid.uuid4(),
        email="dup@test.com",
        password_hash=hash_password("password123"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "dup@test.com",
            "password": "newpassword12345",
        },
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_login(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password

    user = User(
        id=uuid.uuid4(),
        email="login@test.com",
        password_hash=hash_password("password123456"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "login@test.com",
            "password": "password123456",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "login@test.com"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unverified_email(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password

    user = User(
        id=uuid.uuid4(),
        email="unverified@test.com",
        password_hash=hash_password("password123456"),
        is_verified=False,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/login",
        json={
            "email": "unverified@test.com",
            "password": "password123456",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, db_session):
    import uuid
    from datetime import datetime, timedelta

    from app.models.models import RefreshToken, User
    from app.utils.password import hash_password
    from app.utils.tokens import create_refresh_token, hash_token

    user = User(
        id=uuid.uuid4(),
        email="refresh@test.com",
        password_hash=hash_password("password123456"),
        is_verified=True,
    )
    db_session.add(user)

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_str),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(rt)
    await db_session.commit()

    client.cookies.set("refresh_token", refresh_str)
    resp = await client.post("/api/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies


@pytest.mark.asyncio
async def test_refresh_token_reuse_revokes_all(client: AsyncClient, db_session):
    import uuid
    from datetime import datetime, timedelta

    from app.models.models import RefreshToken, User
    from app.utils.password import hash_password
    from app.utils.tokens import create_refresh_token, hash_token

    user = User(
        id=uuid.uuid4(),
        email="reuse@test.com",
        password_hash=hash_password("password123456"),
        is_verified=True,
    )
    db_session.add(user)

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_str),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(rt)
    await db_session.commit()

    client.cookies.set("refresh_token", refresh_str)
    resp1 = await client.post("/api/auth/refresh")
    assert resp1.status_code == 200

    client.cookies.set("refresh_token", refresh_str)
    resp2 = await client.post("/api/auth/refresh")
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, db_session):
    import uuid
    from datetime import datetime, timedelta

    from app.models.models import RefreshToken, User
    from app.utils.password import hash_password
    from app.utils.tokens import create_refresh_token, hash_token

    user = User(
        id=uuid.uuid4(),
        email="logout@test.com",
        password_hash=hash_password("password123456"),
        is_verified=True,
    )
    db_session.add(user)

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_str),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(rt)
    await db_session.commit()

    client.cookies.set("refresh_token", refresh_str)
    resp = await client.post("/api/auth/logout")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_forgot_password(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password

    user = User(
        id=uuid.uuid4(),
        email="forgot@test.com",
        password_hash=hash_password("password123456"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post("/api/auth/forgot-password", json={"email": "forgot@test.com"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_silent(client: AsyncClient):
    resp = await client.post("/api/auth/forgot-password", json={"email": "nobody@test.com"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password
    from app.utils.tokens import create_access_token

    user = User(
        id=uuid.uuid4(),
        email="changepw@test.com",
        password_hash=hash_password("oldpassword12345"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.post(
        "/api/users/me/change-password",
        json={
            "current_password": "oldpassword12345",
            "new_password": "newpassword12345",
        },
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_account(client: AsyncClient, db_session):
    import uuid

    from app.models.models import User
    from app.utils.password import hash_password
    from app.utils.tokens import create_access_token

    user = User(
        id=uuid.uuid4(),
        email="delete@test.com",
        password_hash=hash_password("testpassword123"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.delete("/api/users/me")
    assert resp.status_code == 200
