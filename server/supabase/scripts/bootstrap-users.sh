#!/usr/bin/env bash
# Create default Ryvo alpha users (idempotent). Runs inside Docker on compose up.
set -euo pipefail

PGHOST="${PGHOST:-db}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${POSTGRES_DB:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"

AUTH_URL="${AUTH_URL:-http://kong:8000}"
SERVICE_KEY="${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY required}"

create_user() {
  local email="$1" password="$2" role="$3"

  local resp user_id
  resp="$(curl -sS -X POST "${AUTH_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"email_confirm\":true}")"

  user_id="$(echo "$resp" | jq -r '.id // empty' 2>/dev/null || true)"
  if [[ -z "$user_id" ]]; then
    resp="$(curl -sS -G "${AUTH_URL}/auth/v1/admin/users" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      --data-urlencode "email=${email}")"
    user_id="$(echo "$resp" | jq -r '.users[0].id // .id // empty' 2>/dev/null || true)"
  fi

  if [[ -z "$user_id" ]]; then
    echo "[ryvo-bootstrap] WARN: could not create/find user ${email}"
    return 0
  fi

  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.user_profiles (user_id, tos_accepted_at, gdpr_consent_at)
VALUES ('${user_id}', now(), now())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id)
SELECT '${user_id}', r.id FROM public.roles r WHERE r.name = '${role}'
ON CONFLICT DO NOTHING;

INSERT INTO public.rider_profiles (user_id) VALUES ('${user_id}')
ON CONFLICT (user_id) DO NOTHING;
SQL

  if [[ "$role" == "driver" ]]; then
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.driver_profiles (user_id, kyc_status) VALUES ('${user_id}', 'pending')
ON CONFLICT (user_id) DO NOTHING;
SQL
  fi

  echo "[ryvo-bootstrap] user ${email} (${role}) id=${user_id}"
}

echo "[ryvo-bootstrap] Waiting for Auth at ${AUTH_URL}..."
for _ in $(seq 1 90); do
  if curl -sf "${AUTH_URL}/auth/v1/health" >/dev/null 2>&1 || \
     curl -sf "${AUTH_URL}/rest/v1/" -H "apikey: ${SERVICE_KEY}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

existing="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT count(*) FROM auth.users WHERE email = 'client@ryvo-line.com';" | tr -d '[:space:]')"
if [[ "${existing:-0}" != "0" ]]; then
  echo "[ryvo-bootstrap] demo users already present (skip)"
  exit 0
fi

create_user "admin@ryvo-line.com" "Admin@123" "super_admin"
create_user "driver@ryvo-line.com" "Driver@123" "driver"
create_user "client@ryvo-line.com" "Client@123" "client"

echo "[ryvo-bootstrap] Done."
