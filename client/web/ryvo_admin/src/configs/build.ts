/**
 * Next.js `output: "export"` — no Node server, no SSR at runtime.
 * Auth, ABAC, and API calls run in the browser after hydration.
 * Set `NEXT_PUBLIC_*` env vars before `bun run build` (values are inlined).
 */
export const STATIC_EXPORT = true as const;
