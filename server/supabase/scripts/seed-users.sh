#!/usr/bin/env bash
# Creates Ryvo sample users via Supabase Auth Admin API and assigns roles.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "${ROOT_DIR}/.env" ]]; then
  SUPABASE_PUBLIC_URL="$(grep -E '^SUPABASE_PUBLIC_URL=' "${ROOT_DIR}/.env" | cut -d= -f2-)"
  SERVICE_ROLE_KEY="$(grep -E '^SERVICE_ROLE_KEY=' "${ROOT_DIR}/.env" | cut -d= -f2-)"
fi

SUPABASE_URL="${SUPABASE_PUBLIC_URL:-http://localhost:8400}"
SERVICE_KEY="${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY required}"

create_user() {
  local email="$1"
  local password="$2"
  local role="$3"

  local resp
  resp=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"email_confirm\":true}")

  local user_id
  user_id=$(echo "$resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [[ -z "$user_id" ]]; then
    echo "User may already exist for ${email}; attempting lookup..."
    resp=$(curl -sS -G "${SUPABASE_URL}/auth/v1/admin/users" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      --data-urlencode "email=${email}")
    user_id=$(echo "$resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  fi

  if [[ -z "$user_id" ]]; then
    echo "Failed to resolve user id for ${email}: ${resp}"
    return 1
  fi

  docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
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
    docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.driver_profiles (user_id, kyc_status) VALUES ('${user_id}', 'approved')
ON CONFLICT (user_id) DO NOTHING;
SQL
  fi

  echo "Seeded ${email} as ${role} (${user_id})"
}

create_user "admin@ryvo-line.com" "Admin@123" "super_admin"
create_user "driver@ryvo-line.com" "Driver@123" "driver"
create_user "client@ryvo-line.com" "Client@123" "client"

echo "Done."
