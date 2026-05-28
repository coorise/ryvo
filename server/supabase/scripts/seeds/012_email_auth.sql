-- Email templates, outbox, admin override, JWT claims, welcome on signup

CREATE TABLE IF NOT EXISTS public.email_templates (
  template_key text PRIMARY KEY,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  template_key text NOT NULL REFERENCES public.email_templates(template_key),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON public.email_outbox(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_verified_override boolean;

COMMENT ON COLUMN public.user_profiles.email_verified_override IS
  'NULL = use auth.users.email_confirmed_at; true/false = admin manual override';

-- Default templates (admin can edit via API)
INSERT INTO public.email_templates (template_key, subject, body_html, body_text)
VALUES (
  'welcome',
  'Welcome to Ryvo, {user.name}!',
  '<p>Hello {user.name},</p><p>Welcome to <strong>Ryvo</strong>. Your account is ready.</p><p>Please confirm your email using the link we sent separately. That link is valid for 30 minutes.</p><p>— The Ryvo team</p>',
  'Hello {user.name}, Welcome to Ryvo. Please confirm your email using the link we sent (valid 30 minutes). — The Ryvo team'
),
(
  'email_confirmation_reminder',
  'Confirm your Ryvo email',
  '<p>Hi {user.name},</p><p>Please confirm your email to unlock all Ryvo features.</p><p>— Ryvo</p>',
  'Hi {user.name}, please confirm your email to unlock all Ryvo features.'
)
ON CONFLICT (template_key) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
  ('email:templates', 'Manage email templates'),
  ('users:verify_email', 'Set user email verified flag')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('email:templates', 'users:verify_email')
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_admin ON public.email_templates;
CREATE POLICY email_templates_admin ON public.email_templates
  FOR ALL USING (public.has_role('admin') OR public.has_role('super_admin'));

-- Enqueue welcome email when a new auth user is created
CREATE OR REPLACE FUNCTION public.enqueue_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  user_email text;
BEGIN
  user_email := NEW.email;
  user_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  IF user_email IS NOT NULL THEN
    INSERT INTO public.email_outbox (user_id, to_email, template_key, payload)
    VALUES (
      NEW.id,
      user_email,
      'welcome',
      jsonb_build_object('user.name', user_name, 'user.email', user_email)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_welcome_email ON auth.users;
CREATE TRIGGER on_auth_user_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_welcome_email();

REVOKE ALL ON FUNCTION public.enqueue_welcome_email() FROM PUBLIC, anon, authenticated;

-- JWT: email_verified + is_email_verified (admin bypass)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  claims jsonb;
  role_names text[];
  perm_names text[];
  primary_role text;
  confirmed_at timestamptz;
  override_flag boolean;
  is_verified boolean;
BEGIN
  uid := (event->>'user_id')::uuid;
  claims := coalesce(event->'claims', '{}'::jsonb);

  SELECT coalesce(array_agg(r.name ORDER BY r.name), ARRAY[]::text[])
  INTO role_names
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = uid;

  SELECT coalesce(array_agg(DISTINCT p.name ORDER BY p.name), ARRAY[]::text[])
  INTO perm_names
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role_id = ur.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = uid;

  primary_role := CASE
    WHEN 'super_admin' = ANY(role_names) THEN 'super_admin'
    WHEN 'admin' = ANY(role_names) THEN 'admin'
    WHEN 'staff' = ANY(role_names) THEN 'staff'
    WHEN 'moderator' = ANY(role_names) THEN 'moderator'
    WHEN 'driver' = ANY(role_names) THEN 'driver'
    ELSE 'client'
  END;

  SELECT u.email_confirmed_at, up.email_verified_override
  INTO confirmed_at, override_flag
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  WHERE u.id = uid;

  is_verified := ('super_admin' = ANY(role_names) OR 'admin' = ANY(role_names));
  IF NOT is_verified THEN
    IF override_flag IS NOT NULL THEN
      is_verified := override_flag;
    ELSE
      is_verified := confirmed_at IS NOT NULL;
    END IF;
  END IF;

  claims := jsonb_set(claims, '{app_role}', to_jsonb(primary_role), true);
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
        'roles', role_names,
        'permissions', perm_names,
        'email_verified', is_verified,
        'is_email_verified', is_verified
      ),
    true
  );
  claims := jsonb_set(claims, '{email_verified}', to_jsonb(is_verified), true);
  claims := jsonb_set(claims, '{is_email_verified}', to_jsonb(is_verified), true);

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Admin manual verify (API enforces admin role; called with service_role)
CREATE OR REPLACE FUNCTION public.admin_set_email_verified(p_user_id uuid, p_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email_verified_override)
  VALUES (p_user_id, p_verified)
  ON CONFLICT (user_id) DO UPDATE SET email_verified_override = p_verified;

  UPDATE auth.users
  SET email_confirmed_at = CASE WHEN p_verified THEN coalesce(email_confirmed_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_email_verified(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_email_verified(uuid, boolean) TO service_role;
