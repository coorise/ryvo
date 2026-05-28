-- RLS policies for public tables that had RLS enabled without policies (Supabase lint 0008).
-- Access pattern: edge functions use service_role (bypasses RLS); policies gate PostgREST for anon/authenticated.

CREATE OR REPLACE FUNCTION public.auth_jwt_has_any_role(role_names text[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE COALESCE(
      (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ?| role_names,
      false
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.auth_jwt_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.auth_jwt_has_any_role(ARRAY[
    'super_admin', 'admin', 'staff', 'moderator', 'agent', 'support'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.auth_jwt_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.auth_jwt_has_any_role(ARRAY['super_admin', 'admin']);
$$;

REVOKE ALL ON FUNCTION public.auth_jwt_has_any_role(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_jwt_is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_jwt_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_jwt_has_any_role(text[]) TO authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.auth_jwt_is_staff() TO authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.auth_jwt_is_admin() TO authenticated, postgres, service_role;

-- Service / edge-function only (deny PostgREST; service_role bypasses RLS)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'audit_logs',
    'email_outbox',
    'idempotency_requests',
    'security_auth_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_service_only', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (false);',
      t || '_service_only',
      t
    );
  END LOOP;
END $$;

-- Staff portal (admin automation, messaging, tasks)
DROP POLICY IF EXISTS admin_message_campaigns_staff ON public.admin_message_campaigns;
CREATE POLICY admin_message_campaigns_staff ON public.admin_message_campaigns
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS admin_tasks_staff ON public.admin_tasks;
CREATE POLICY admin_tasks_staff ON public.admin_tasks
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS admin_task_runs_staff ON public.admin_task_runs;
CREATE POLICY admin_task_runs_staff ON public.admin_task_runs
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS checkout_recovery_reminders_access ON public.checkout_recovery_reminders;
CREATE POLICY checkout_recovery_reminders_access ON public.checkout_recovery_reminders
  FOR ALL USING (
    client_id = auth.uid() OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    client_id = auth.uid() OR public.auth_jwt_is_staff()
  );

-- RBAC catalog
DROP POLICY IF EXISTS roles_staff ON public.roles;
CREATE POLICY roles_staff ON public.roles
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_admin());

DROP POLICY IF EXISTS permissions_staff ON public.permissions;
CREATE POLICY permissions_staff ON public.permissions
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_admin());

DROP POLICY IF EXISTS role_permissions_staff ON public.role_permissions;
CREATE POLICY role_permissions_staff ON public.role_permissions
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_admin());

-- Config: read for signed-in users, writes for staff
DROP POLICY IF EXISTS referral_settings_read ON public.referral_settings;
CREATE POLICY referral_settings_read ON public.referral_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS referral_settings_staff_write ON public.referral_settings;
CREATE POLICY referral_settings_staff_write ON public.referral_settings
  FOR INSERT WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS referral_settings_staff_update ON public.referral_settings;
CREATE POLICY referral_settings_staff_update ON public.referral_settings
  FOR UPDATE
  USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS referral_settings_staff_delete ON public.referral_settings;
CREATE POLICY referral_settings_staff_delete ON public.referral_settings
  FOR DELETE USING (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS geofences_read ON public.geofences;
CREATE POLICY geofences_read ON public.geofences
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS geofences_staff_write ON public.geofences;
CREATE POLICY geofences_staff_write ON public.geofences
  FOR INSERT WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS geofences_staff_update ON public.geofences;
CREATE POLICY geofences_staff_update ON public.geofences
  FOR UPDATE
  USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS geofences_staff_delete ON public.geofences;
CREATE POLICY geofences_staff_delete ON public.geofences
  FOR DELETE USING (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS price_configs_read ON public.price_configs;
CREATE POLICY price_configs_read ON public.price_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS price_configs_staff_write ON public.price_configs;
CREATE POLICY price_configs_staff_write ON public.price_configs
  FOR INSERT WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS price_configs_staff_update ON public.price_configs;
CREATE POLICY price_configs_staff_update ON public.price_configs
  FOR UPDATE
  USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS price_configs_staff_delete ON public.price_configs;
CREATE POLICY price_configs_staff_delete ON public.price_configs
  FOR DELETE USING (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS coupons_read ON public.coupons;
CREATE POLICY coupons_read ON public.coupons
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS coupons_staff_mutate ON public.coupons;
CREATE POLICY coupons_staff_mutate ON public.coupons
  FOR ALL USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_tariff_packages_read ON public.driver_tariff_packages;
CREATE POLICY driver_tariff_packages_read ON public.driver_tariff_packages
  FOR SELECT USING (active = true OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_tariff_packages_staff_write ON public.driver_tariff_packages;
CREATE POLICY driver_tariff_packages_staff_write ON public.driver_tariff_packages
  FOR INSERT WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_tariff_packages_staff_update ON public.driver_tariff_packages;
CREATE POLICY driver_tariff_packages_staff_update ON public.driver_tariff_packages
  FOR UPDATE
  USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_tariff_packages_staff_delete ON public.driver_tariff_packages;
CREATE POLICY driver_tariff_packages_staff_delete ON public.driver_tariff_packages
  FOR DELETE USING (public.auth_jwt_is_staff());

-- User-owned rows
DROP POLICY IF EXISTS user_profiles_access ON public.user_profiles;
CREATE POLICY user_profiles_access ON public.user_profiles
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS device_tokens_self ON public.device_tokens;
CREATE POLICY device_tokens_self ON public.device_tokens
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS notifications_self ON public.notifications;
CREATE POLICY notifications_self ON public.notifications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gdpr_requests_self ON public.gdpr_requests;
CREATE POLICY gdpr_requests_self ON public.gdpr_requests
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS loyalty_points_self ON public.loyalty_points;
CREATE POLICY loyalty_points_self ON public.loyalty_points
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS bonus_accounts_self ON public.bonus_accounts;
CREATE POLICY bonus_accounts_self ON public.bonus_accounts
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS coupon_redemptions_self ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_self ON public.coupon_redemptions
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS referral_entries_participant ON public.referral_entries;
CREATE POLICY referral_entries_participant ON public.referral_entries
  FOR ALL USING (
    referrer_id = auth.uid()
    OR referee_id = auth.uid()
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    referrer_id = auth.uid()
    OR referee_id = auth.uid()
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS referral_campaigns_owner ON public.referral_campaigns;
CREATE POLICY referral_campaigns_owner ON public.referral_campaigns
  FOR ALL USING (referrer_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (referrer_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS referral_campaign_joins_participant ON public.referral_campaign_joins;
CREATE POLICY referral_campaign_joins_participant ON public.referral_campaign_joins
  FOR ALL USING (
    referee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.referral_campaigns c
      WHERE c.id = campaign_id AND c.referrer_id = auth.uid()
    )
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    referee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.referral_campaigns c
      WHERE c.id = campaign_id AND c.referrer_id = auth.uid()
    )
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS checkout_sessions_participant ON public.checkout_sessions;
CREATE POLICY checkout_sessions_participant ON public.checkout_sessions
  FOR ALL USING (
    client_id = auth.uid()
    OR driver_id = auth.uid()
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    client_id = auth.uid()
    OR driver_id = auth.uid()
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS driver_earnings_self ON public.driver_earnings;
CREATE POLICY driver_earnings_self ON public.driver_earnings
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_paychecks_self ON public.driver_paychecks;
CREATE POLICY driver_paychecks_self ON public.driver_paychecks
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_tariff_subscriptions_self ON public.driver_tariff_subscriptions;
CREATE POLICY driver_tariff_subscriptions_self ON public.driver_tariff_subscriptions
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS driver_location_samples_self ON public.driver_location_samples;
CREATE POLICY driver_location_samples_self ON public.driver_location_samples
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS vehicles_driver ON public.vehicles;
CREATE POLICY vehicles_driver ON public.vehicles
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS identity_verifications_driver ON public.identity_verifications;
CREATE POLICY identity_verifications_driver ON public.identity_verifications
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS shifts_driver ON public.shifts;
CREATE POLICY shifts_driver ON public.shifts
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS payouts_driver ON public.payouts;
CREATE POLICY payouts_driver ON public.payouts
  FOR ALL USING (driver_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (driver_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS payment_intents_rider ON public.payment_intents;
CREATE POLICY payment_intents_rider ON public.payment_intents
  FOR ALL USING (rider_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (rider_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS support_tickets_owner ON public.support_tickets;
CREATE POLICY support_tickets_owner ON public.support_tickets
  FOR ALL USING (user_id = auth.uid() OR public.auth_jwt_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS ticket_messages_participant ON public.ticket_messages;
CREATE POLICY ticket_messages_participant ON public.ticket_messages
  FOR ALL USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS ratings_reviews_participant ON public.ratings_reviews;
CREATE POLICY ratings_reviews_participant ON public.ratings_reviews
  FOR ALL USING (
    reviewer_id = auth.uid()
    OR reviewee_id = auth.uid()
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS service_feedback_author ON public.service_feedback;
CREATE POLICY service_feedback_author ON public.service_feedback
  FOR SELECT USING (author_id = auth.uid() OR public.auth_jwt_is_staff());

DROP POLICY IF EXISTS service_feedback_insert ON public.service_feedback;
CREATE POLICY service_feedback_insert ON public.service_feedback
  FOR INSERT WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

DROP POLICY IF EXISTS service_feedback_staff_manage ON public.service_feedback;
CREATE POLICY service_feedback_staff_manage ON public.service_feedback
  FOR UPDATE USING (public.auth_jwt_is_staff())
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS service_feedback_staff_delete ON public.service_feedback;
CREATE POLICY service_feedback_staff_delete ON public.service_feedback
  FOR DELETE USING (public.auth_jwt_is_staff());

-- Trip-linked data
DROP POLICY IF EXISTS trip_assignments_participant ON public.trip_assignments;
CREATE POLICY trip_assignments_participant ON public.trip_assignments
  FOR ALL USING (
    driver_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.trip_requests tr
      WHERE tr.id = request_id AND tr.rider_id = auth.uid()
    )
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (
    driver_id = auth.uid()
    OR public.auth_jwt_is_staff()
  );

DROP POLICY IF EXISTS fare_breakdowns_participant ON public.fare_breakdowns;
CREATE POLICY fare_breakdowns_participant ON public.fare_breakdowns
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_id
        AND (t.rider_id = auth.uid() OR t.driver_id = auth.uid())
    )
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (public.auth_jwt_is_staff());

DROP POLICY IF EXISTS refunds_participant ON public.refunds;
CREATE POLICY refunds_participant ON public.refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.payment_intents pi
      WHERE pi.id = payment_intent_id
        AND pi.rider_id = auth.uid()
    )
    OR public.auth_jwt_is_staff()
  )
  WITH CHECK (public.auth_jwt_is_staff());
