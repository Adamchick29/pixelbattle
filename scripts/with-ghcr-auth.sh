#!/usr/bin/env bash
# Keep the job token only for the duration of the supplied deployment command.
set -euo pipefail
umask 077
payload=${1:?Deployment payload required}
shift
[[ $# -gt 0 ]] || { echo 'Deployment command required.' >&2; exit 1; }
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
python3 - "$payload" <<'PY' | docker login ghcr.io --username "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["GHCR_USER"])' "$payload")" --password-stdin
import json, sys
sys.stdout.write(json.load(open(sys.argv[1]))["GHCR_TOKEN"])
PY
"$@"
