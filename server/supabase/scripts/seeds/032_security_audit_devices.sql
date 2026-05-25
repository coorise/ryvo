-- Security auth events + enriched device sessions for admin audits

CREATE TABLE IF NOT EXISTS public.security_auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_label text,
  ip inet,
  country_code text,
  mfa_used boolean,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_auth_events_created
  ON public.security_auth_events (created_at DESC);

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS ip_last inet,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id);

INSERT INTO public.permissions (name, description) VALUES
  ('audit:update', 'Revoke user devices and manage security sessions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name = 'audit:update'
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- Demo auth events (idempotent by count)
DO $$
BEGIN
  IF (SELECT count(*) FROM public.security_auth_events) = 0 THEN
    INSERT INTO public.security_auth_events (severity, event_type, actor_label, ip, country_code, mfa_used, details, created_at)
    VALUES
      ('critical', 'login_failed', 'user_2284', '24.225.111.40', 'CA', false, '6 failed attempts in 8 min', now() - interval '2 hours'),
      ('warning', 'login_failed', 'user_2284', '24.225.111.40', 'CA', false, 'Incorrect password', now() - interval '3 hours'),
      ('critical', 'sos', 'driver_8800', '10.0.12.44', 'CA', true, 'SOS triggered ride R-7820', now() - interval '4 hours'),
      ('info', 'token_refresh', 'admin@ryvo.ca', '192.168.1.10', 'CA', true, 'Session renewed', now() - interval '5 hours'),
      ('warning', 'permission_change', 'admin@ryvo.ca', '192.168.1.10', 'CA', true, 'Promotion role: support_lead -> admin', now() - interval '6 hours'),
      ('warning', 'rate_limit', 'user_9912', '203.0.113.55', 'US', false, 'API throttle on /auth/login', now() - interval '7 hours'),
      ('info', 'data_export', 'admin@ryvo.ca', '192.168.1.10', 'CA', true, 'Export PII user user_2284', now() - interval '8 hours'),
      ('info', 'config_change', 'admin@ryvo.ca', '192.168.1.10', 'CA', true, 'Platform preferences updated', now() - interval '9 hours');
  END IF;
END $$;

-- Demo devices for existing auth users
INSERT INTO public.device_tokens (user_id, token, platform, device_name, os_version, app_version, ip_last, country_code, last_seen_at)
SELECT
  u.id,
  'seed-' || substr(u.id::text, 1, 12),
  (ARRAY['ios', 'android', 'web'])[1 + (row_number() OVER () % 3)],
  (ARRAY['iPhone 15 Pro', 'Pixel 8', 'Chrome on macOS'])[1 + (row_number() OVER () % 3)],
  (ARRAY['iOS 18.1', 'Android 15', 'macOS 14'])[1 + (row_number() OVER () % 3)],
  '1.2.0',
  ('10.0.0.' || (10 + (row_number() OVER () % 200)))::inet,
  'CA',
  now() - (row_number() OVER ()) * interval '1 hour'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.device_tokens d WHERE d.user_id = u.id AND d.token LIKE 'seed-%'
)
LIMIT 8;
