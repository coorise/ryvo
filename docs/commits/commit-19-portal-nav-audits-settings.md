# Commit 19 — Portal nav: Audits + Settings reorg

## Change

Driver/client sidebars aligned with updated `draft-instructions.txt`:

- **Audits:** Security logs, Activity logs, **Analytics**
- **Settings** (replaces “Advanced”): **Profile** (editable via `/v1/me/profile`), **Configurations** (tabs: General, Payment, Notifications)

Removed `/driver/advanced/settings` and `/client/advanced/settings`.

## Routes

| Section | Driver | Client |
|---------|--------|--------|
| Analytics | `/driver/audits/analytics` | `/client/audits/analytics` |
| Profile | `/driver/settings/profile` | `/client/settings/profile` |
| Configurations | `/driver/settings/configurations` | `/client/settings/configurations` |

## Migrations

`047_user_custom_fields.sql` is applied by `ryvo-migrate` on every deploy and fresh install (`migrate-idempotent.sh` scans `scripts/seeds/[0-9]*.sql`).
