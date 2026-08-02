from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.models import RefreshToken, User
from app.utils.tokens import create_access_token, create_refresh_token, hash_token


async def _create_oauth_user(db, email="oauth@test.com", provider="github"):
    user = User(
        id=uuid4(),
        email=email,
        oauth_provider=provider,
        oauth_id=f"{provider}_{uuid4().hex[:8]}",
    )
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, db_session):
    user = await _create_oauth_user(db_session, "refresh@test.com")

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid4(),
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
    user = await _create_oauth_user(db_session, "reuse@test.com")

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_str),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(rt)
    await db_session.commit()

    client.cookies.set("refresh_token", refresh_str)
    resp1 = await client.post("/api/auth/refresh")
    assert resp1.status_code == 200

    client.cookies.clear()
    client.cookies.set("refresh_token", refresh_str)
    resp2 = await client.post("/api/auth/refresh")
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, db_session):
    user = await _create_oauth_user(db_session, "logout@test.com")

    refresh_str = create_refresh_token(user.id)
    rt = RefreshToken(
        id=uuid4(),
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
async def test_delete_account(client: AsyncClient, db_session):
    user = await _create_oauth_user(db_session, "delete@test.com")
    await db_session.commit()

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.delete("/api/users/me")
    assert resp.status_code == 200
