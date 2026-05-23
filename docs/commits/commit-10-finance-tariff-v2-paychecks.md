# Commit 10 — Finance tariff v2, paychecks, payments & admin UX

## Summary

Major finance admin refactor: simplified tariff packages (Basic, Essential, Pro, Pro+ + custom), earnings-based withdrawals, enriched paycheck queue, driver search, and Users-style list layouts for Payments, Paychecks, Referrals/Coupons, and Tariff subscribers.

## Business model (v2)

- Commission applies to **earned balance**, not per-trip / quota / batch cadence.
- Drivers withdraw anytime; payout follows package rules (**Instant** minutes or **Days** delay).
- **Basic** is the default plan for new drivers (edit only, no delete, unlimited validity).
- Subscribed drivers (non-Basic) get commission **discount** from their package.

## Schema & seeds

| Seed | Purpose |
|------|---------|
| `027_paychecks_tariffs_subscriptions.sql` | Paycheck tariff link, `transfer_due_at`, `is_subscription`, `in_payout_queue`, `driver_tariff_subscriptions`, `billing_mode` |
| `028_tariff_v2.sql` | Recurrence, `valid_until`, `min_withdraw_amount`, `payout_label` (instant/days), `is_basic`, `driver_earnings`, four core packages |
| `029_backfill_paycheck_tariffs.sql` | Link legacy paychecks to active driver tariff |

## Tariff packages (admin)

- **Form v2:** recurrences, monthly price, min withdraw, valid till, payout label (Instant/Days), custom pending text, remove-ads perk, search priority rank.
- **Removed from UI:** billing model, subscription toggles, search boost field, old batch payout presets.
- **Tariffs tab:** search + filters (status, type); Create package restored for custom plans; Basic has no delete.
- **Subscribers tab:** all drivers including Basic; **Migrate** between packages.

## Paychecks (admin)

- **Tabs:** Paying (queue) | Drivers amount (earned balances).
- **Paying:** Users-style table/grid; hold/resume/cancel/delete; edit amount; notify driver; tariff type + transfer date columns (no Period/Subscription).
- **Transfer date:** `created_at` (withdrawal trigger) + tariff delay (`payout_delay_minutes` or `payout_delay_days`).
- **List enrichment:** falls back to driver active subscription when `tariff_package_id` is missing.
- **Add to queue:** driver search by name, @username, email (not raw UUID).
- **Drivers amount:** adjust balance; **Pay** opens dialog and queues paycheck from earned balance.

## Payments (admin)

- Users-style list with stats, search, filters, preview dialog (`admin-payments.ts` API).

## Referrals / Coupons

- Fixed React hooks order in coupons panel; parallel fetch; per-tab loading; `ApiError` hint for stale gateway.

## API (auth-hooks)

- Paychecks: enriched list, hold/resume/cancel/delete, amount patch.
- Tariff subscriptions: CRUD + `migrate` action.
- Driver earnings: `GET`, `PATCH` adjust, `POST …/queue-paycheck`.
- Admin payments: `GET /v1/admin/payments`.
- `finance-paychecks.ts`, `finance-subscriptions.ts`, `finance-driver-earnings.ts`, `finance-tariff-utils.ts`, `finance-paycheck-notify.ts`.

## Web components (new)

- `tariffs-tabs.tsx`, `tariff-subscribers-panel.tsx`
- `paychecks-tabs.tsx`, `drivers-amount-panel.tsx`, `driver-search-field.tsx`
- `payments-panel.tsx`, `payment-preview-dialog.tsx`
- `finance-notify-action-dialog.tsx`, `paycheck-preview-dialog.tsx`
- `components/ui/textarea.tsx`

## Ops

- Run seeds via `docker exec … migrate-idempotent.sh`
- Restart `ryvo-functions` after handler changes
- `server/supabase/scripts/verify-finance-routes.sh` for route smoke check

## i18n

- `financeTariffs`, `financePaychecks`, `financeSubscribers`, `financeDriversAmount` keys (en/fr).

## Next

- Driver/mobile withdrawal flow wired to `driver_earnings` + paycheck queue
- Persist `transfer_due_at` backfill in SQL for all legacy rows (optional)
- de/es/zh for new strings
