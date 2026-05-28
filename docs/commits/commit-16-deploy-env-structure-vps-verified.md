# Commit 16 — Structured deploy env + VPS verified

## Deploy layout

```
deploy/vps/.env.dev.example | .env.prod.example
deploy/vps/server/{module}/env.example (+ env.prod.example overlay)
deploy/vps/client/web/{app}/env.dev.example | env.prod.example
deploy/vps/scripts/      # apply-env, setup-dev, health-check
```

## VPS verification (dev)

- Admin `http://127.0.0.1:3400/` → 200
- Client `http://127.0.0.1:3500/` → 200
- API `/auth/v1/health` → 401
- Login `admin@ryvo-line.com` → access_token OK

## One command

```bash
bash deploy/vps/scripts/setup-dev.sh
```
