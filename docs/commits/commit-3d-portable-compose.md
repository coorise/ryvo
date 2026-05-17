# Commit 3d — Portable Docker Compose (zero manual seeds)

## Goal

Any teammate clones the repo and gets the same alpha backend with:

```bash
bash scripts/ensure-env.sh   # first time: copies .env.example → .env
docker compose up -d
```

No manual `apply-seeds.sh`, `seed-users.sh`, or SQL in `psql`.

## How it works

1. **`ryvo-functions` entrypoint** (`volumes/functions/ryvo-gateway/entrypoint.sh`)
   - Installs `psql` / `curl` / `jq` once inside the Bun container
   - Runs **`migrate-idempotent.sh`** (checksum table `ryvo.schema_migrations`)
   - Runs **`bootstrap-users.sh`** once (demo users + driver KYC docs)
   - Starts the Bun gateway

2. **Idempotent migrations**
   - Each `scripts/seeds/00N_*.sql` file has a SHA-256 checksum stored in `ryvo.schema_migrations`
   - Unchanged files are **skipped**
   - Changed files are **re-applied** (SQL uses `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.)
   - Existing DBs seeded before this commit get **checksum backfill** without re-running SQL

3. **Postgres `@` in password**
   - `POSTGRES_PASSWORD_URI_ENCODED` in `server/supabase/.env` (auto-set by `ensure-env.sh`)
   - Used in `docker-compose.yml` DB URIs for PostgREST/Auth/Storage

4. **Committed template**
   - `server/supabase/.env.example` — copy to `.env` for first run

## E2E verification (run by agent)

```bash
bash scripts/e2e-ride-flow.sh          # PASS — full ride flow from host
docker compose --profile smoke run --rm ryvo-smoke   # optional in-network smoke
```

## Team checklist

| Step | Action |
|------|--------|
| 1 | `cp server/supabase/.env.example server/supabase/.env` (or `bash scripts/ensure-env.sh`) |
| 2 | Same for `kafka`, `redis`, `bunqueue` examples |
| 3 | `docker compose up -d` |
| 4 | Open http://localhost:8400 — API ready |
| 5 | Login: `client@ryvo-line.com` / `Client@123`, etc. |

## Stop / reset

```bash
docker compose down
# Full DB reset: docker compose down -v  (destroys Postgres volume)
```
