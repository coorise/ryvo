# Checkpoint 1 — Scaffolding & Harmonization
**Date:** 2026-05-17
**Phase:** 1
**Status:** COMPLETE

## What Was Done
- Added `shared/lib/bun/` with `createBunServer()`, middleware stubs (auth, rate-limit, request-id, logger).
- Scaffolded **17** edge function services under `server/supabase/volumes/functions/` with canonical `src/api|configs|core|lib|services|types` layout.
- Linked `_shared/lib/bun` → repo `shared/lib/bun` for DRY imports across services.
- Verified Bun health endpoint: `bun run index.ts` in `auth-hooks` returns `GET /v1/health` 200.
- Restructured Next.js app to `client/web/ryvo/apps/web/src/` (configs, guards, hooks, stores, services, types, route placeholders).
- Added Flutter configs (`lib/configs/env.dart`, `const.dart`) and landing scaffold.
- Fixed infrastructure compose files: Kafka, Redis, Bunqueue on `ryvo-net`; MinIO bind path `./home/minio/data`.
- Added root `scripts/dev-up.sh` / `dev-down.sh` and orchestrator `docker-compose.yaml` (Kafka, Redis, Bunqueue).
- Added `docs/devs/`, `docs/users/`, analytics Prometheus/Grafana stub, root `README.md`, expanded `.gitignore`.

## File Tree Delta
- `shared/lib/bun/**`
- `server/supabase/volumes/functions/{auth-hooks,location-ingest,...}/**`
- `server/supabase/scripts/seeds/001-008*.sql`, `apply-seeds.sh`, `seed-users.sh`
- `client/web/ryvo/apps/web/src/**`
- `client/mobile/flutter/ryvo/lib/configs/**`, `lib/app/page.dart`
- `scripts/dev-up.sh`, `scripts/dev-down.sh`
- `docker-compose.yaml`, `README.md`

## Environment State
- Docker images pre-pulled: supabase/*, apache/kafka, redis, bunqueue, minio (chainguard).
- `KONG_HTTP_PORT=8400`, `GLOBAL_S3_BUCKET=ryvo-storage` in `server/supabase/.env`.
- MinIO data dir requires writable permissions: `chmod -R 777 server/supabase/home/minio/data` on first run.

## What Comes Next
- Phase 2 complete: see `commit-2-supabase-config.md`.
- Phase 3: implement edge function business logic (location-ingest, matching-engine, etc.).

## Known Issues / Blockers
- Edge runtime uses Deno; Bun services run standalone until Phase 3 wires custom runtime or HTTP sidecars.
- `seed-users.sh` must parse `.env` with grep (spaces in `STUDIO_DEFAULT_ORGANIZATION` break `source`).
- Web turborepo still uses `apps/web` layout; canonical `src/` is in place for Phase 4 portal work.
