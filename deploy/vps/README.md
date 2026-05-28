# VPS deploy

```
deploy/vps/
  .env.dev.example
  .env.prod.example
  scripts/
    deploy.sh          # apply-env + compose + caddy + health-check (CI + redeploys)
    setup-dev.sh       # git pull dev + deploy.sh dev
    setup-prod.sh      # git pull main + deploy.sh prod
    apply-env.sh
    health-check.sh
  server/
    supabase/env.example
    kafka/env.example
    redis/env.example
    bunqueue/env.example
  client/web/
    ryvo/env.dev.example | env.prod.example
    ryvo_admin/env.dev.example | env.prod.example
```

Runtime (gitignored): `.env.dev`, `.env.prod`, `server/*/.env`, `client/web/*/.env.local`.

## One command (dev VPS)

```bash
cd ~/Projects/Web/ryvo
git checkout dev && git pull
bash deploy/vps/scripts/setup-dev.sh
```

Redeploy after env changes (no git pull):

```bash
bash deploy/vps/scripts/deploy.sh dev
```

Compose only (no apply-env / health-check):

```bash
bash deploy/vps/scripts/apply-env.sh dev
./scripts/ryvo-up.sh dev
```

## Local smoke test

```bash
bash scripts/ensure-env.sh
docker compose up -d --build
bash deploy/vps/scripts/health-check.sh local
```

## Ports

| Env | Admin | Client | API (Caddy) |
|-----|-------|--------|-------------|
| local | 3200 | 3300 | 8400 |
| dev | 3400 | 3500 | 8500 |
| prod | 3200 | 3300 | 8400 |

## Test account

`admin@ryvo-line.com` / `Admin@123`

Seed users if needed: `bash server/supabase/scripts/seed-users.sh`
