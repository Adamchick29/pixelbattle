import hashlib
import secrets
import threading

import anyio
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException, Request
from redis.asyncio import Redis

COOKIE_NAME = "pb_session"
hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY_HASH = hasher.hash("dummy-password-never-accepted")
HASH_SLOTS = threading.BoundedSemaphore(4)

RATE_LIMIT_LUA = """
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {n, redis.call('TTL', KEYS[1])}
"""


def token_key(token: str) -> str:
    return "session:" + hashlib.sha256(token.encode()).hexdigest()


def check_origin(request: Request) -> None:
    if request.headers.get("origin", "").rstrip("/") not in request.app.state.settings.origins:
        raise HTTPException(403, "Недопустимый источник запроса")


async def rate_limit(request: Request, scope: str, limit: int, seconds: int, identity: str | None = None) -> None:
    redis: Redis = request.app.state.redis
    identity = identity or (request.client.host if request.client else "unknown")
    digest = hashlib.sha256(identity.encode()).hexdigest()
    count, ttl = await redis.eval(RATE_LIMIT_LUA, 1, f"rate:{scope}:{digest}", seconds)
    if count > limit:
        raise HTTPException(429, "Слишком много попыток. Попробуйте позже.", headers={"Retry-After": str(max(ttl, 1))})


async def hash_password(password: str) -> str:
    def hash_limited() -> str:
        with HASH_SLOTS:
            return hasher.hash(password)
    return await anyio.to_thread.run_sync(hash_limited)


async def verify_password(password_hash: str, password: str) -> bool:
    def verify() -> bool:
        with HASH_SLOTS:
            try:
                return hasher.verify(password_hash, password)
            except (VerificationError, InvalidHashError):
                return False

    return await anyio.to_thread.run_sync(verify)


async def issue_session(request: Request, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await request.app.state.redis.set(token_key(token), user_id, ex=request.app.state.settings.session_ttl_seconds)
    return token
