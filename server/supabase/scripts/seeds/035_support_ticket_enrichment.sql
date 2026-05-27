-- Admin chat support: levels, priority, assignee; message role for bubble styling
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS support_level smallint NOT NULL DEFAULT 1;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users (id);

DO $$
BEGIN
  ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_support_level_check CHECK (support_level >= 1 AND support_level <= 3);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_priority_check CHECK (
      priority IN ('low', 'medium', 'high', 'critical')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.ticket_messages
  ADD COLUMN IF NOT EXISTS message_kind text;

COMMENT ON COLUMN public.ticket_messages.message_kind IS 'Optional: user|staff|ai|system. When null, inferred from sender vs ticket requester.';
