-- Settings hub: self-service profile fields, payment & notification config, granular permissions

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS bio text;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_idx
  ON public.user_profiles (lower(username))
  WHERE username IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id text PRIMARY KEY DEFAULT 'default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_settings_admin ON public.payment_settings;
CREATE POLICY payment_settings_admin ON public.payment_settings
  FOR ALL USING (public.has_role('admin') OR public.has_role('super_admin'));

DROP POLICY IF EXISTS notification_settings_admin ON public.notification_settings;
CREATE POLICY notification_settings_admin ON public.notification_settings
  FOR ALL USING (public.has_role('admin') OR public.has_role('super_admin'));

INSERT INTO public.payment_settings (id, config)
VALUES (
  'default',
  jsonb_build_object(
    'currency', 'CAD',
    'stripeMode', 'test',
    'platformFeePercent', 20,
    'driverPayoutDelayDays', 2,
    'minTripFare', 5.0,
    'cancellationFee', 5.0,
    'autoCapture', true,
    'tipsEnabled', true,
    'requirePreauth', true
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notification_settings (id, config)
VALUES (
  'default',
  jsonb_build_object(
    'events', jsonb_build_array(
      jsonb_build_object('key', 'ride.requested', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', false, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', true, 'staff', false)),
      jsonb_build_object('key', 'ride.accepted', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', false, 'staff', false)),
      jsonb_build_object('key', 'ride.driver_arriving', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', false, 'sms', true), 'audiences', jsonb_build_object('client', true, 'driver', false, 'staff', false)),
      jsonb_build_object('key', 'ride.completed', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', true, 'staff', false)),
      jsonb_build_object('key', 'ride.cancelled', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', true, 'staff', true)),
      jsonb_build_object('key', 'payment.succeeded', 'enabled', true, 'channels', jsonb_build_object('push', false, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', false, 'staff', false)),
      jsonb_build_object('key', 'payment.failed', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', false, 'staff', true)),
      jsonb_build_object('key', 'driver.kyc.approved', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', false, 'driver', true, 'staff', false)),
      jsonb_build_object('key', 'driver.kyc.rejected', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', false, 'driver', true, 'staff', false)),
      jsonb_build_object('key', 'support.reply', 'enabled', true, 'channels', jsonb_build_object('push', true, 'email', true, 'sms', false), 'audiences', jsonb_build_object('client', true, 'driver', true, 'staff', false))
    )
  )
)
ON CONFLICT (id) DO NOTHING;

-- Granular settings permissions (Profile tab needs no permission — any authenticated admin user)
INSERT INTO public.permissions (name, description) VALUES
  ('settings:payment:read', 'View payment provider and fare settings'),
  ('settings:payment:update', 'Update payment settings'),
  ('settings:mail:read', 'View email templates'),
  ('settings:mail:update', 'Edit email templates'),
  ('settings:notifications:read', 'View notification routing rules'),
  ('settings:notifications:update', 'Update notification routing rules')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'settings:payment:read', 'settings:payment:update',
  'settings:mail:read', 'settings:mail:update',
  'settings:notifications:read', 'settings:notifications:update'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Transactional email templates (admin-editable)
INSERT INTO public.email_templates (template_key, subject, body_html, body_text)
VALUES
(
  'driver_welcome',
  'Welcome to Ryvo Driver, {user.name}!',
  '<p>Hi {user.name},</p><p>Your driver account is ready. Complete KYC in the app to start accepting rides.</p><p>— Ryvo</p>',
  'Hi {user.name}, your driver account is ready. Complete KYC to start accepting rides.'
),
(
  'ride_receipt',
  'Your Ryvo receipt — {trip.id}',
  '<p>Hi {user.name},</p><p>Thanks for riding with Ryvo. Trip <strong>{trip.id}</strong> total: <strong>{payment.amount} {payment.currency}</strong>.</p><p>— Ryvo</p>',
  'Thanks for your ride. Trip {trip.id} total: {payment.amount} {payment.currency}.'
),
(
  'order_success',
  'Ride completed — {trip.id}',
  '<p>Hi {user.name},</p><p>Your ride to {trip.dropoff} is complete. Rate your driver in the app.</p><p>— Ryvo</p>',
  'Your ride to {trip.dropoff} is complete. Rate your driver in the app.'
)
ON CONFLICT (template_key) DO NOTHING;
