# Commit 15 — Modular Docker Compose layout

## Problem

Root `docker-compose.{yaml,dev,prod}.yaml` inlined Caddy, web clients, and server overrides instead of using the existing per-folder compose stubs (`network/caddy`, `client/web/*`, `server/*/docker-compose.dev.yaml`), many of which were left empty.

## Fix

- **Root compose files** are import-only orchestrators.
- **`network/caddy/`** owns Caddy service, volumes, Kong edge (`ports: !reset`, `ryvo-net`), and `Caddyfile.{local,dev,prod}`.
- **`client/web/ryvo_admin`** and **`client/web/ryvo`** own their Next.js services (`docker-compose.yaml` + `.dev.yaml` / `.prod.yaml`).
- **`server/*`** own environment overlays (`docker-compose.dev.yaml`, `docker-compose.prod.yaml`).

## Commands (unchanged)

```bash
docker compose up -d --build
docker compose -f docker-compose.dev.yaml --env-file deploy/vps/.env.dev up -d --build
docker compose -f docker-compose.prod.yaml --env-file deploy/vps/.env.prod up -d --build
```
