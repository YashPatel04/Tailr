import asyncio
import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app

_database_url = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://resume_builder:resume_builder@db:5432/resume_builder",
)
_admin_database_url = _database_url.rsplit("/", 1)[0] + "/postgres"
_test_database_url = _database_url.rsplit("/", 1)[0] + "/resume_builder_test"


async def _ensure_test_database() -> None:
    admin_engine = create_async_engine(_admin_database_url, echo=False)
    async with admin_engine.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = 'resume_builder_test'")
        )
        if not exists:
            await conn.execute(text("COMMIT"))
            await conn.execute(text("CREATE DATABASE resume_builder_test"))
    await admin_engine.dispose()


asyncio.run(_ensure_test_database())

engine = create_async_engine(_test_database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:
        yield session
        await session.rollback()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        preflight = await ac.get("/api/health")
        csrf = preflight.cookies.get("csrf_token")
        ac.headers["X-CSRF-Token"] = csrf
        yield ac
    app.dependency_overrides.clear()
