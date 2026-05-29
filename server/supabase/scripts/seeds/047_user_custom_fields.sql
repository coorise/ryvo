-- Extensible key/value metadata on any user profile (admin-managed fallback fields).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_profiles.custom_fields IS
  'Admin-editable string key/value pairs; extensible without schema migrations.';
