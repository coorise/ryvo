# Checkpoint 2b — Supabase in root docker-compose.yaml
**Date:** 2026-05-17
**Phase:** 2
**Status:** COMPLETE

## What Was Done
- Added Supabase + MinIO S3 to root `docker-compose.yaml` via Compose `include` with `project_directory` and `env_file` pointing at `server/supabase/`.
- Single command from repo root: `docker compose up -d` starts Supabase, Kafka, Redis, Bunqueue.
- Simplified `scripts/dev-up.sh` / `dev-down.sh` to use root compose only.
- `docker compose config` validates merged stack (Kong on 8400, all services present).

## Migration note
If Supabase was started earlier from `server/supabase/` alone, stop it first to avoid container name conflicts:
```bash
cd server/supabase && docker compose -f docker-compose.yml -f docker-compose.s3.yml down
cd ../.. && docker compose up -d
```

## What Comes Next
- Attach Supabase services to `ryvo-net` overlay (optional) for edge functions → Kafka/Redis without host networking.
