import os

import httpx
import pytest
from asgi_lifespan import LifespanManager
from redis.asyncio import Redis
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import Settings
from app.main import create_app
from app.models import Base, Board


@pytest.fixture
async def running_app():
    database_url = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://pixel:pixel@127.0.0.1:15432/pixel_battle_test")
    redis_url = os.environ.get("TEST_REDIS_URL", "redis://127.0.0.1:16379/15")
    if not (make_url(database_url).database or "").endswith("_test"):
        raise RuntimeError("Tests may only reset a database whose name ends in _test")
    if redis_url.rsplit("/", 1)[-1] != "15":
        raise RuntimeError("Tests may only flush Redis database 15")
    engine = create_async_engine(database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(Board.__table__.insert().values(id=1, pixels=bytes(256 * 256), revision=0))
    await engine.dispose()
    redis = Redis.from_url(redis_url)
    await redis.flushdb()
    await redis.aclose()
    app = create_app(Settings(database_url=database_url, redis_url=redis_url, allowed_origins="http://testserver"))
    async with LifespanManager(app):
        yield app


@pytest.fixture
async def client(running_app):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=running_app),
                               base_url="http://testserver", headers={"Origin": "http://testserver"}) as client:
        yield client


@pytest.fixture
async def participant(client):
    response = await client.post("/api/auth/register", json={"email": "artist@example.com", "password": "eight-pixels!"})
    assert response.status_code == 201, response.text
    return response.json()["user"]
