-- Platform-wide admin settings (singleton row)

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'default',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_read ON public.platform_settings;
CREATE POLICY platform_settings_read ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS platform_settings_admin_write ON public.platform_settings;
CREATE POLICY platform_settings_admin_write ON public.platform_settings
  FOR ALL USING (public.has_role('admin') OR public.has_role('super_admin'));

INSERT INTO public.platform_settings (id, preferences)
VALUES (
  'default',
  jsonb_build_object(
    'appName', 'Ryvo-Line',
    'timeZone', 'America/Toronto',
    'defaultLanguage', 'en',
    'supportedLanguages', jsonb_build_array('en', 'fr', 'es', 'zh', 'de'),
    'currency', 'CAD',
    'country', 'CA'
  )
)
ON CONFLICT (id) DO NOTHING;
