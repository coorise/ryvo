#!/usr/bin/env bash
# Fresh VPS (or local) env bootstrap — single entry before first deploy.
# Usage: bash deploy/vps/scripts/bootstrap.sh dev|prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod"
  exit 1
fi

echo "==> bootstrap ($ENV_NAME)"
echo "    Secrets source of truth: server/supabase/.env"
echo ""

bash scripts/ensure-env.sh

SUPABASE_ENV="server/supabase/.env"
if [[ ! -f "$SUPABASE_ENV" ]]; then
  echo "ERROR: Missing $SUPABASE_ENV — copy from server/supabase/.env.example and edit."
  exit 1
fi

missing=0
for key in ANON_KEY JWT_SECRET POSTGRES_PASSWORD; do
  val="$(grep -E "^${key}=" "$SUPABASE_ENV" 2>/dev/null | cut -d= -f2- | tr -d "'\"" || true)"
  if [[ -z "$val" || "$val" == REPLACE_* ]]; then
    echo "  MISSING  $key in $SUPABASE_ENV"
    missing=1
  fi
done

maps="$(grep -E '^GOOGLE_MAPS_API_KEY=' "$SUPABASE_ENV" 2>/dev/null | cut -d= -f2- | tr -d "'\"" || true)"
if [[ -z "$maps" || "$maps" == REPLACE_* ]]; then
  echo "  WARN     GOOGLE_MAPS_API_KEY empty — admin live map will not work until set"
fi

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "Edit server/supabase/.env then re-run: bash deploy/vps/scripts/bootstrap.sh $ENV_NAME"
  exit 1
fi

bash deploy/vps/scripts/apply-env.sh "$ENV_NAME"

echo ""
echo "==> bootstrap ($ENV_NAME) done"
echo "    Generated:"
echo "      deploy/vps/compose/.env.$ENV_NAME"
echo "      client/web/*/.env.local"
echo "      client/web/*/.env.production"
echo ""
echo "Next:"
echo "  bash deploy/vps/scripts/deploy-bluegreen.sh $ENV_NAME sha-<gitsha>"
echo "  # or first-time: bash deploy/vps/scripts/setup-${ENV_NAME}.sh"
