#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env ]]; then echo '.env already exists; refusing to overwrite secrets.' >&2; exit 1; fi
umask 077
database_password=$(openssl rand -hex 24)
redis_password=$(openssl rand -hex 24)
monitor_password=$(openssl rand -hex 24)
monitor_hash=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$monitor_password")
cat > .env <<EOF
APP_BIND=127.0.0.1
APP_PORT=8787
APP_ORIGIN=http://localhost:8787
SESSION_COOKIE_SECURE=false
POSTGRES_PASSWORD=$database_password
REDIS_PASSWORD=$redis_password
MONITORING_USER=monitor
MONITORING_PASSWORD_HASH='$monitor_hash'
IMAGE_PREFIX=pixel-battle
IMAGE_TAG=local
EOF
mkdir -p .local
printf '%s' "$monitor_password" > .local/monitoring-password.txt
printf 'Created .env. Run: docker compose up --build -d --wait\nVMUI user: monitor | password: %s\n' "$monitor_password"
