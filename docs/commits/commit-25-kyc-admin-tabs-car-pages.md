# Commit 25 — Admin KYC tabs UX, full car pages, vehicle review

## Admin (`client/web/ryvo_admin`)

- Driver detail: **Driver | Driver's cars** tabs moved directly under header (manage profile inside Driver tab)
- URL: `?tab=cars` deep link
- KYC checklist: all personal doc types shown (including missing)
- Cars tab: full vehicle specs, banner/gallery/video preview, per-document + vehicle approve/reject with reason

## Backend

- `GET /v1/admin/vehicles/:vehicle_id/media/view-url?key=` — staff preview car media

## Driver portal (`client/web/ryvo`)

- Car CRUD via **pages** (not modals):
  - `/driver/main/kyc/cars/new`
  - `/driver/main/kyc/cars/[id]`
  - `/driver/main/kyc/cars/[id]/edit`
- Full form: brand, name, specs, energy select, banner, min 2 gallery images, optional video (30 MB), registration/insurance/other docs
- KYC cars tab: grid with View / Edit / Delete links

## Deploy

- Push `dev` → CI builds web + functions → `deploy-bluegreen.sh dev`
- Run `ryvo-migrate` if seeds changed (048 already applied)
