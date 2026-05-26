# Commit 12 — Communication nav, Settings split, and admin task scheduler

## Summary

Restructures the admin sidebar: **Communication** (notifications, messages, chat support), **Human resources** (staff + feedbacks), **Settings** (profile + configurations only), **Advanced** (tasks + observability). Implements a **task scheduler** with preset and HTTP-style jobs, cron execution, and DB persistence.

## Sidebar & routes

| Area | Change |
|------|--------|
| **Communication** | Notifications, Messages, Chat support (ticket badge); `/admin/tickets` redirects to chat support |
| **HR** | Staff + **Feedbacks** (tabs placeholder: product / drivers / staff) |
| **Settings** | **Profile** → `/admin/settings/profile` (standalone). **Configurations** → `/admin/settings/configurations` (General / Payment / Mail / Notifications tabs, no profile tab). `/admin/settings` redirects to configurations |
| **Advanced** | **Tasks** → `/admin/settings/tasks`, **Observability** unchanged |

## Task scheduler (MVP)

| Seed | Purpose |
|------|---------|
| `033_admin_tasks_scheduler.sql` | `admin_tasks`, `admin_task_runs` |
| `034_admin_tasks_http.sql` | `kind`, `request_method`, `request_path`, `request_query`, `request_headers`, `request_body` |

- **API** (auth-hooks, `settings:read` / `settings:update`): list/create/run/pause/resume/delete tasks under `/v1/admin/settings/tasks`.
- **Execution**: `_shared/lib/admin-tasks.ts` — **preset** `purge_abandoned_checkouts`; **http** tasks call internal service-signed `fetch` (MVP: paths must start with `cron-jobs/`).
- **Cron**: `cron-jobs/v1/run/admin-tasks` + `cron-scheduler` interval (60s).
- **UI**: `tasks-panel.tsx`, `tasks.service.ts` — stats, table, create dialog (HTTP vs preset, preset dropdown, schedule modes).

## Web files (high level)

- `configs/admin-nav.ts`, `configs/const.ts`, `admin-sidebar-nav.tsx`
- `app/admin/communication/*`, `app/admin/hr/feedbacks`, `app/admin/settings/{profile,configurations,tasks}`, `app/admin/settings/page.tsx`, `app/admin/tickets/page.tsx`
- `components/admin/communication/*`, `components/admin/hr/feedbacks-panel.tsx`, `components/admin/settings/tasks-panel.tsx`

## Ops

```bash
docker exec -e SEEDS_DIR=/opt/ryvo/seeds ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
docker restart ryvo-functions
```

## i18n

- **en/fr**: `nav.*` groups, `communication.*`, `hr.feedbacks.*`, `settingsTasks.*` (extend de/es/zh when needed).

## Next

- More **preset** operations + catalog from server
- **HTTP tasks**: expand allowlist beyond `cron-jobs/*` via a dedicated service-runner
- **Workflows**: multi-step chains, retries, and run history UI
