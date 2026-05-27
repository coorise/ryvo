# Ryvo-Line Web

Next.js static export app (`client/web/ryvo/`).

## Layout

```
src/
  app/          # routes (auth, admin, client, driver, landing)
  components/   # UI + layout + ryvo components
  configs/
  core/
  guards/
  hooks/
  i18n/
  lib/
  services/
  stores/
  styles/       # globals.css (Tailwind + theme)
  types/
```

## Environment

Login requires `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copy from the backend:

```bash
bash scripts/sync-env.sh   # writes .env.local from server/supabase/.env
```

Or copy `ANON_KEY` and `SUPABASE_PUBLIC_URL` manually into `.env.local` (see `.env.example`).

## Commands

```bash
bun install
bun run dev      # http://0.0.0.0:3200 — restart after changing .env.local
bun run build    # static output in out/
```

Shadcn components: `bunx shadcn@latest add button` (from this directory).
