#!/bin/sh
set -eu

# Bun image is Debian-based; install psql/curl/jq once for migrate + bootstrap.
if ! command -v psql >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql-client curl jq ca-certificates >/dev/null
fi

export PGHOST="${PGHOST:-db}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${POSTGRES_DB:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
export SEEDS_DIR="${SEEDS_DIR:-/opt/ryvo/seeds}"

if [ -f /opt/ryvo/migrate-idempotent.sh ]; then
  echo "[ryvo] Running idempotent migrations..."
  bash /opt/ryvo/migrate-idempotent.sh
fi

if [ -f /opt/ryvo/bootstrap-users.sh ]; then
  echo "[ryvo] Ensuring demo users..."
  export AUTH_URL="${AUTH_URL:-http://kong:8000}"
  export SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?}"
  bash /opt/ryvo/bootstrap-users.sh || echo "[ryvo] bootstrap deferred"
fi

if [ -f /opt/ryvo/migrate-idempotent.sh ]; then
  echo "[ryvo] Draining email outbox..."
  bun -e "
    import { processEmailOutbox } from '/home/deno/functions/_shared/lib/email.ts';
    const r = await processEmailOutbox(50);
    console.log('[ryvo] email outbox', r);
  " 2>/dev/null || true
fi

cd /home/deno/functions
bun install --cwd /home/deno/functions
exec bun run /home/deno/functions/ryvo-gateway/index.ts
