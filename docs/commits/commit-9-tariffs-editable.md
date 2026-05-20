# Commit 9 — Editable tariffs & custom driver packages

## Summary

Tariffs are no longer hardcoded placeholders. Admins with `finances:tariffs:update` can edit every field (name, code, commission %, payout cadence, pending minutes, quota, subscription price, search boost, discounts) and toggle driver perks. They can create custom packages and delete non-system plans.

## Schema (seed `022_tariff_features.sql`)

- `driver_tariff_packages`: `description`, `quota_trips`, `payout_delay_minutes`, `discount_percent`, `features` (jsonb), `is_system`, `updated_at`
- `package_type` adds `custom`
- Default `features` on Essential/Pro (search priority, media limits, etc.)

## API

- `GET /v1/admin/finance/tariffs` — full package rows
- `POST /v1/admin/finance/tariffs` — create custom package
- `PUT /v1/admin/finance/tariffs/:id` — full update
- `DELETE /v1/admin/finance/tariffs/:id` — blocked when `is_system`

## Web

- `tariff-types.ts`, `tariff-package-form.tsx`, `tariffs-panel.tsx` (create/edit dialog, feature chips, delete)
- `finance.service.ts` — create/update/delete + mapped fields
- i18n `financeTariffs.*` (en/fr)

## Driver perks (`features` jsonb)

- Search list priority (boost 0–100)
- Promoted listing
- Media gallery (max photos / short videos)
- Custom badge label
- Priority support
- Platform discount %

## Next

- Enforce selected package at driver signup / plan change
- Surface perks in client/driver apps
- de/es/zh strings for new keys
