#!/usr/bin/env bash
# Copy Supabase public keys from server/supabase/.env → client/web/ryvo/.env.local
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
WEB="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/server/supabase/.env"
DST="${WEB}/.env.local"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — run: cp server/supabase/.env.example server/supabase/.env"
  exit 1
fi

ANON_KEY="$(grep '^ANON_KEY=' "$SRC" | cut -d= -f2- | tr -d '"')"
URL="$(grep '^SUPABASE_PUBLIC_URL=' "$SRC" | cut -d= -f2- | tr -d '"')"
URL="${URL:-http://localhost:8400}"

cat >"$DST" <<EOF
NEXT_PUBLIC_SUPABASE_URL=${URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_FUNCTIONS_URL=${URL}/functions/v1
NEXT_PUBLIC_APP_ENV=development
EOF

echo "Wrote $DST"
echo "Restart dev: cd client/web/ryvo && bun run dev"
