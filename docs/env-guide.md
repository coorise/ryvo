# Environment & Docker Compose guide

One mental model: **secrets live in `server/supabase/.env`**. Scripts derive everything else. You should almost never copy-paste the same key into five files.

## Three modes

| Mode | Compose file | Compose env file | Who generates runtime env |
|------|--------------|------------------|---------------------------|
| **Local** | `docker-compose.yaml` | `compose/local.env` | `scripts/ensure-env.sh` |
| **VPS dev** | `docker-compose.dev.yaml` | `deploy/vps/compose/.env.dev` | `deploy/vps/scripts/apply-env.sh dev` |
| **VPS prod** | `docker-compose.prod.yaml` | `deploy/vps/compose/.env.prod` | `deploy/vps/scripts/apply-env.sh prod` |

## Files you edit (by hand)

| File | When | What to put |
|------|------|-------------|
| **`server/supabase/.env`** | Local + VPS (always) | `ANON_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `GOOGLE_MAPS_API_KEY`, Stripe, SMTP, etc. |
| **`deploy/vps/compose/.env.dev`** | VPS dev only (optional) | `DOCKER_USERNAME`, `DOCKER_TOKEN` — or set as GitHub secrets |
| **`deploy/vps/compose/.env.prod`** | VPS prod only (optional) | Same Docker Hub creds for prod |

Everything else is **generated**. Re-run the script for your mode after changing `server/supabase/.env`.

## Generated files (do not edit)

| File | Used for |
|------|----------|
| `compose/local.env` | Local `docker compose` `${NEXT_PUBLIC_*}` interpolation |
| `client/web/*/.env.local` | `bun run dev` (Next.js dev server) |
| `client/web/*/.env.production` | Docker `next build` (inlines `NEXT_PUBLIC_*` into JS) |
| `deploy/vps/compose/.env.dev\|prod` | VPS ports, URLs, Docker Hub, derived `NEXT_PUBLIC_*` |
| `server/kafka\|redis\|bunqueue/.env` | Service runtime (from `.env.example` + VPS overlays) |

## Key name mapping

| Backend (`server/supabase/.env`) | Frontend (Next.js) |
|----------------------------------|--------------------|
| `ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `GOOGLE_MAPS_API_KEY` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (admin only) |
| `SUPABASE_PUBLIC_URL` | `NEXT_PUBLIC_SUPABASE_URL` (URLs come from VPS templates locally/dev/prod) |

## Next.js build-time vs runtime

`NEXT_PUBLIC_*` is **baked into the browser bundle at `next build`**. Changing env on a running container does **not** update the client.

- **Dev server:** reads `client/web/*/.env.local`
- **Docker image:** reads `client/web/*/.env.production` (written by `ensure-env.sh` or `write-web-env-production.sh`)

## Template sources (`deploy/vps/`)

Committed templates (examples only):

```
deploy/vps/
  compose/env.dev.example      → deploy/vps/compose/.env.dev
  compose/env.prod.example     → deploy/vps/compose/.env.prod
  server/supabase/env.example  → patches server/supabase/.env (URLs for VPS)
  client/web/*/env.*.example   → patches client/web/*/.env.local (URLs for VPS)
```

`apply-env.sh` merges templates, then **overwrites secrets from `server/supabase/.env`**. Empty or `REPLACE_*` template values never wipe existing secrets.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/ensure-env.sh` | **Local:** create `server/*/.env`, write `compose/local.env`, client `.env.local` + `.env.production` |
| `deploy/vps/scripts/bootstrap.sh dev\|prod` | **Fresh VPS:** ensure-env → validate → apply-env |
| `deploy/vps/scripts/apply-env.sh dev\|prod` | Regenerate VPS compose + client env from templates + supabase secrets |
| `deploy/vps/scripts/write-web-env-production.sh` | Write `client/web/*/.env.production` before Docker build |
| `deploy/vps/scripts/setup-dev.sh` | Git pull + bootstrap + deploy |
| `deploy/vps/scripts/deploy-bluegreen.sh` | CI/CD deploy (build images on VPS, blue/green switch) |

## Fresh local install

```bash
git clone … && cd ryvo
cp server/supabase/.env.example server/supabase/.env   # first time only
# Edit server/supabase/.env — set GOOGLE_MAPS_API_KEY and any provider keys

bash scripts/ensure-env.sh          # generates compose/local.env + client env
./scripts/ryvo-up.sh                # docker compose up (uses compose/local.env)
bash server/supabase/scripts/seed-users.sh

# Optional: web without Docker
cd client/web/ryvo_admin && bun install && bun run dev   # port 3200
cd client/web/ryvo && bun install && bun run dev         # port 3300
```

**You only maintain:** `server/supabase/.env` (+ optional provider keys in same file).

## Fresh VPS install (manual)

```bash
git clone … && cd ryvo && git checkout dev
cp server/supabase/.env.example server/supabase/.env
# Edit server/supabase/.env on the VPS (ANON_KEY, GOOGLE_MAPS_API_KEY, …)

bash deploy/vps/scripts/bootstrap.sh dev
bash deploy/vps/scripts/setup-dev.sh    # or deploy-bluegreen after CI is wired
```

## CI/CD (GitHub Actions)

Workflows: `.github/workflows/deploy_dev.yml` (branch `dev`), `deploy_main.yml` (branch `main`).

### Required secrets

| Secret | Purpose |
|--------|---------|
| `DOCKER_USERNAME` | Docker Hub user / image prefix |
| `DOCKER_TOKEN` | Docker Hub PAT |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | SSH deploy + env fallback |
| `VPS_SSH_PORT` | Optional (default 22) |

### Optional secrets (fallback: read from VPS `server/supabase/.env`)

| Dev | Prod |
|-----|------|
| `DEV_SUPABASE_ANON_KEY` | `PROD_SUPABASE_ANON_KEY` |
| `DEV_GOOGLE_MAPS_API_KEY` | `PROD_GOOGLE_MAPS_API_KEY` |

If optional secrets are missing, CI SSHs to the VPS and reads `ANON_KEY` / `GOOGLE_MAPS_API_KEY` from `server/supabase/.env`. VPS must have the repo cloned and env files set **before** the first CI run (or set GitHub secrets).

### CI flow

1. **Build job:** resolve secrets → write `client/web/*/.env.production` → build & push images
2. **Deploy job:** SSH → `git pull` → `deploy-bluegreen.sh` (rebuilds web images on VPS with local `.env.production` anyway)

## Deprecated / ignore

| Path | Note |
|------|------|
| Root `.env` | **Do not use.** Replaced by `compose/local.env` |
| `client/web/*/scripts/sync-env.sh` | Use `ensure-env.sh` instead |
| `docker-compose.base.dev.yaml` | Removed — use `docker-compose.dev.yaml` |
