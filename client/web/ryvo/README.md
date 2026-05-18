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

## Commands

```bash
bun install
bun run dev      # http://0.0.0.0:3200
bun run build    # static output in out/
```

Shadcn components: `bunx shadcn@latest add button` (from this directory).
