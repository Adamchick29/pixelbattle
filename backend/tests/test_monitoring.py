import asyncio
import uuid
from unittest.mock import AsyncMock

from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy import func, select

from app.models import HourlyViews


async def test_page_load_is_idempotent_even_with_parallel_retries(client, running_app):
    page_id = str(uuid.uuid4())
    responses = await asyncio.gather(*[client.post("/api/visits", json={"page_id": page_id}) for _ in range(10)])
    assert sum(response.json()["counted"] for response in responses) == 1
    assert (await client.post("/api/visits", json={"page_id": str(uuid.uuid4())})).json()["counted"]
    async with running_app.state.db() as session:
        assert await session.scalar(select(func.sum(HourlyViews.count))) == 2
    metrics = await client.get("/metrics")
    assert "pixel_battle_page_views_total 2.0" in metrics.text
    assert "@example.com" not in metrics.text


async def test_health_checks_do_not_count_as_visits(client):
    assert (await client.get("/health/live")).status_code == 200
    assert (await client.get("/health/ready")).status_code == 200
    metrics = (await client.get("/metrics")).text
    assert "pixel_battle_page_views_total 0.0" in metrics
    assert 'pixel_battle_dependency_up{dependency="postgres"} 1.0' in metrics
    assert 'pixel_battle_dependency_up{dependency="redis"} 1.0' in metrics


async def test_dependency_failure_sets_readiness_and_metric(client, running_app):
    redis = running_app.state.redis
    running_app.state.redis = AsyncMock()
    running_app.state.redis.ping.side_effect = RedisConnectionError("test failure")
    try:
        response = await client.get("/health/ready")
        assert response.status_code == 503
        assert (await client.get("/health/live")).status_code == 200
        assert 'pixel_battle_dependency_up{dependency="redis"} 0.0' in (await client.get("/metrics")).text
    finally:
        running_app.state.redis = redis
