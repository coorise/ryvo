# VPS deploy

Portable bootstrap: **one secrets file** (`server/supabase/.env`) + generated env everywhere else.

Full reference: [docs/env-guide.md](../docs/env-guide.md) · release flow & dev/prod isolation: [README.md](../README.md#branches--release-flow)

## Dev and prod on one VPS

Dev and prod are **separate Docker Compose projects** with isolated data and services:

- **Dev:** project `ryvo-dev`, network `ryvo-net-dev`, volumes `*_dev`, containers `*_dev`, images tagged from `dev` CI.
- **Prod:** project `ryvo`, network `ryvo-net`, volumes under `data/`, containers `*_prod`, images tagged from `main` CI.

Only **secrets** (`server/supabase/.env`) and **git templates** (`deploy/vps/**`) are shared. Deploying dev never replaces prod data; each `deploy-bluegreen.sh dev|prod` runs `apply-env.sh` for that stack only.

## Layout (committed templates only)

```
deploy/vps/
  compose/
    env.dev.example     →  .env.dev      (runtime, gitignored)
    env.prod.example    →  .env.prod
    app.bluegreen.*.yaml
  server/
    supabase/env.example (+ env.prod.example)
    kafka|redis|bunqueue/env.example
  client/web/
    ryvo|ryvo_admin/env.{dev,prod}.example  →  client/web/*/.env.local
  scripts/
    bootstrap.sh          # fresh install: ensure-env + apply-env
    apply-env.sh          # regenerate VPS env from templates + supabase secrets
    write-web-env-production.sh
    deploy-bluegreen.sh   # CI/CD + manual redeploy
    setup-dev.sh | setup-prod.sh
```

## Fresh VPS (dev)

```bash
cd ~/Projects/Web/ryvo
git checkout dev && git pull

cp server/supabase/.env.example server/supabase/.env
# Edit server/supabase/.env — ANON_KEY, GOOGLE_MAPS_API_KEY, JWT, DB password

bash deploy/vps/scripts/bootstrap.sh dev
bash deploy/vps/scripts/setup-dev.sh
```

## Redeploy (no git pull)

```bash
bash deploy/vps/scripts/bootstrap.sh dev    # refresh env if you changed server/supabase/.env
bash deploy/vps/scripts/deploy-bluegreen.sh dev sha-$(git rev-parse HEAD)
```

## What you edit vs what is generated

| Edit (hand) | Generated (scripts) |
|-------------|---------------------|
| `server/supabase/.env` | `deploy/vps/compose/.env.dev\|prod` |
| `DOCKER_*` in compose `.env.*` or GitHub secrets | `client/web/*/.env.local` |
| | `client/web/*/.env.production` (Next.js Docker build) |

## Ports

| Stack | Admin | Client | API (Caddy) |
|-------|-------|--------|-------------|
| Dev | 3400 | 3500 | 8500 |
| Prod | 3200 | 3300 | 8400 |

Caddy routes to blue/green web containers on internal `:3000`.  
`network/caddy/Caddyfile.dev` / `Caddyfile.prod` are generated on deploy (gitignored).

## CI/CD secrets

See root [README.md](../README.md#cicd-github-actions). Optional `DEV_*` / `PROD_*` keys fall back to reading `server/supabase/.env` on the VPS over SSH.

Test account: `admin@ryvo-line.com` / `Admin@123`
