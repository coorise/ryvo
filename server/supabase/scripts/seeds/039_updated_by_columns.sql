-- Track who last changed admin-managed records (email resolved via admin_user_emails RPC)

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.admin_message_campaigns
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.referral_campaigns
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.driver_paychecks
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id);

CREATE OR REPLACE FUNCTION public.admin_user_emails(p_ids uuid[])
RETURNS TABLE (id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE cardinality(p_ids) > 0 AND u.id = ANY (p_ids);
$$;

REVOKE ALL ON FUNCTION public.admin_user_emails(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_emails(uuid[]) TO service_role;
