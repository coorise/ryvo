# Checkpoint 2 — Supabase BaaS Configuration
**Date:** 2026-05-17
**Phase:** 2
**Status:** COMPLETE

## What Was Done
- Started self-hosted Supabase with S3 overlay: `docker compose -f docker-compose.yml -f docker-compose.s3.yml up -d`.
- API gateway exposed on **http://localhost:8400** (`KONG_HTTP_PORT=8400`).
- Applied SQL seeds `001`–`008`: PostGIS + pgcrypto, full Ryvo schema, RLS policies, indexes, geospatial functions, roles/permissions, Realtime publication.
- MinIO bucket `ryvo-storage` created via compose init container.
- Seeded test users via Auth Admin API:
  - `admin@ryvo-line.com` / `Admin@123` (super_admin)
  - `driver@ryvo-line.com` / `Driver@123` (driver + approved KYC profile)
  - `client@ryvo-line.com` / `Client@123` (client + rider profile)
- Verified PostGIS: `SELECT PostGIS_version()` → 3.3.
- Verified edge functions router: `GET http://localhost:8400/functions/v1/hello` → `"Hello from Edge Functions!"`.
- Started supporting stack: `ryvo_kafka_broker`, `ryvo_redis`, `ryvo_bunqueue` on `ryvo-net`.

## File Tree Delta
- `server/supabase/scripts/seeds/*.sql`
- `server/supabase/scripts/apply-seeds.sh`, `seed-users.sh`
- `server/supabase/docker-compose.s3.yml` (MinIO volume path fix)

## Environment State
- Supabase Studio: internal via compose (check `STUDIO` ports in compose if exposing locally).
- Postgres container: `supabase-db`, password from `.env` (`POSTGRES_PASSWORD`).
- Re-apply schema after DB reset: `bash server/supabase/scripts/apply-seeds.sh`
- Re-create users: `bash server/supabase/scripts/seed-users.sh`

## What Comes Next
- **Phase 3a:** Implement `auth-hooks` and `location-ingest` with Supabase client, Kafka publish, Realtime channels.
- Wire Redis rate limiting in shared Bun middleware.
- Add Stripe/Google Maps secrets to edge function env (never commit; use `.env` locally).

## Known Issues / Blockers
- SMTP uses placeholder host in `.env`; email confirm flows need real SMTP for production.
- `007_sample_users.sql` replaced by `007_sample_users.md` + `seed-users.sh` (Auth API required for password hashing).
- JWT keys still demo defaults — run `server/supabase/utils/generate-keys.sh` before production.
