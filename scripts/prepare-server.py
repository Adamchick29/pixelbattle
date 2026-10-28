"""Validate deployment input and write a candidate environment without exposing secrets."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit


def prepare(payload: dict, root: Path) -> None:
    for name in ("POSTGRES_PASSWORD", "REDIS_PASSWORD"):
        if not re.fullmatch(r"[A-Za-z0-9_-]{24,128}", payload.get(name, "")):
            raise ValueError(f"{name}: use 24–128 URL-safe characters (for example openssl rand -hex 24)")
    if not re.fullmatch(r"[0-9a-f]{40}", payload.get("IMAGE_TAG", "")):
        raise ValueError("IMAGE_TAG must be a full lowercase commit SHA")
    if not re.fullmatch(r"ghcr\.io/[a-z0-9_.-]+/[a-z0-9_./-]+", payload.get("IMAGE_PREFIX", "")):
        raise ValueError("IMAGE_PREFIX must be a lowercase GHCR repository path")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", payload.get("MONITORING_USER", "")):
        raise ValueError("Invalid monitoring username")
    password = payload.get("MONITORING_PASSWORD", "")
    if len(password) < 12 or len(password) > 128 or any(ord(char) < 32 for char in password):
        raise ValueError("Monitoring password must contain 12–128 printable characters")
    if not re.fullmatch(r"http://(?:\[[0-9a-fA-F:]+\]|[A-Za-z0-9][A-Za-z0-9.-]*)(?::[0-9]{1,5})?/?", payload["APP_ORIGIN"]):
        raise ValueError("APP_ORIGIN must be a plain HTTP origin")
    url = urlsplit(payload["APP_ORIGIN"])
    if url.scheme != "http" or not url.hostname or url.username or url.password or url.path not in ("", "/") or url.query or url.fragment:
        raise ValueError("APP_ORIGIN must be an HTTP origin, e.g. http://203.0.113.10")
    port = url.port or 80
    if not 1 <= port <= 65535:
        raise ValueError("Invalid HTTP port")
    previous = root / ".env"
    if not previous.exists():
        previous = root / ".env.next"
    if previous.exists():
        old = dict(line.split("=", 1) for line in previous.read_text().splitlines() if "=" in line and not line.startswith("#"))
        for name in ("POSTGRES_PASSWORD", "REDIS_PASSWORD"):
            if old.get(name) != payload[name]:
                raise ValueError(f"{name} changed: credential rotation requires a separate migration")
    result = subprocess.run(["docker", "run", "--rm", "caddy:2-alpine", "caddy", "hash-password", "--plaintext", password], capture_output=True, text=True)
    hashed = result.stdout.strip()
    if result.returncode or not re.fullmatch(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}", hashed):
        raise RuntimeError("Could not generate the monitoring password hash")
    values = {
        "APP_PORT": str(port), "APP_ORIGIN": payload["APP_ORIGIN"].rstrip("/"),
        "SESSION_COOKIE_SECURE": "false", "POSTGRES_PASSWORD": payload["POSTGRES_PASSWORD"],
        "REDIS_PASSWORD": payload["REDIS_PASSWORD"], "MONITORING_USER": payload["MONITORING_USER"],
        "MONITORING_PASSWORD_HASH": f"'{hashed}'", "IMAGE_PREFIX": payload["IMAGE_PREFIX"],
        "IMAGE_TAG": payload["IMAGE_TAG"],
    }
    candidate = root / ".env.next"
    temporary = root / ".env.next.tmp"
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        stream.write("".join(f"{key}={value}\n" for key, value in values.items()))
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, candidate)


if __name__ == "__main__":
    try:
        prepare(json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2]))
    except (ValueError, RuntimeError, KeyError) as error:
        raise SystemExit(str(error)) from None
