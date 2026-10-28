#!/usr/bin/env bash
set -euo pipefail
bundle=${1:?Bundle required}
root=${2:?Deployment root required}
tag=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["IMAGE_TAG"])' "$bundle/deploy-input.json")
[[ $tag =~ ^[0-9a-f]{40}$ && $root == /opt/pixel-battle ]] || exit 1
release="$root/releases/$tag"
install -d -m 0700 "$root/releases" "$release"
cp -a "$bundle/compose.yaml" "$bundle/infra" "$bundle/scripts" "$release/"
previous=$(readlink -f "$root/current" || true)
if [[ -f "$root/.env" ]]; then cp -p "$root/.env" "$root/.env.previous"; fi
compose=(docker compose --project-name pixel-battle --env-file "$root/.env.next" -f "$release/compose.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" pull

rollback() {
  code=$?
  trap - ERR
  echo 'Deployment failed; restoring the last healthy application release.' >&2
  if [[ $previous == "$root/releases/"* && -f "$root/.env.previous" && -f "$previous/compose.yaml" ]]; then
    cp -p "$root/.env.previous" "$root/.env"
    old_compose=(docker compose --project-name pixel-battle --env-file "$root/.env" -f "$previous/compose.yaml")
    # The old Alembic image may not know the new database revision. Do not run it on rollback.
    if "${old_compose[@]}" up -d --wait --wait-timeout 120 --no-deps api web &&
       "${old_compose[@]}" up -d --wait --wait-timeout 120 --no-deps proxy; then
      echo 'Previous application release restored; database migrations were not reversed.' >&2
    else
      echo 'Rollback requires attention: previous application services did not become healthy.' >&2
    fi
  else
    echo 'No previous release exists. Inspect the first-deployment failure.' >&2
  fi
  exit "$code"
}
trap rollback ERR
"${compose[@]}" up -d --wait --wait-timeout 120 postgres redis
"${compose[@]}" run --rm --no-deps migrate
"${compose[@]}" up -d --wait --wait-timeout 180 --remove-orphans
python3 "$release/scripts/check-deployment.py" --payload "$bundle/deploy-input.json" --local
mv -f "$root/.env.next" "$root/.env"
ln -sfn "$release" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
trap - ERR
printf 'Healthy release: %s\n' "$tag"
