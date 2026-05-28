#!/usr/bin/env bash
# Apply Ryvo SQL seeds only when new or checksum changed (idempotent for teams).
set -euo pipefail

PGHOST="${PGHOST:-db}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${POSTGRES_DB:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"

SEEDS_DIR="${SEEDS_DIR:-/migrations/seeds}"

echo "[ryvo-migrate] Waiting for Postgres at ${PGHOST}:${PGPORT}..."
for _ in $(seq 1 90); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS ryvo;
CREATE TABLE IF NOT EXISTS ryvo.schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

# DB was seeded manually before ryvo.schema_migrations existed — record checksums without re-running.
migration_count="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT count(*) FROM ryvo.schema_migrations;" | tr -d '[:space:]')"
legacy_schema="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='trip_requests';" | tr -d '[:space:]')"

if [[ "${migration_count:-0}" == "0" && "${legacy_schema:-0}" != "0" ]]; then
  echo "[ryvo-migrate] Backfilling migration checksums for existing database..."
  for file in $(ls -1 "$SEEDS_DIR"/[0-9][0-9]*.sql 2>/dev/null | sort); do
    version="$(basename "$file")"
    checksum="$(sha256sum "$file" | awk '{print $1}')"
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO ryvo.schema_migrations (version, checksum, applied_at)
VALUES ('${version//\'/\'\'}', '$checksum', now())
ON CONFLICT (version) DO NOTHING;
SQL
  done
fi

applied=0
skipped=0

for file in $(ls -1 "$SEEDS_DIR"/[0-9][0-9]*.sql 2>/dev/null | sort); do
  version="$(basename "$file")"
  checksum="$(sha256sum "$file" | awk '{print $1}')"

  existing="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT checksum FROM ryvo.schema_migrations WHERE version = '${version//\'/\'\'}';" | tr -d '[:space:]')"

  if [[ "$existing" == "$checksum" ]]; then
    echo "[ryvo-migrate] skip  $version (unchanged)"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ -n "$existing" ]]; then
    echo "[ryvo-migrate] apply $version (schema changed)"
  else
    echo "[ryvo-migrate] apply $version (new)"
  fi

  if [[ "$version" == 045_postgis_catalog_privileges.sql ]]; then
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=0 -f "$file"
  else
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$file"
  fi

  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO ryvo.schema_migrations (version, checksum, applied_at)
VALUES ('${version//\'/\'\'}', '$checksum', now())
ON CONFLICT (version) DO UPDATE
  SET checksum = EXCLUDED.checksum, applied_at = now();
SQL
  applied=$((applied + 1))
done

# Some extension-owned tables (e.g. PostGIS `public.spatial_ref_sys`) are owned by `supabase_admin`,
# so `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` can fail when running seeds as `postgres`.
# If the role exists, try enabling RLS under `supabase_admin`. Ignore errors.
psql -h "$PGHOST" -p "$PGPORT" -U "supabase_admin" -d "$PGDATABASE" -v ON_ERROR_STOP=0 <<'SQL' >/dev/null 2>&1 || true
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
SQL

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "NOTIFY pgrst, 'reload schema';" 2>/dev/null || true

echo "[ryvo-migrate] Done. applied=$applied skipped=$skipped"
