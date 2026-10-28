import asyncio
import base64
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from pydantic import BaseModel, EmailStr, Field
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.websockets import WebSocketDisconnect

from app.config import Settings, get_settings
from app.models import Board, HourlyViews, PageView, User
from app.palette import PALETTE
from app.realtime import CHANNEL, Hub, redis_listener, revision_heartbeat, stop_tasks
from app.security import (
    COOKIE_NAME,
    DUMMY_HASH,
    check_origin,
    hash_password,
    issue_session,
    rate_limit,
    token_key,
    verify_password,
)
from app.telemetry import Metrics

logger = logging.getLogger(__name__)


def millis(value: datetime | None) -> int:
    return int(value.timestamp() * 1000) if value else 0


def user_json(user: User) -> dict:
    return {"id": str(user.id), "email": user.email, "next_pixel_at": millis(user.next_pixel_at)}


async def snapshot(app) -> dict:
    async with app.state.db() as session:
        board = await session.get(Board, 1)
        if board is None:
            raise HTTPException(503, "Поле еще не готово")
        return {
            "type": "board.snapshot", "size": app.state.settings.board_size,
            "palette": PALETTE, "pixels": base64.b64encode(board.pixels).decode(),
            "revision": board.revision, "cooldown_seconds": app.state.settings.cooldown_seconds,
            "server_time": millis(datetime.now(UTC)),
        }


