import uuid

import pytest
from httpx import AsyncClient

from app.models.models import MasterResume, User
from app.tests.factories import create_session, create_user
from app.utils.tokens import create_access_token


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, db_session):
    user = User(
        id=uuid.uuid4(),
        email="sess@test.com",
        oauth_provider="github",
        oauth_id="github_test123",
    )
    db_session.add(user)

    master = MasterResume(
        id=uuid.uuid4(),
        user_id=user.id,
        filename="resume.tex",
        original_format="tex",
        content_json={"basics": {"name": "Test"}, "sections": [], "metadata": {}},
    )
    db_session.add(master)
    await db_session.commit()

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.post(
        "/api/sessions",
        json={
            "company_name": "TestCorp",
            "role_title": "Engineer",
            "job_description": "Build things",
            "tailoring_mode": "polish",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["company_name"] == "TestCorp"
    assert data["role_title"] == "Engineer"


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient, db_session):
    user = await create_user(db_session, "list@test.com")
    await create_session(db_session, user, "TestCorp", "Engineer")

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.get("/api/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_grouped_sessions(client: AsyncClient, db_session):
    user = await create_user(db_session, "grouped@test.com")
    await create_session(db_session, user, "TestCorp", "Engineer")

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.get("/api/sessions/grouped")
    assert resp.status_code == 200
    data = resp.json()
    assert "today" in data


@pytest.mark.asyncio
async def test_update_session(client: AsyncClient, db_session):
    user = await create_user(db_session, "update@test.com")
    session = await create_session(db_session, user, "OldCorp", "Intern")

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.patch(f"/api/sessions/{session.id}", json={"company_name": "NewCorp"})
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "NewCorp"


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient, db_session):
    user = await create_user(db_session, "delsess@test.com")
    session = await create_session(db_session, user, "DelCorp", "Dev")

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.delete(f"/api/sessions/{session.id}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_companies(client: AsyncClient, db_session):
    user = await create_user(db_session, "comp@test.com")
    await create_session(db_session, user, "Alpha Inc", "Engineer")
    await create_session(db_session, user, "Alpha Inc", "Manager")

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.get("/api/companies")
    assert resp.status_code == 200
    data = resp.json()
    assert any(c["company_name"] == "Alpha Inc" for c in data)


@pytest.mark.asyncio
async def test_list_tags(client: AsyncClient, db_session):
    user = await create_user(db_session, "tag@test.com")
    session = await create_session(db_session, user, "TagCorp", "Dev")
    session.tags = ["python", "backend"]
    db_session.add(session)
    await db_session.commit()

    access = create_access_token(user.id)
    client.cookies.set("access_token", access)

    resp = await client.get("/api/tags")
    assert resp.status_code == 200
