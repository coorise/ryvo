-- Admin tasks scheduler (MVP)

CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  task_key text NOT NULL, -- whitelisted operation key
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_mode text NOT NULL CHECK (schedule_mode IN ('immediate', 'one_time', 'daily', 'weekly', 'monthly')),
  run_at timestamptz, -- for one_time
  time_of_day text, -- 'HH:MM' for daily/weekly/monthly
  day_of_week int, -- 0-6 (Sun=0) for weekly
  day_of_month int, -- 1-28 for monthly (keep safe)
  timezone text NOT NULL DEFAULT 'UTC',
  next_run_at timestamptz,
  paused_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_result jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_next_run
  ON public.admin_tasks (next_run_at)
  WHERE paused_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_task_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.admin_tasks(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb,
  error_message text
);

