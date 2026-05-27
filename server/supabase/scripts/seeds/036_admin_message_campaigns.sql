-- Admin communication message history (campaign drafts/sends)
CREATE TABLE IF NOT EXISTS public.admin_message_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  audience text NOT NULL CHECK (audience IN ('clients', 'drivers', 'all')),
  body_template text NOT NULL,
  send_push boolean NOT NULL DEFAULT true,
  send_email boolean NOT NULL DEFAULT false,
  delay_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'cancelled')),
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_message_campaigns_created_at_idx
  ON public.admin_message_campaigns (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_message_campaigns_audience_idx
  ON public.admin_message_campaigns (audience);

