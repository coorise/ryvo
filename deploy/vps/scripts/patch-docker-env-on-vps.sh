#!/usr/bin/env bash
# Write Docker Hub credentials into deploy/vps/compose/.env.dev|prod (run on VPS or via SSH).
# Usage: DOCKER_USERNAME=coorise DOCKER_TOKEN=dckr_pat_... bash deploy/vps/scripts/patch-docker-env-on-vps.sh dev
set -euo pipefail

ENV_NAME="${1:-dev}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_OUT="deploy/vps/compose/.env.${ENV_NAME}"
[[ -f "$COMPOSE_OUT" ]] || { echo "Missing $COMPOSE_OUT — run apply-env.sh first"; exit 1; }

patch() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$COMPOSE_OUT"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$COMPOSE_OUT"
  else
    echo "${key}=${val}" >>"$COMPOSE_OUT"
  fi
}

: "${DOCKER_USERNAME:?DOCKER_USERNAME required}"
: "${DOCKER_TOKEN:?DOCKER_TOKEN required}"

patch DOCKER_IMAGE_PREFIX "${DOCKER_IMAGE_PREFIX:-coorise}"
patch DOCKER_USERNAME "$DOCKER_USERNAME"
patch DOCKER_TOKEN "$DOCKER_TOKEN"

echo "==> updated $COMPOSE_OUT (Docker Hub login for deploy pulls)"
