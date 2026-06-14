# Ryvo-Line

Production-grade Uber-like ride-hailing platform.

## Stack

| Layer | Technology |
|-------|------------|
| BaaS | Supabase (self-hosted Docker) |
| Microservices | Bun JS edge functions |
| Events | Apache Kafka |
| Tasks | Bunqueue |
| Cache | Redis |
| Web | Next.js 16 |
| Mobile | Flutter (`com.ryvo.app`) |

## Repository layout

| Path | Role |
|------|------|
| `server/supabase/` | Postgres, Auth, Kong, edge functions |
| `client/web/ryvo_admin/` | Admin portal |
| `client/web/ryvo/` | Customer / driver / client portal |
| `network/caddy/` | Reverse proxy (edge routing) |
| `deploy/vps/` | VPS templates, bootstrap, blue/green deploy |
| `compose/` | Local Docker Compose env (`local.env`) |
| `docs/env-guide.md` | **Full env & compose reference** |

---

## Branches & release flow

| Branch | Role | VPS stack | Public URLs |
|--------|------|-----------|-------------|
| **`dev`** | Beta / QA — full end-to-end testing | `docker-compose.dev.yaml` | `*.dev.agglomy.com` |
| **`main`** | Production — live users | `docker-compose.prod.yaml` | `ryvo-line*.agglomy.com` |

**Workflow**

1. Push to **`dev`** → GitHub Actions builds Docker images → deploys to the **dev** VPS stack (`deploy_dev.yml`).
2. Beta team tests on dev URLs; fix issues on `dev` and redeploy until approved.
3. Merge **`dev` → `main`** (GitHub or CLI below) → GitHub Actions builds **prod** images → deploys the **prod** stack (`deploy_main.yml`).

Dev and prod on the same VPS are **independent**: separate databases, volumes, container names, Docker networks, image tags, and compose env files. They only share **git templates** under `deploy/vps/` and **secrets** in `server/supabase/.env` (anon key, JWT, Maps key, …). Each deploy runs `apply-env.sh dev|prod` first so URL overlays match the target stack.

### Merge dev → main (GitHub website)

1. Open the repo on GitHub → **Pull requests** → **New pull request**.
2. Set **base:** `main`, **compare:** `dev`.
3. Review the diff, add a short summary, create the PR.
4. When beta sign-off is done, click **Merge pull request** (merge commit is fine).
5. Watch **Actions** → **Deploy production to VPS** on the `main` push.

Direct link pattern: `https://github.com/<org>/ryvo/compare/main...dev`

### Merge dev → main (CLI)

```bash
# From your machine (needs git + gh CLI, repo cloned)
cd ryvo
git fetch origin
git checkout dev && git pull origin dev

# Option A — GitHub CLI (recommended)
gh pr create --base main --head dev \
  --title "Release: dev → main" \
  --body "Beta approved on dev VPS. Deploying to production."

gh pr view --web          # optional: review in browser
gh pr merge --merge       # merge; triggers deploy_main.yml on main

# Option B — local merge + push (also triggers CI on main)
git checkout main && git pull origin main
git merge origin/dev --no-ff -m "Merge dev into main for production release"
git push origin main
```

