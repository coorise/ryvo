# Ryvo-Line

Production-grade Uber-like ride-hailing platform.

## Stack

| Layer | Technology |
|-------|------------|
| BaaS | Supabase (self-hosted Docker, port **8400**) |
| Microservices | Bun JS edge functions |
| Events | Apache Kafka |
| Tasks | Bunqueue |
| Cache | Redis |
| Storage | MinIO (dev) / S3 (prod) |
| Web | Next.js 16 (Turborepo monorepo) |
| Mobile | Flutter (`com.ryvo.app`) |

## Environment files (per service)

Each stack has its own `.env` (gitignored). Copy from examples once:

```bash
bash scripts/ensure-env.sh
# or manually:
cp server/supabase/.env.example server/supabase/.env   # if you maintain an example
cp server/kafka/.env.example server/kafka/.env
cp server/redis/.env.example server/redis/.env
cp server/bunqueue/.env.example server/bunqueue/.env
```

| Path | Purpose |
|------|---------|
| `server/supabase/.env` | Postgres, JWT, Kong port 8400, SMTP, MinIO |
| `server/kafka/.env` | Broker ports, cluster id, `KAFKA_BROKER` for apps |
| `server/redis/.env` | Port, optional password, `REDIS_URL` for apps |
| `server/bunqueue/.env` | HTTP/TCP ports, `BUNQUEUE_HOST` for apps |

Root `docker-compose.yaml` loads each via `include` → `env_file` + `project_directory`.

## Quick start (local)

```bash
# 1. Ensure .env files exist, then start full stack
bash scripts/dev-up.sh
# or: docker compose up -d   (after ensure-env.sh)

# 2. Seed test users (after Supabase is healthy)
bash server/supabase/scripts/seed-users.sh

# 3. Web app
cd client/web/ryvo && bun install && bun run dev

# 4. Flutter (Phase 5)
cd client/mobile/flutter/ryvo && flutter pub get
```

## Documentation

- **Agent spec:** `docs/project/instructions.md`
- **Checkpoints:** `docs/commits/` (resume context for any agent)
- **Credentials template:** `docs/project/credentials.txt` (not committed)

## Test accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ryvo-line.com | Admin@123 |
| Driver | driver@ryvo-line.com | Driver@123 |
| Client | client@ryvo-line.com | Client@123 |

## Phases

1. Scaffolding & harmonization
2. Supabase BaaS (PostGIS, schema, RLS, MinIO)
3. Edge functions (Bun microservices)
4. Next.js web (admin / driver / client)
5. Flutter mobile
6. Alpha / beta testing
