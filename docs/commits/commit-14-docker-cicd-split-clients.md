# Commit 14 — Split web clients, Docker/Caddy orchestration, VPS CI/CD

## Summary

Splits the web app into **admin** (`client/web/ryvo_admin`, port **3200**) and **customers** (`client/web/ryvo`, port **3300**). Adds **Bun Dockerfiles** (Next.js `standalone`), **Caddy** edge routing (no port 80), unified **docker compose** for local / dev / prod, and **GitHub Actions** SSH deploy to VPS.

## Web clients

| App | Path | Local port | Prod host port | Dev host port |
|-----|------|------------|----------------|---------------|
| Admin | `client/web/ryvo_admin` | 3200 | 3200 | 3400 |
| Customer | `client/web/ryvo` | 3300 | 3300 | 3500 |

Public URLs (cPanel → host port):

| Env | Client | Admin | Supabase API |
|-----|--------|-------|----------------|
| Prod | ryvo-line.agglomy.com | ryvo-line-admin.agglomy.com | ryvo-line-server.agglomy.com |
| Dev | ryvo-line.dev.agglomy.com | ryvo-line-admin.dev.agglomy.com | ryvo-line-server.dev.agglomy.com |

## Docker compose

| File | Purpose |
|------|---------|
| `docker-compose.base.yaml` | Supabase + Kafka + Redis + Bunqueue includes |
| `docker-compose.yaml` | **Local** — full stack + Caddy on 3200/3300/8400 |
| `docker-compose.dev.yaml` | **VPS dev** — `_dev` service names, `data_dev` volumes, ports 3400/3500/8500 |
| `docker-compose.prod.yaml` | **VPS prod** — ports 3200/3300/8400 |

Postgres data:

- Prod: `server/supabase/volumes/db/data`
- Dev: `server/supabase/volumes/db/data_dev` (isolated)

## Caddy

- `network/caddy/Caddyfile.{local,dev,prod}` — reverse proxy to web + Kong; reload on deploy for minimal downtime.

## CI/CD

- `.github/workflows/deploy_dev.yml` → branch `dev` → `docker compose -f docker-compose.dev.yaml`
- `.github/workflows/deploy_main.yml` → branch `main` → `docker compose -f docker-compose.prod.yaml`

VPS secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, optional `VPS_SSH_PORT`.

Manual env on VPS (not in git): `deploy/vps/.env.dev`, `.env.prod`, `server/supabase/.env` — see `deploy/vps/README.md`.

## Ops

```bash
# Local
docker compose up -d --build

# VPS dev
docker compose -f docker-compose.dev.yaml --env-file deploy/vps/.env.dev up -d --build
```
