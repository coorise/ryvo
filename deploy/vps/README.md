# VPS deployment (dev + prod)

Repo path on VPS: `~/Projects/Web/ryvo`

## Branches

| Branch | Compose file | Caddy ports (host) |
|--------|----------------|-------------------|
| `dev` | `docker-compose.dev.yaml` | admin **3400**, client **3500**, API **8500** |
| `main` | `docker-compose.prod.yaml` | admin **3200**, client **3300**, API **8400** |

cPanel forwards public HTTPS domains to those host ports (not port 80).

## One-time setup on VPS

**Automated (dev branch):**

```bash
cd ~/Projects/Web/ryvo
git checkout dev
bash deploy/vps/setup-dev.sh
```

**Manual** (if you prefer):

```bash
cd ~/Projects/Web/ryvo
git checkout dev   # or main for prod

bash scripts/ensure-env.sh

cp deploy/vps/.env.dev.example deploy/vps/.env.dev      # dev only
cp deploy/vps/supabase.env.dev.example server/supabase/.env   # merge into .env

# Create isolated data dirs (gitignored)
mkdir -p server/kafka/data_dev server/redis/data_dev server/bunqueue/data_dev
mkdir -p server/supabase/volumes/db/data_dev server/supabase/volumes/storage_dev
```

For **production** (`main`), use `.env.prod.example` and `supabase.env.prod.example` instead, and use `data/` (not `data_dev`).

## Commands

**Dev**

```bash
docker compose -f docker-compose.dev.yaml --env-file deploy/vps/.env.dev up -d --build
docker compose -f docker-compose.dev.yaml exec caddy_dev caddy reload --config /etc/caddy/Caddyfile
```

**Prod**

```bash
docker compose -f docker-compose.prod.yaml --env-file deploy/vps/.env.prod up -d --build
docker compose -f docker-compose.prod.yaml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Local (developers)

```bash
docker compose up -d --build
# Admin http://localhost:3200  Client http://localhost:3300  API http://localhost:8400
```