After merge, confirm the workflow run succeeded and hit the prod URLs (see [VPS production URLs](#vps-production-urls)).

---

## Environment: one rule

**Edit secrets in one place:** `server/supabase/.env`  
(`ANON_KEY`, `GOOGLE_MAPS_API_KEY`, JWT, DB password, Stripe, SMTP, …)

Scripts derive everything else. Do **not** maintain duplicate keys across many files.

| Mode | Compose file | Generated env file | Run once |
|------|--------------|------------------|----------|
| **Local** | `docker-compose.yaml` | `compose/local.env` | `bash scripts/ensure-env.sh` |
| **VPS dev** | `docker-compose.dev.yaml` | `deploy/vps/compose/.env.dev` | `bash deploy/vps/scripts/bootstrap.sh dev` |
| **VPS prod** | `docker-compose.prod.yaml` | `deploy/vps/compose/.env.prod` | `bash deploy/vps/scripts/bootstrap.sh prod` |

**Next.js note:** `NEXT_PUBLIC_*` is inlined at **`next build`** from `client/web/*/.env.production`, not from runtime container env. See [docs/env-guide.md](docs/env-guide.md).

---

## VPS: dev vs prod isolation (same machine)

Both stacks can run on one VPS without sharing runtime data.

| | **Dev** | **Prod** |
|---|---------|----------|
| Compose project | `ryvo-dev` | `ryvo` |
| Compose file | `docker-compose.dev.yaml` | `docker-compose.prod.yaml` |
| Compose env | `deploy/vps/compose/.env.dev` | `deploy/vps/compose/.env.prod` |
| Docker network | `ryvo-net-dev` | `ryvo-net` |
| Edge ports (Caddy) | 3400 admin / 3500 client / 8500 API | 3200 / 3300 / 8400 |
| DB volume | `server/supabase/volumes/db/data_dev` | `…/data` |
| Storage volume | `…/storage_dev` | `…/storage` |
| Kafka / Redis / Bunqueue data | `*/data_dev` | `*/data` |
| Container suffix | `*_dev` (e.g. `supabase-db_dev`) | `*_prod` or plain (e.g. `supabase-db`) |
| Web / functions images | `coorise/ryvo-*:sha-<dev-commit>` | `coorise/ryvo-*:sha-<main-commit>` |
| CI workflow | `deploy_dev.yml` on push to `dev` | `deploy_main.yml` on push to `main` |
| URL templates | `deploy/vps/**/env.dev.example` | `deploy/vps/**/env.prod.example` |

**Shared (by design):** `server/supabase/.env` secrets file on disk; committed templates under `deploy/vps/`.  
**Not shared:** Postgres data, file storage, Kafka/Redis/Bunqueue state, running containers, or built web bundles.

Manual redeploy on the VPS (after env or secret changes):

```bash
# Dev
bash deploy/vps/scripts/apply-env.sh dev
bash deploy/vps/scripts/deploy-bluegreen.sh dev sha-$(git rev-parse HEAD)

# Prod (on main branch)
bash deploy/vps/scripts/apply-env.sh prod
bash deploy/vps/scripts/deploy-bluegreen.sh prod sha-$(git rev-parse HEAD)
```

Details: [deploy/vps/README.md](deploy/vps/README.md)

### VPS dev URLs

| Service | URL |
|---------|-----|
| Client | https://ryvo-line.dev.agglomy.com |
| Admin | https://ryvo-line-admin.dev.agglomy.com |
| API | https://ryvo-line-server.dev.agglomy.com |

### VPS production URLs

| Service | URL |
|---------|-----|
| Client | https://ryvo-line.agglomy.com |
| Admin | https://ryvo-line-admin.agglomy.com |
| API | https://ryvo-line-server.agglomy.com |

---

## Fresh local install

```bash
git clone <repo> && cd ryvo

# 1. Create backend secrets (first time only)
cp server/supabase/.env.example server/supabase/.env
# Edit server/supabase/.env — at minimum set GOOGLE_MAPS_API_KEY for admin map

# 2. Generate all derived env files
bash scripts/ensure-env.sh

# 3. Start full stack (Caddy + Supabase + web containers)
./scripts/ryvo-up.sh

# 4. Seed demo users (after Supabase is healthy)
bash server/supabase/scripts/seed-users.sh
```

**Local URLs**

| Service | URL |
|---------|-----|
| API (Kong via Caddy) | http://localhost:8400 |
| Admin web (Docker) | http://localhost:3200 |
| Client web (Docker) | http://localhost:3300 |

**Web without Docker (hot reload)**

```bash
cd client/web/ryvo_admin && bun install && bun run dev   # :3200
cd client/web/ryvo && bun install && bun run dev         # :3300
```

Uses `client/web/*/.env.local` (also generated by `ensure-env.sh`).

**Files you touch locally:** only `server/supabase/.env` (+ optional edits to `server/kafka|redis|bunqueue/.env` if defaults are wrong).

**Do not use:** root `.env` (removed by `ensure-env.sh` — use `compose/local.env` for Docker Compose).

**After changing `server/supabase/.env` (Docker stack on :3200 / :3300):**

```bash
bash scripts/ensure-env.sh
bash scripts/rebuild-web-local.sh both   # admin + client; or admin|client
```

| How you run | Env file used |
|-------------|---------------|
| `./scripts/ryvo-up.sh` (Docker + Caddy) | `compose/local.env` → `.env.production` at image build |
| `bun run dev` in `ryvo_admin` or `ryvo` | `client/web/*/.env.local` |

---

## Fresh VPS install

```bash
ssh user@vps
git clone <repo> && cd ryvo && git checkout dev   # or main for prod

cp server/supabase/.env.example server/supabase/.env
# Edit server/supabase/.env on the VPS (ANON_KEY, GOOGLE_MAPS_API_KEY, …)

bash deploy/vps/scripts/bootstrap.sh dev          # or prod
bash deploy/vps/scripts/setup-dev.sh             # git pull + bootstrap + deploy
```

Details: [deploy/vps/README.md](deploy/vps/README.md) · [docs/env-guide.md](docs/env-guide.md)

See [VPS: dev vs prod isolation](#vps-dev-vs-prod-isolation-same-machine) and [Merge dev → main](#merge-dev--main-github-website) in this README.

---

## CI/CD (GitHub Actions)

| Workflow | Branch | Trigger | VPS deploy |
|----------|--------|---------|------------|
| `.github/workflows/deploy_dev.yml` | `dev` | Push to `dev` | `deploy-bluegreen.sh dev sha-<sha>` |
| `.github/workflows/deploy_main.yml` | `main` | Push to `main` (incl. merge from `dev`) | `deploy-bluegreen.sh prod sha-<sha>` |

**Pipeline:** build & push `coorise/ryvo-web-admin`, `ryvo-web-client`, `ryvo-functions` → SSH to VPS → `git pull` → `apply-env` → blue/green deploy (rebuilds web images on VPS with `.env.production`).

You can also trigger prod deploy manually: **Actions** → **Deploy production to VPS** → **Run workflow** (branch `main`).

### Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `DOCKER_USERNAME` | Docker Hub namespace |
| `DOCKER_TOKEN` | Docker Hub PAT |
| `VPS_HOST` | VPS hostname |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private key (full PEM) |
| `VPS_SSH_PORT` | Optional (default 22) |

### Optional secrets (else CI reads from VPS `server/supabase/.env`)

| Dev | Prod |
|-----|------|
| `DEV_SUPABASE_ANON_KEY` | `PROD_SUPABASE_ANON_KEY` |
| `DEV_GOOGLE_MAPS_API_KEY` | `PROD_GOOGLE_MAPS_API_KEY` |

Both web apps (admin + client) receive anon key and Maps key in `.env.production` and Docker build-args. Maps is optional in CI (warning only) but required for map features.

**First CI run:** clone repo on VPS and set `server/supabase/.env` **or** add the optional secrets in GitHub → Settings → Secrets.

**Flow:** push/merge → CI builds/pushes images → SSH to VPS → `git pull` → `apply-env.sh` → `deploy-bluegreen.sh` (also rebuilds web images on VPS with `.env.production` from the target stack).

---

## Test accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ryvo-line.com | Admin@123 |
| Driver | driver@ryvo-line.com | Driver@123 |
| Client | client@ryvo-line.com | Client@123 |

## Documentation

- **Env & compose (detailed):** [docs/env-guide.md](docs/env-guide.md)
- **VPS deploy:** [deploy/vps/README.md](deploy/vps/README.md)
- **Agent spec:** `docs/project/instructions.md`
- **Credentials template:** `docs/project/credentials.txt` (not committed)
