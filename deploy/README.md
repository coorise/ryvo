# Deploy templates

Structured env templates for VPS (and team onboarding). Runtime secrets stay **gitignored** on the server.

## Layout

```
deploy/
  compose/
    env.dev.example      → deploy/compose/.env.dev (orchestrator)
    env.prod.example     → deploy/compose/.env.prod
  server/
    supabase/  env.example | env.dev.example | env.prod.example
    kafka/     env.example | env.dev.example | env.prod.example
    redis/     env.example | env.dev.example | env.prod.example
    bunqueue/  env.example | env.dev.example | env.prod.example
  client/
    web/
      ryvo/        env.dev.example | env.prod.example
      ryvo_admin/  env.dev.example | env.prod.example
  scripts/
    apply-env.sh      # merge templates → server/*/.env + compose + client .env.local
    setup-dev.sh      # apply-env dev + docker compose up
    setup-prod.sh     # apply-env prod + docker compose up
    health-check.sh   # curl admin, client, API, login
```

## One command (VPS dev)

```bash
cd ~/Projects/Web/ryvo
git checkout dev && git pull
bash deploy/scripts/setup-dev.sh
```

Equivalent to:

```bash
bash deploy/scripts/apply-env.sh dev
./scripts/ryvo-up.sh dev
bash deploy/scripts/health-check.sh dev
```

## Local

```bash
bash scripts/ensure-env.sh
docker compose up -d --build
bash deploy/scripts/health-check.sh local
```

## Ports

| Env | Admin | Client | API (Caddy) |
|-----|-------|--------|-------------|
| local | 3200 | 3300 | 8400 |
| dev | 3400 | 3500 | 8500 |
| prod | 3200 | 3300 | 8400 |

## Test accounts

| Email | Password |
|-------|----------|
| admin@ryvo-line.com | Admin@123 |

After first deploy, seed users if needed:

```bash
bash server/supabase/scripts/seed-users.sh
```
