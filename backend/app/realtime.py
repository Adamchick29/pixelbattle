import asyncio
import json
import logging

from redis.exceptions import RedisError
from sqlalchemy import select

from app.models import Board

logger = logging.getLogger(__name__)
CHANNEL = "pixel-battle:events"


class Hub:
    def __init__(self, metrics) -> None:
        self.queues: set[asyncio.Queue] = set()
        self.metrics = metrics

    def connect(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=128)
        self.queues.add(queue)
        self.metrics.connections.set(len(self.queues))
        return queue

    def disconnect(self, queue: asyncio.Queue) -> None:
        self.queues.discard(queue)
        self.metrics.connections.set(len(self.queues))

    def broadcast(self, event: dict) -> None:
        for queue in tuple(self.queues):
            if queue.full():
                while not queue.empty():
                    queue.get_nowait()
                queue.put_nowait({"type": "board.resync"})
            else:
                queue.put_nowait(event)


async def redis_listener(app) -> None:
    while True:
        try:
            async with app.state.redis.pubsub() as pubsub:
                await pubsub.subscribe(CHANNEL)
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message["type"] == "message":
                        app.state.hub.broadcast(json.loads(message["data"]))
        except (RedisError, OSError):
            logger.warning("Realtime subscription lost; reconnecting")
            await asyncio.sleep(1)


async def revision_heartbeat(app) -> None:
    # A durable revision check heals even a lost final Pub/Sub event.
    while True:
        await asyncio.sleep(3)
        try:
            async with app.state.db() as session:
                revision = await session.scalar(select(Board.revision).where(Board.id == 1))
            app.state.metrics.revision.set(revision or 0)
            app.state.hub.broadcast({"type": "board.sync", "revision": revision})
        except Exception:
            logger.exception("Board heartbeat failed")


async def stop_tasks(tasks: list[asyncio.Task]) -> None:
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
