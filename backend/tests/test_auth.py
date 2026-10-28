import uuid

from sqlalchemy import select

from app.models import User
from app.security import COOKIE_NAME, token_key


async def test_registration_session_login_logout(client, participant, running_app):
    cookie = client.cookies.get(COOKIE_NAME)
    assert cookie
    me = await client.get("/api/auth/me")
    assert me.json()["user"]["id"] == participant["id"]
    async with running_app.state.db() as session:
        user = await session.get(User, uuid.UUID(participant["id"]))
        assert user.password_hash.startswith("$argon2id$")
        assert "eight-pixels!" not in user.password_hash
    assert (await client.post("/api/auth/logout")).status_code == 204
    assert await running_app.state.redis.get(token_key(cookie)) is None
    assert (await client.get("/api/auth/me")).status_code == 401
    assert (await client.post("/api/auth/login", json={"email": "ARTIST@example.com", "password": "eight-pixels!"})).status_code == 200
    assert client.cookies.get(COOKIE_NAME) != cookie


async def test_duplicate_case_insensitive_and_wrong_password(client, participant):
    response = await client.post("/api/auth/register", json={"email": "ARTIST@example.com", "password": "another-password"})
    assert response.status_code == 409
    response = await client.post("/api/auth/login", json={"email": participant["email"], "password": "wrong-password"})
    assert response.status_code == 401


async def test_password_and_email_validation(client):
    for payload in ({"email": "invalid", "password": "password123"}, {"email": "a@example.com", "password": "short"}):
        assert (await client.post("/api/auth/register", json=payload)).status_code == 422


async def test_missing_or_foreign_origin_is_rejected(client, running_app):
    for origin in ("https://evil.example", "null", ""):
        response = await client.post("/api/auth/register", headers={"Origin": origin},
                                     json={"email": "a@example.com", "password": "password123"})
        assert response.status_code == 403
    async with running_app.state.db() as session:
        assert await session.scalar(select(User)) is None


async def test_expired_session(client, participant, running_app):
    await running_app.state.redis.delete(token_key(client.cookies.get(COOKIE_NAME)))
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_login_throttling(client):
    payload = {"email": "nobody@example.com", "password": "incorrect-password"}
    for _ in range(10):
        assert (await client.post("/api/auth/login", json=payload)).status_code == 401
    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) > 0
