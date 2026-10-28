#!/usr/bin/env bash
# Runs on a GitHub-hosted Linux runner. Secret values are never shell commands.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
required=(SSH_HOST SSH_USER SSH_PRIVATE_KEY SSH_KNOWN_HOSTS APP_ORIGIN POSTGRES_PASSWORD REDIS_PASSWORD MONITORING_PASSWORD GHCR_USER GHCR_TOKEN IMAGE_PREFIX IMAGE_TAG)
for name in "${required[@]}"; do
  [[ -n ${!name:-} ]] || { printf 'Missing configuration: %s\n' "$name" >&2; exit 1; }
done
[[ $SSH_HOST =~ ^[a-zA-Z0-9._:-]+$ && $SSH_USER =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || { echo 'Invalid SSH target' >&2; exit 1; }
[[ ${SSH_PORT:-22} =~ ^[0-9]+$ ]] || exit 1
[[ $IMAGE_TAG =~ ^[0-9a-f]{40}$ ]] || { echo 'IMAGE_TAG must be a full commit SHA' >&2; exit 1; }
task_tmp=$(mktemp -d)
trap 'rm -rf -- "$task_tmp"' EXIT
printf '%s\n' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$task_tmp/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" | tr -d '\r' > "$task_tmp/known_hosts"
chmod 600 "$task_tmp/key" "$task_tmp/known_hosts"
python3 - "$task_tmp/deploy-input.json" <<'PY'
import json, os, pathlib, sys
names = ["APP_ORIGIN", "POSTGRES_PASSWORD", "REDIS_PASSWORD", "MONITORING_PASSWORD", "GHCR_USER", "GHCR_TOKEN", "IMAGE_PREFIX", "IMAGE_TAG"]
values = {name: os.environ[name] for name in names}
values["MONITORING_USER"] = os.environ.get("MONITORING_USER") or "monitor"
pathlib.Path(sys.argv[1]).write_text(json.dumps(values), encoding="utf-8")
PY
# Old releases supply their Compose/infra files; authentication scripts stay current.
tar -czf "$task_tmp/release.tar.gz" scripts -C "${RELEASE_CONFIG_DIR:-.}" compose.yaml infra -C "$task_tmp" deploy-input.json
ssh_options=(-T -p "${SSH_PORT:-22}" -i "$task_tmp/key" -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=20 -o ServerAliveCountMax=6 -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$task_tmp/known_hosts")
ssh "${ssh_options[@]}" "$SSH_USER@$SSH_HOST" 'set -eu
umask 077
taskdir=$(mktemp -d /tmp/pixel-battle.XXXXXX)
trap '\''rm -rf -- "$taskdir"'\'' EXIT
tar -xzf - -C "$taskdir"
if [ "$(id -u)" -eq 0 ]; then
  bash "$taskdir/scripts/bootstrap.sh" "$taskdir"
else
  sudo -n bash "$taskdir/scripts/bootstrap.sh" "$taskdir"
fi' < "$task_tmp/release.tar.gz"
curl --fail --silent --show-error --retry 5 --retry-delay 3 --max-time 15 "$APP_ORIGIN/health/ready" >/dev/null
printf 'Deployed %s\n' "$IMAGE_TAG"
