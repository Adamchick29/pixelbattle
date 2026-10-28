"""Create disposable test data, restart local services and verify durable state/session."""

import base64
import http.cookiejar
import json
import os
import secrets
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

origin = os.environ.get("APP_ORIGIN", "http://localhost:8787").rstrip("/")
opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))


def request(path, data=None):
    payload = json.dumps(data).encode() if data is not None else None
    req = Request(origin + path, data=payload, headers={"Origin": origin, "Content-Type": "application/json"})
    with opener.open(req, timeout=10) as response:
        return json.load(response)


identity = request("/api/auth/register", {"email": f"persistence-{secrets.token_hex(6)}@example.com", "password": secrets.token_urlsafe(24)})
board = request("/api/board")
old_color = base64.b64decode(board["pixels"])[0]
request("/api/pixels", {"x": 0, "y": 0, "color": 14 if old_color != 14 else 24})
before_board = request("/api/board")
before_user = request("/api/auth/me")
subprocess.run(["docker", "compose", "restart", "postgres", "redis"], check=True)
subprocess.run(["docker", "compose", "up", "-d", "--wait", "--wait-timeout", "120", "postgres", "redis"], check=True)
subprocess.run(["docker", "compose", "restart", "api", "web"], check=True)
subprocess.run(["docker", "compose", "up", "-d", "--wait", "--wait-timeout", "120"], check=True)
for attempt in range(30):
    try:
        after_board = request("/api/board")
        after_user = request("/api/auth/me")
        break
    except (HTTPError, URLError):
        if attempt == 29:
            raise
        time.sleep(1)
assert after_board["pixels"] == before_board["pixels"]
assert after_board["revision"] == before_board["revision"]
assert after_user["user"] == before_user["user"]
assert after_user["user"]["id"] == identity["user"]["id"]
print("Board, account, cooldown and session survived PostgreSQL/Redis/API restart.")
