#!/usr/bin/env bash
# Create server/*/.env from .env.example when missing (never overwrites existing).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local dir="$1"
  if [[ ! -f "${dir}/.env" ]]; then
    if [[ -f "${dir}/.env.example" ]]; then
      cp "${dir}/.env.example" "${dir}/.env"
      echo "Created ${dir}/.env from .env.example"
    else
      echo "WARN: No .env.example in ${dir}"
    fi
  fi
}

copy_if_missing "${ROOT}/server/supabase"
copy_if_missing "${ROOT}/server/kafka"
copy_if_missing "${ROOT}/server/redis"
copy_if_missing "${ROOT}/server/bunqueue"

# PostgREST/database URLs break when POSTGRES_PASSWORD contains '@' — set encoded form.
SUPABASE_ENV="${ROOT}/server/supabase/.env"
if [[ -f "$SUPABASE_ENV" ]] && grep -q '^POSTGRES_PASSWORD=' "$SUPABASE_ENV"; then
  pw="$(grep '^POSTGRES_PASSWORD=' "$SUPABASE_ENV" | cut -d= -f2- | sed "s/^['\"]//;s/['\"]$//")"
  enc="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$pw")"
  if grep -q '^POSTGRES_PASSWORD_URI_ENCODED=' "$SUPABASE_ENV"; then
    sed -i "s|^POSTGRES_PASSWORD_URI_ENCODED=.*|POSTGRES_PASSWORD_URI_ENCODED=${enc}|" "$SUPABASE_ENV"
  else
    echo "POSTGRES_PASSWORD_URI_ENCODED=${enc}" >> "$SUPABASE_ENV"
  fi
fi
