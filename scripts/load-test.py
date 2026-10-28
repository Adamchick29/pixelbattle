"""Real HTTP/WebSocket load test. Use backend's dev environment to run it.

--provision creates/removes disposable accounts through the LOCAL Compose API container.
No public administration or test-only HTTP endpoint is added to the application.
"""

import argparse
import asyncio
import base64
import json
import math
import statistics
import subprocess
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx
import websockets

ROOT = Path(__file__).resolve().parents[1]
PROVISION = r'''
import asyncio, json, secrets, sys, uuid
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from redis.asyncio import Redis
from app.config import get_settings
from app.models import User
from app.security import DUMMY_HASH, token_key

async def main():
    data = json.load(sys.stdin)
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    db = async_sessionmaker(engine, expire_on_commit=False)
    redis = Redis.from_url(settings.redis_url)
    if data['operation'] == 'create':
        accounts = []
        async with db() as session, session.begin():
            for index in range(data['count']):
                user = User(id=uuid.uuid4(), email=f'load-{uuid.uuid4().hex}@example.com', password_hash=DUMMY_HASH)
                session.add(user)
                token = secrets.token_urlsafe(32)
                accounts.append({'id': str(user.id), 'token': token})
        for account in accounts:
            await redis.set(token_key(account['token']), account['id'], ex=600)
        print(json.dumps(accounts))
    else:
        ids = [uuid.UUID(account['id']) for account in data['accounts']]
        async with db() as session, session.begin():
            await session.execute(delete(User).where(User.id.in_(ids)))
        for account in data['accounts']:
            await redis.delete(token_key(account['token']))
        print('{}')
    await redis.aclose()
    await engine.dispose()
asyncio.run(main())
'''


def provision(payload):
    # Script and data go through stdin, never shell expansion or command arguments.
    wrapper = "import sys,io\nsource=" + repr(PROVISION) + "\nsys.stdin=io.StringIO(" + repr(json.dumps(payload)) + ")\nexec(source)\n"
    result = subprocess.run(["docker", "compose", "exec", "-T", "api", "python", "-"],
                            input=wrapper, text=True, capture_output=True, cwd=ROOT)
    if result.returncode:
        raise RuntimeError("Could not provision disposable load-test accounts: " + result.stderr[-500:])
    return json.loads(result.stdout)


async def exercise(origin, accounts, duration):
    connections = []
    tasks = []
    pending = {}
    delivery = []
    http_times = []
    failures = []
    accepted = 0
    ws_origin = origin.replace("http://", "ws://").replace("https://", "wss://")

    async def listen(socket, index, ready):
        async for raw in socket:
            event = json.loads(raw)
            if event["type"] == "board.snapshot":
                ready.set()
            if index == 0 and event["type"] == "pixel.changed":
                key = (event["x"], event["y"], event["color"])
                started = pending.pop(key, None)
                if started is not None:
                    delivery.append(time.perf_counter() - started)

    try:
        for index in range(len(accounts)):
            socket = await websockets.connect(ws_origin + "/api/ws", origin=origin, max_size=2**20)
            connections.append(socket)
            ready = asyncio.Event()
            tasks.append(asyncio.create_task(listen(socket, index, ready)))
            await asyncio.wait_for(ready.wait(), 10)
        async with httpx.AsyncClient(base_url=origin, timeout=15, limits=httpx.Limits(max_connections=100, max_keepalive_connections=100)) as client:
            initial = (await client.get("/api/board")).json()
            initial_pixels = base64.b64decode(initial["pixels"])
            started = time.perf_counter()

            async def participant(index, account):
                nonlocal accepted
                await asyncio.sleep(index * 5 / len(accounts))
                iteration = 0
                while time.perf_counter() - started < duration:
                    pixel = {"x": index, "y": 200 + iteration, "color": 14 if iteration % 2 == 0 else 24}
                    # Make repeated runs change a pixel, rather than submit a no-op.
                    old = initial_pixels[pixel["y"] * 256 + pixel["x"]]
                    if old == pixel["color"]:
                        pixel["color"] = 24 if old == 14 else 14
                    key = (pixel["x"], pixel["y"], pixel["color"])
                    sent = time.perf_counter()
                    pending[key] = sent
                    response = await client.post("/api/pixels", json=pixel,
                        headers={"Origin": origin, "Cookie": "pb_session=" + account["token"]})
                    http_times.append(time.perf_counter() - sent)
                    if response.status_code != 200 or not response.json().get("changed"):
                        failures.append(response.status_code)
                        pending.pop(key, None)
                        await asyncio.sleep(5.1)
                    else:
                        accepted += 1
                        result = response.json()
                        await asyncio.sleep((result["next_pixel_at"] - result["server_time"]) / 1000 + 0.02)
                    iteration += 1

            await asyncio.gather(*(participant(index, account) for index, account in enumerate(accounts)))
            await asyncio.sleep(0.3)
        p95 = sorted(delivery)[max(0, math.ceil(len(delivery) * 0.95) - 1)] if delivery else math.inf
        report = {"connections": len(connections), "duration_seconds": duration, "accepted": accepted,
                  "placements_per_second": round(accepted / duration, 2), "http_errors_or_noops": failures,
                  "received": len(delivery), "delivery_p95_ms": round(p95 * 1000, 2),
                  "http_median_ms": round(statistics.median(http_times) * 1000, 2) if http_times else None}
        print(json.dumps(report, indent=2))
        assert not failures, "Some placements failed or were no-ops"
        assert accepted >= len(accounts) * (duration // 5) - len(accounts) // 10, "Insufficient throughput"
        assert len(delivery) == accepted, "A committed pixel event was not delivered"
        assert p95 < 1, "p95 delivery exceeded 1 second"
    finally:
        for socket in connections:
            await socket.close()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="http://localhost:8787")
    parser.add_argument("--users", type=int, default=100)
    parser.add_argument("--duration", type=int, default=15)
    parser.add_argument("--provision", action="store_true", required=True)
    args = parser.parse_args()
    if urlsplit(args.origin).hostname not in ("localhost", "127.0.0.1"):
        parser.error("Automatic provisioning is restricted to local Compose development")
    if not (1 <= args.users <= 100 and 5 <= args.duration <= 120):
        parser.error("Use 1–100 users and 5–120 seconds")
    accounts = provision({"operation": "create", "count": args.users})
    try:
        asyncio.run(exercise(args.origin.rstrip("/"), accounts, args.duration))
    finally:
        provision({"operation": "delete", "accounts": accounts})
