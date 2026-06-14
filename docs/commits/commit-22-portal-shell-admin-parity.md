# Commit 22 — Portal shell parity with admin layout

## Change

Driver/client dashboards in `client/web/ryvo` now use the same shell pattern as `ryvo_admin`:

- **`PortalShell`** — desktop sidebar, mobile drawer, global search, language switcher, theme toggle, notifications bell, user menu, sign-out confirmation
- **`PortalSidebarContent`** + **`PortalGlobalSearch`** — shared sidebar body and nav search
- Layouts **`/client/**`** and **`/driver/**`** switched from `DashboardShell` to `PortalShell`

## ABAC-ready nav

- `PortalNavItemConfig` supports optional `roles`, `permissions`, `permPrefixes`
- `canSeePortalNavItem()` filters sidebar items and hides empty groups (no rules on items yet — all visible by default)

## i18n

- `portal.shell.*` keys in `en.json` (driver/client labels, theme toggle, sign-out dialog)

## Next (e2e)

- User-scoped APIs for trips, payments, map, audits (replace admin endpoint reuse)
- Live map workflow tabs (request → accept → pay → drive)
- `PortalPathGuard`, ephemeral chat, driver KYC via `/v1/checklist`
