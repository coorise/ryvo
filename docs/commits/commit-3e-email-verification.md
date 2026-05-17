# Commit 3e — Email verification & SMTP

## SMTP (Supabase GoTrue)

Configured in `server/supabase/.env` (see `.env.example`):

| Setting | Value |
|---------|--------|
| Host | `smtp.freesmtpservers.com` |
| Port | `25` |
| Auth | none (`SMTP_USER` / `SMTP_PASS` empty) |
| From | `no-reply@ryvo-line.com` |
| Confirmation OTP | `MAILER_OTP_EXP=1800` (30 minutes) |
| Auto-confirm | `ENABLE_EMAIL_AUTOCONFIRM=false` |

GoTrue sends **signup confirmation** emails automatically when users register.

## Welcome email (Ryvo background worker)

- DB trigger `on_auth_user_welcome_email` → `email_outbox`
- `email-worker` drains outbox every 10s via `nodemailer`
- Admin-editable template `welcome` in `email_templates` with placeholders `{user.name}`, `{user.email}`

## Access control

- JWT claims: `email_verified` / `is_email_verified` (from `custom_access_token_hook`)
- **Admin / super_admin**: bypass verification
- **Admin override**: `PATCH .../auth-hooks/v1/admin/users/:id/email-verified` with `{ "is_email_verified": true|false }`
- Protected APIs use `requireVerifiedEmail: true` (trip, location, payment, …)
- `/profile-service/v1/me` and `/auth-hooks/v1/auth/email-status` work before verify

## APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `auth-hooks/v1/auth/email-status` | Current verification state |
| POST | `auth-hooks/v1/auth/resend-confirmation` | Resend GoTrue signup email |
| GET | `auth-hooks/v1/admin/email-templates` | List templates |
| PUT | `auth-hooks/v1/admin/email-templates/:key` | Update template |
| PATCH | `auth-hooks/v1/admin/users/:user_id/email-verified` | Manual verify flag |

## SQL

`012_email_auth.sql` — templates, outbox, override column, hook update, permissions.
