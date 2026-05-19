-- Soft-delete support for admin user/staff/driver removal
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at
  ON public.user_profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.deleted_at IS 'Set for temporary (soft) admin deletion; hidden from default lists.';
COMMENT ON COLUMN public.user_profiles.deleted_by IS 'Admin user who performed soft delete.';
