import asyncio
import base64
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.models import User
from app.security import COOKIE_NAME


async def test_guests_can_read_but_cannot_paint(client):
    response = await client.get("/api/board")
    board = response.json()
    assert response.status_code == 200
    assert board["size"] == 256 and len(board["palette"]) == 32
    assert base64.b64decode(board["pixels"]) == bytes(65536)
    assert (await client.post("/api/pixels", json={"x": 0, "y": 0, "color": 14})).status_code == 401


async def test_cooldown_persists_in_database(client, participant, running_app):
    first = await client.post("/api/pixels", json={"x": 255, "y": 255, "color": 14})
    assert first.status_code == 200 and first.json()["changed"]
    assert 4900 <= first.json()["next_pixel_at"] - first.json()["server_time"] <= 5100
    second = await client.post("/api/pixels", json={"x": 1, "y": 1, "color": 14})
    assert second.status_code == 429
    me = await client.get("/api/auth/me")
    assert me.json()["user"]["next_pixel_at"] == first.json()["next_pixel_at"]
    async with running_app.state.db() as session, session.begin():
        await session.execute(update(User).where(User.id == uuid.UUID(participant["id"]))
                              .values(next_pixel_at=datetime.now(UTC) - timedelta(seconds=1)))
    assert (await client.post("/api/pixels", json={"x": 1, "y": 1, "color": 14})).status_code == 200


async def test_parallel_tabs_cannot_bypass_cooldown(client, participant):
    responses = await asyncio.gather(*[
        client.post("/api/pixels", json={"x": x, "y": 10, "color": 14}) for x in range(20)
    ])
    assert [response.status_code for response in responses].count(200) == 1
    assert [response.status_code for response in responses].count(429) == 19
    assert (await client.get("/api/board")).json()["revision"] == 1


async def test_same_color_does_not_consume_cooldown(client, participant):
    result = await client.post("/api/pixels", json={"x": 5, "y": 5, "color": 0})
    assert not result.json()["changed"]
    assert result.json()["next_pixel_at"] == 0
    first = await client.post("/api/pixels", json={"x": 5, "y": 5, "color": 14})
    again = await client.post("/api/pixels", json={"x": 5, "y": 5, "color": 14})
    assert not again.json()["changed"]
    assert again.json()["next_pixel_at"] == first.json()["next_pixel_at"]
    assert again.json()["revision"] == 1


async def test_bounds_and_strict_integer_validation(client, participant):
    for payload in ({"x": -1, "y": 1, "color": 14}, {"x": 256, "y": 1, "color": 14},
                    {"x": 1, "y": 256, "color": 14}, {"x": 1, "y": 1, "color": 32},
                    {"x": 1, "y": 1, "color": -1}, {"x": 1.5, "y": 1, "color": 14},
                    {"x": True, "y": 1, "color": 14}):
        assert (await client.post("/api/pixels", json=payload)).status_code == 422
    assert (await client.get("/api/board")).json()["revision"] == 0


async def test_last_committed_pixel_wins(client, participant):
    first_cookie = client.cookies.get(COOKIE_NAME)
    response = await client.post("/api/auth/register", json={"email": "second@example.com", "password": "second-password"})
    assert response.status_code == 201
    second_cookie = client.cookies.get(COOKIE_NAME)
    client.cookies.set(COOKIE_NAME, first_cookie, domain="testserver.local", path="/")
    assert (await client.post("/api/pixels", json={"x": 0, "y": 0, "color": 14})).json()["changed"]
    client.cookies.set(COOKIE_NAME, second_cookie, domain="testserver.local", path="/")
    assert (await client.post("/api/pixels", json={"x": 0, "y": 0, "color": 24})).json()["changed"]
    board = (await client.get("/api/board")).json()
    assert board["revision"] == 2
    assert base64.b64decode(board["pixels"])[0] == 24
