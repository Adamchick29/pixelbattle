#!/usr/bin/env bash
# Idempotent preparation of a clean Ubuntu VPS; invoked over SSH by Actions.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Bootstrap requires root or passwordless sudo.' >&2; exit 1; }
bundle=$(realpath "${1:?Path to deployment bundle required}")
[[ -f "$bundle/deploy-input.json" && -f "$bundle/compose.yaml" ]] || exit 1
# shellcheck source=/dev/null
source /etc/os-release
[[ $ID == ubuntu && ( $VERSION_ID == 24.04 || $VERSION_ID == 26.04 ) ]] || { echo 'Supported OS: Ubuntu 24.04/26.04 LTS.' >&2; exit 1; }
[[ $(dpkg --print-architecture) == amd64 ]] || { echo 'This release targets amd64.' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt_options=(-o DPkg::Lock::Timeout=120 -o Acquire::Retries=3)
needs_packages=false
for utility in python3 curl openssl flock; do command -v "$utility" >/dev/null || needs_packages=true; done
if $needs_packages; then
  apt-get "${apt_options[@]}" update -qq
  apt-get "${apt_options[@]}" install -y -qq ca-certificates curl python3 openssl util-linux
fi
install -d -m 0700 /opt/pixel-battle
exec 9>/opt/pixel-battle/deploy.lock
flock -n 9 || { echo 'Another deployment is already running.' >&2; exit 1; }

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL --retry 3 https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF
  apt-get "${apt_options[@]}" update -qq
  apt-get "${apt_options[@]}" install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
docker info >/dev/null
# Python validates and quotes .env values, and never prints secret payloads.
python3 "$bundle/scripts/prepare-server.py" "$bundle/deploy-input.json" /opt/pixel-battle
# Remove credentials left by the previous deployment scheme.
rm -f -- /opt/pixel-battle/.docker/config.json
if [[ -d /opt/pixel-battle/.docker ]]; then rmdir /opt/pixel-battle/.docker 2>/dev/null || true; fi
bash "$bundle/scripts/with-ghcr-auth.sh" "$bundle/deploy-input.json" \
  bash "$bundle/scripts/deploy-server.sh" "$bundle" /opt/pixel-battle