async def clean_page_ids(app) -> None:
    while True:
        await asyncio.sleep(3600)
        try:
            async with app.state.db() as session, session.begin():
                await session.execute(delete(PageView).where(PageView.created_at < func.now() - text("interval '7 days'")))
        except SQLAlchemyError:
            logger.exception("Page ID cleanup failed")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=10)
        app.state.settings = settings
        app.state.db = async_sessionmaker(engine, expire_on_commit=False)
        app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=3, socket_timeout=5)
        app.state.metrics = Metrics()
        app.state.hub = Hub(app.state.metrics)
        tasks: list[asyncio.Task] = []
        try:
            await app.state.redis.ping()
            async with app.state.db() as session:
                total = await session.scalar(select(func.coalesce(func.sum(HourlyViews.count), 0)))
                revision = await session.scalar(select(Board.revision).where(Board.id == 1))
            if revision is None:
                raise RuntimeError("Run alembic upgrade head before starting the API")
            app.state.metrics.views.inc(int(total))
            app.state.metrics.pixels.inc(revision)
            tasks = [
                asyncio.create_task(redis_listener(app)),
                asyncio.create_task(revision_heartbeat(app)),
                asyncio.create_task(clean_page_ids(app)),
            ]
            yield
        finally:
            await stop_tasks(tasks)
            await app.state.redis.aclose()
            await engine.dispose()

    app = FastAPI(title="Пиксель Баттл API", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None)

    @app.middleware("http")
    async def observe(request: Request, call_next):
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Content-Type-Options"] = "nosniff"
            if request.url.path.startswith("/api/"):
                response.headers["Cache-Control"] = "no-store"
            return response
        finally:
            if request.url.path.startswith("/api/") and hasattr(app.state, "metrics"):
                route = getattr(request.scope.get("route"), "path", "unmatched")
                app.state.metrics.requests.labels(request.method, route, str(status)).inc()
                app.state.metrics.latency.labels(request.method, route).observe(time.perf_counter() - started)

    @app.exception_handler(RedisError)
    @app.exception_handler(SQLAlchemyError)
    async def unavailable(_request: Request, exc: Exception):
        logger.error("Dependency unavailable: %s", type(exc).__name__)
        return JSONResponse({"detail": "Сервис временно недоступен. Попробуйте еще раз."}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def invalid_input(_request: Request, _exc: RequestValidationError):
        return JSONResponse({"detail": "Проверьте введенные данные. Пароль: от 8 до 128 символов."}, status_code=422)

    async def current_user(request: Request) -> User:
        token = request.cookies.get(COOKIE_NAME)
        user_id = await request.app.state.redis.get(token_key(token)) if token and len(token) < 128 else None
        if not user_id:
            raise HTTPException(401, "Войдите, чтобы раскрашивать пиксели")
        async with app.state.db() as session:
            user = await session.get(User, uuid.UUID(user_id))
        if user is None:
            raise HTTPException(401, "Войдите в аккаунт еще раз")
        return user

    def set_session(response: Response, token: str):
        response.set_cookie(COOKIE_NAME, token, max_age=settings.session_ttl_seconds,
                            httponly=True, secure=settings.session_cookie_secure, samesite="lax", path="/")

    @app.post("/api/auth/register", dependencies=[Depends(check_origin)], status_code=201)
    async def register(credentials: Credentials, request: Request, response: Response):
        await rate_limit(request, "register", 5, 3600)
        email = str(credentials.email).casefold()
        password_hash = await hash_password(credentials.password)
        async with app.state.db() as session:
            user = User(email=email, password_hash=password_hash)
            session.add(user)
            try:
                await session.commit()
            except IntegrityError as exc:
                raise HTTPException(409, "Этот email уже зарегистрирован. Войдите в аккаунт.") from exc
        set_session(response, await issue_session(request, str(user.id)))
        return {"user": user_json(user), "server_time": millis(datetime.now(UTC))}

    @app.post("/api/auth/login", dependencies=[Depends(check_origin)])
    async def login(credentials: Credentials, request: Request, response: Response):
        await rate_limit(request, "login-ip", 10, 60)
        email = str(credentials.email).casefold()
        await rate_limit(request, "login-email", 10, 60, email)
        async with app.state.db() as session:
            user = await session.scalar(select(User).where(User.email == email))
        valid = await verify_password(user.password_hash if user else DUMMY_HASH, credentials.password)
        if not user or not valid:
            raise HTTPException(401, "Неверный email или пароль")
        old_token = request.cookies.get(COOKIE_NAME)
        if old_token:
            await app.state.redis.delete(token_key(old_token))
        set_session(response, await issue_session(request, str(user.id)))
        return {"user": user_json(user), "server_time": millis(datetime.now(UTC))}

    @app.post("/api/auth/logout", dependencies=[Depends(check_origin)], status_code=204)
    async def logout(request: Request, response: Response):
        token = request.cookies.get(COOKIE_NAME)
        if token:
            await app.state.redis.delete(token_key(token))
        response.delete_cookie(COOKIE_NAME, path="/", httponly=True,
                               secure=settings.session_cookie_secure, samesite="lax")

    @app.get("/api/auth/me")
    async def me(user: Annotated[User, Depends(current_user)]):
        return {"user": user_json(user), "server_time": millis(datetime.now(UTC))}

    @app.get("/api/board")
    async def get_board():
        return await snapshot(app)

    @app.post("/api/pixels", dependencies=[Depends(check_origin)])
    async def place_pixel(pixel: PixelInput, request: Request, user: Annotated[User, Depends(current_user)]):
        await rate_limit(request, "paint", 60, 60, str(user.id))
        size = settings.board_size
        if not (0 <= pixel.x < size and 0 <= pixel.y < size and 0 <= pixel.color < len(PALETTE)):
            raise HTTPException(422, "Координаты или цвет за пределами палитры")
        changed = False
        async with app.state.db() as session, session.begin():
            locked_user = await session.scalar(select(User).where(User.id == user.id).with_for_update())
            board = await session.scalar(select(Board).where(Board.id == 1).with_for_update())
            now = await session.scalar(select(func.clock_timestamp()))
            index = pixel.y * size + pixel.x
            if board.pixels[index] != pixel.color:
                if locked_user.next_pixel_at and locked_user.next_pixel_at > now:
                    app.state.metrics.rejected.labels("cooldown").inc()
                    wait_ms = millis(locked_user.next_pixel_at) - millis(now)
                    raise HTTPException(429, {"message": "Подождите перед следующим пикселем",
                        "next_pixel_at": millis(locked_user.next_pixel_at), "server_time": millis(now)},
                        headers={"Retry-After": str(max(1, (wait_ms + 999) // 1000))})
                pixels = bytearray(board.pixels)
                pixels[index] = pixel.color
                board.pixels = bytes(pixels)
                board.revision += 1
                locked_user.next_pixel_at = now + timedelta(seconds=settings.cooldown_seconds)
                changed = True
            result = {"changed": changed, "x": pixel.x, "y": pixel.y, "color": pixel.color,
                      "revision": board.revision, "next_pixel_at": millis(locked_user.next_pixel_at),
                      "server_time": millis(now)}
        if changed:
            app.state.metrics.pixels.inc()
            try:
                await app.state.redis.publish(CHANNEL, json.dumps({"type": "pixel.changed", **result}))
            except RedisError:
                # The commit succeeded; revision heartbeat will make clients fetch it.
                logger.warning("Pixel committed; broadcast deferred to revision sync")
        return result

    @app.post("/api/visits", dependencies=[Depends(check_origin)], status_code=202)
    async def visit(payload: VisitInput, request: Request):
        await rate_limit(request, "visits", 500, 60)
        async with app.state.db() as session, session.begin():
            inserted = await session.scalar(insert(PageView).values(id=payload.page_id)
                .on_conflict_do_nothing().returning(PageView.id))
            if inserted:
                hour = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
                await session.execute(insert(HourlyViews).values(hour=hour, count=1)
                    .on_conflict_do_update(index_elements=[HourlyViews.hour], set_={"count": HourlyViews.count + 1}))
        if inserted:
            app.state.metrics.views.inc()
        return {"counted": bool(inserted)}

    @app.get("/health/live")
    async def live():
        return {"status": "ok"}

    @app.get("/health/ready")
    async def ready():
        healthy = True
        for name in ("postgres", "redis"):
            try:
                if name == "postgres":
                    async with app.state.db() as session:
                        await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=3)
                else:
                    await asyncio.wait_for(app.state.redis.ping(), timeout=3)
                app.state.metrics.dependencies.labels(name).set(1)
            except (SQLAlchemyError, RedisError, TimeoutError, OSError):
                healthy = False
                app.state.metrics.dependencies.labels(name).set(0)
        return JSONResponse({"status": "ok" if healthy else "unavailable"}, status_code=200 if healthy else 503)

    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        return Response(generate_latest(app.state.metrics.registry), headers={"Content-Type": CONTENT_TYPE_LATEST})

    @app.websocket("/api/ws")
    async def ws(websocket: WebSocket):
        if websocket.headers.get("origin", "").rstrip("/") not in settings.origins:
            await websocket.close(code=1008)
            return
        await websocket.accept()
        queue = app.state.hub.connect()

        async def send():
            await websocket.send_json(await snapshot(app))
            while True:
                await websocket.send_json(await queue.get())

        async def receive():
            while True:
                message = await websocket.receive_text()
                if len(message) > 1024:
                    await websocket.close(code=1009)
                    return

        tasks = [asyncio.create_task(send()), asyncio.create_task(receive())]
        try:
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                with suppress(WebSocketDisconnect, RuntimeError):
                    task.result()
        finally:
            app.state.hub.disconnect(queue)
            await stop_tasks(tasks)

    return app


class Credentials(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)


class PixelInput(BaseModel):
    x: int = Field(strict=True)
    y: int = Field(strict=True)
    color: int = Field(strict=True)


class VisitInput(BaseModel):
    page_id: uuid.UUID


app = create_app()
