#!/bin/sh
set -eu

if ! command -v psql >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql-client curl jq ca-certificates >/dev/null
fi

export PGHOST="${PGHOST:-db}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${POSTGRES_DB:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
export SEEDS_DIR="${SEEDS_DIR:-/opt/ryvo/seeds}"
export AUTH_URL="${AUTH_URL:-http://kong:8000}"
export SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?}"

bash /opt/ryvo/migrate-idempotent.sh

if [ -f /opt/ryvo/bootstrap-users.sh ]; then
  bash /opt/ryvo/bootstrap-users.sh || echo "[ryvo-migrate] bootstrap deferred"
fi

echo "[ryvo-migrate] done"
