#!/usr/bin/env bash
# Host helper — prefer: docker compose up -d (runs ryvo-migrate automatically).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export POSTGRES_DB="${POSTGRES_DB:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

if [[ -z "$POSTGRES_PASSWORD" && -f "${SCRIPT_DIR}/../.env" ]]; then
  POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' "${SCRIPT_DIR}/../.env" | cut -d= -f2- | tr -d '"')"
  export POSTGRES_PASSWORD
fi

export SEEDS_DIR="${SCRIPT_DIR}/seeds"
export PGUSER="${POSTGRES_USER:-postgres}"

if docker ps --format '{{.Names}}' | grep -q '^supabase-db$'; then
  export PGHOST=db
  docker compose -f "${SCRIPT_DIR}/../docker-compose.yml" -f "${SCRIPT_DIR}/../docker-compose.ryvo.yml" \
    run --rm -e POSTGRES_PASSWORD -e POSTGRES_DB ryvo-migrate
else
  bash "${SCRIPT_DIR}/migrate-idempotent.sh"
fi
