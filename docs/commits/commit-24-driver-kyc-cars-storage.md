# Commit 24 — Driver KYC upload, Know Your Car, storage profile

## Database (`048_driver_vehicles_kyc.sql`)

- Extended `vehicles` — brand, name, speed, age, tyres, carbon, energy, banner/images/video, approval status
- New `vehicle_documents` — registration, insurance, optional other
- `driver_profiles.active_vehicle_id` — current approved car for rides

## Backend

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/documents/:doc_type/view-url` | Driver views own KYC file (signed URL) |
| `POST /v1/submit` | Upload/resubmit → status `pending` until staff approves |
| `GET/POST/PATCH/DELETE /v1/vehicles` | Driver car CRUD |
| `POST /v1/vehicles/:id/documents` | Car doc upload |
| `PATCH /v1/me/active-vehicle` | Set active approved car |
| `POST /v1/admin/vehicles/:id/review` | Staff approve/reject car |

Shared: `_shared/lib/driver-vehicles.ts`

## Driver portal (`client/web/ryvo`)

- **Driver KYC** tab layout: **You** (View + Update docs via storage) | **Your cars** (add/edit/delete, registration/insurance/banner upload)
- **Profile** — avatar file upload + active car dropdown (approved cars only)
- **Client → Drivers** — view driver profile, active car, reviews

## Admin (`client/web/ryvo_admin`)

- Driver detail tabs: **Driver** (KYC docs approve/reject) | **Driver's cars** (vehicle approve/reject, doc view)

## Storage

- `storageService.uploadFile()` — used for KYC, car docs, profile avatar (PNG/PDF/images)

## Still TODO

- Multi-image (min 2) + optional 30s video on car form
- Client rate driver from profile dialog (API exists on completed trips)
- Filter personal vs legacy vehicle doc types on old `kyc_documents` rows
