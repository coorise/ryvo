# VPS deploy

Mirrors the repo layout under `deploy/vps/`:

```
deploy/vps/
  compose/              # root docker-compose orchestration (→ deploy/vps/compose/.env.dev|prod)
    env.dev.example
    env.prod.example
  server/               # → server/*/.env
    supabase/env.example
    kafka/env.example
    redis/env.example
    bunqueue/env.example
  client/web/           # → client/web/*/.env.local
    ryvo/env.dev.example | env.prod.example
    ryvo_admin/env.dev.example | env.prod.example
  scripts/
    deploy.sh
    setup-dev.sh | setup-prod.sh
    apply-env.sh
    health-check.sh
```

Runtime (gitignored): `compose/.env.dev`, `compose/.env.prod`, `server/*/.env`, `client/web/*/.env.local`.

## One command (dev VPS)

```bash
cd ~/Projects/Web/ryvo
git checkout dev && git pull
bash deploy/vps/scripts/setup-dev.sh
```

Redeploy (no git pull):

```bash
bash deploy/vps/scripts/deploy.sh dev
```

## Ports

| Env | Admin | Client | API (Caddy) |
|-----|-------|--------|-------------|
| local | 3200 | 3300 | 8400 |
| dev | 3400 | 3500 | 8500 |
| prod | 3200 | 3300 | 8400 |

Test account: `admin@ryvo-line.com` / `Admin@123`
