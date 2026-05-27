#!/usr/bin/env bash
# Ryvo-Line — single entrypoint to start the full stack.
# Usage:
#   ./scripts/ryvo-up.sh              # local
#   ./scripts/ryvo-up.sh dev          # VPS dev
#   ./scripts/ryvo-up.sh prod         # VPS prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV="${1:-local}"

case "$ENV" in
  local)
    bash scripts/ensure-env.sh
    exec docker compose up -d --build "${@:2}"
    ;;
  dev)
    ENV_FILE="${RYVO_ENV_FILE:-deploy/compose/.env.dev}"
    if [[ ! -f "$ENV_FILE" ]]; then
      echo "Missing $ENV_FILE — run: bash deploy/scripts/apply-env.sh dev"
      exit 1
    fi
    exec docker compose -f docker-compose.dev.yaml --env-file "$ENV_FILE" up -d --build "${@:2}"
    ;;
  prod)
    ENV_FILE="${RYVO_ENV_FILE:-deploy/compose/.env.prod}"
    if [[ ! -f "$ENV_FILE" ]]; then
      echo "Missing $ENV_FILE — run: bash deploy/scripts/apply-env.sh prod"
      exit 1
    fi
    exec docker compose -f docker-compose.prod.yaml --env-file "$ENV_FILE" up -d --build "${@:2}"
    ;;
  *)
    echo "Usage: $0 [local|dev|prod] [extra docker compose args...]"
    exit 1
    ;;
esac
