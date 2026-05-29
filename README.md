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

## Repository structure

High-level layout:

- **`client/web/ryvo_admin/`**: Next.js admin portal (VPS host: `ryvo-line-admin.dev.agglomy.com`)
- **`client/web/ryvo/`**: Next.js customer portal (VPS host: `ryvo-line.dev.agglomy.com`)
- **`server/supabase/`**: Supabase stack (Postgres, Auth, Storage, Kong, etc.)
- **`deploy/vps/`**: VPS automation (env templating, blue/green deploy, Caddy routing)
- **`network/caddy/`**: Edge routing templates (generated Caddyfiles on VPS are gitignored)

## Environment files (how env actually works)

There are **two different env worlds**:

- **Docker runtime env**: used by containers at runtime (Compose `env_file`, etc.)
- **Next.js build-time env**: `NEXT_PUBLIC_*` is **inlined into the browser bundle during `next build`**, so the value must exist **while building the image**.

### Next.js + Docker: which file is used?

When building Docker images, `next build` runs with `NODE_ENV=production`, so Next.js loads:

- **`client/web/*/.env.production`** (and `*.production.local` if present)

It does **not** use `.env.local` / `.env.dev` for the production build step.

That’s why the repo includes scripts that write `.env.production` right before building images:

- `deploy/vps/scripts/write-web-env-production.sh` (VPS deploy + local Docker builds)
- `scripts/ensure-env.sh` (local convenience for localhost URLs)

### Per-service env files

Each service has its own `.env` (gitignored). Local/VPS workflows generate/patch these automatically, but you can also manage them manually.

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

## Get started (local development)

### Prerequisites

- Docker + Docker Compose plugin
- Bun (for local `bun run dev`)

### One command (full local stack)

```bash
# 1. One command — full stack (Caddy + Supabase + web)
./scripts/ryvo-up.sh
# or: bash scripts/ensure-env.sh && docker compose up -d --build
```

**VPS dev:** see [deploy/vps/README.md](deploy/vps/README.md) — `bash deploy/vps/scripts/setup-dev.sh`

```bash
# Legacy / manual local
bash scripts/dev-up.sh
# or: docker compose up -d   (after ensure-env.sh)

# 2. Seed test users (after Supabase is healthy)
bash server/supabase/scripts/seed-users.sh

# 3. Web app
cd client/web/ryvo && bun install && bun run dev

# 4. Flutter (Phase 5)
cd client/mobile/flutter/ryvo && flutter pub get
```

### Local: Docker builds of Next.js apps

If you build the Next.js images locally (instead of running `bun run dev`), make sure `.env.production` exists:

```bash
bash scripts/ensure-env.sh
# this writes:
# - client/web/ryvo/.env.production
# - client/web/ryvo_admin/.env.production
```

## Documentation

- **Agent spec:** `docs/project/instructions.md`
- **Checkpoints:** `docs/commits/` (resume context for any agent)
- **Credentials template:** `docs/project/credentials.txt` (not committed)

## CI/CD (dev VPS)

The GitHub Actions workflow `.github/workflows/deploy_dev.yml` does:

- Build and push Docker images (web admin, web client, functions gateway)
- SSH to the VPS and run a blue/green deploy (`deploy/vps/scripts/deploy-bluegreen.sh`)

### Required GitHub secrets

- **Docker registry**
  - `DOCKER_USERNAME`
  - `DOCKER_TOKEN`
- **VPS SSH**
  - `VPS_HOST` (e.g. `vps1.agglomy.com`)
  - `VPS_USER` (e.g. `coorise`)
  - `VPS_SSH_KEY` (private key contents)
  - `VPS_SSH_PORT` (optional; defaults to 22)
- **Supabase (Next.js build-time)**
  - `DEV_SUPABASE_ANON_KEY` (value = `ANON_KEY` from `server/supabase/.env`)

### Fallback behavior for missing `DEV_SUPABASE_ANON_KEY`

If `DEV_SUPABASE_ANON_KEY` is **not** set in GitHub, the workflow will **SSH into the VPS** (using the same VPS SSH secrets) and read:

- `server/supabase/.env` → `ANON_KEY`

Then it uses that value for Next.js image builds (writes `client/web/*/.env.production` and passes `--build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=...`).

If SSH secrets are missing, or the key cannot be read from the VPS, the CI build fails (to avoid shipping a Next.js bundle with an empty anon key).

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
