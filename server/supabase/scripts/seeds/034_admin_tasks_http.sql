-- Make admin tasks interactive HTTP workflows

ALTER TABLE public.admin_tasks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'preset' CHECK (kind IN ('preset','http')),
  ADD COLUMN IF NOT EXISTS request_method text,
  ADD COLUMN IF NOT EXISTS request_path text,
  ADD COLUMN IF NOT EXISTS request_query jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS request_body jsonb;

