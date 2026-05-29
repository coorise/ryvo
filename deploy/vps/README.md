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

| Env | Admin (host) | Client (host) | API (Caddy) |
|-----|--------------|---------------|-------------|
| local | 3200 | 3300 | 8400 |
| dev | 3400 | 3500 | 8500 |
| prod | 3200 | 3300 | 8400 |

### Why every web container uses `PORT=3000`

Each Next.js container listens on **3000 inside its own network namespace** (admin blue, admin green, client blue, client green are separate containers). There is no host conflict.

**Caddy** is the only public edge on the host:

- `:3400` → `ryvo-web-admin_{blue|green}_dev:3000`
- `:3500` → `ryvo-web-client_{blue|green}_dev:3000`

`network/caddy/Caddyfile.dev` is **generated on the VPS** by `deploy-bluegreen.sh` (gitignored). Template: `Caddyfile.dev.example`.

### Local `npm run dev` (no Docker)

| App | Port |
|-----|------|
| `ryvo_admin` | 3200 (`package.json` dev script) |
| `ryvo` client | 3300 |

After pulling, clear stale Next cache: `rm -rf client/web/ryvo/.next client/web/ryvo_admin/.next`.

Test account: `admin@ryvo-line.com` / `Admin@123`
