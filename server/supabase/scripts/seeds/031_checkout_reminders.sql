-- Checkout recovery reminders + admin delete/update permission

CREATE TABLE IF NOT EXISTS public.checkout_recovery_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id uuid NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  send_email boolean NOT NULL DEFAULT true,
  send_push boolean NOT NULL DEFAULT true,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_recovery_reminders_due
  ON public.checkout_recovery_reminders (send_at)
  WHERE status = 'pending';

INSERT INTO public.permissions (name, description) VALUES
  ('finances:checkouts:update', 'Delete checkout sessions and schedule recovery reminders')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name = 'finances:checkouts:update'
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;
