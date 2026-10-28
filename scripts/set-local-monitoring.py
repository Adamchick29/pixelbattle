"""Set a known CI-only monitoring password without exposing it in logs."""

import os
import subprocess
from pathlib import Path

result = subprocess.run(
    ["docker", "run", "--rm", "caddy:2-alpine", "caddy", "hash-password", "--plaintext", os.environ["MONITORING_PASSWORD"]],
    capture_output=True, text=True,
)
if result.returncode:
    raise SystemExit("Could not hash monitoring password")
path = Path(".env")
lines = path.read_text().splitlines()
lines = [f"MONITORING_PASSWORD_HASH='{result.stdout.strip()}'" if line.startswith("MONITORING_PASSWORD_HASH=") else line for line in lines]
path.write_text("\n".join(lines) + "\n")
