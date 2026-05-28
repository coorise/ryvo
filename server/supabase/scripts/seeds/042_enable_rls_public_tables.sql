-- Enable RLS on public tables flagged by Supabase Security Advisor.
-- Most access is via service_role in edge functions (service_role bypasses RLS),
-- so enabling RLS here primarily protects PostgREST exposure for anon/authenticated.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'public.bonus_accounts',
    'public.spatial_ref_sys',
    'public.referral_campaign_joins',
    'public.driver_tariff_subscriptions',
    'public.checkout_recovery_reminders',
    'public.driver_tariff_packages',
    'public.driver_earnings',
    'public.security_auth_events',
    'public.admin_task_runs',
    'public.service_feedback',
    'public.admin_message_campaigns',
    'public.admin_tasks',
    'public.referral_campaigns',
    'public.referral_entries',
    'public.loyalty_points',
    'public.referral_settings',
    'public.driver_paychecks',
    'public.checkout_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', t);
    EXCEPTION
      WHEN undefined_table THEN
        -- Table might not exist in some environments
        NULL;
      WHEN insufficient_privilege THEN
        -- Some extension-owned tables (e.g. PostGIS `spatial_ref_sys`) can be owned by `supabase_admin`.
        -- Try again under that role when available.
        IF t = 'public.spatial_ref_sys' THEN
          BEGIN
            EXECUTE 'SET LOCAL ROLE supabase_admin';
            EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;';
          EXCEPTION
            WHEN others THEN
              RAISE NOTICE 'Skipping RLS enable on % (insufficient privileges)', t;
          END;
        ELSE
          RAISE NOTICE 'Skipping RLS enable on % (insufficient privileges)', t;
        END IF;
      WHEN others THEN
        RAISE NOTICE 'Skipping RLS enable on % (%)', t, SQLERRM;
    END;
  END LOOP;
END $$;

