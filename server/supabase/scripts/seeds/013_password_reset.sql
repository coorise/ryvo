-- Password reset via email OTP (6 digits)

CREATE TABLE IF NOT EXISTS public.password_reset_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp_hash text NOT NULL,
  reset_token_hash text,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_challenges_email_idx
  ON public.password_reset_challenges(lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS password_reset_challenges_active_idx
  ON public.password_reset_challenges(email)
  WHERE consumed_at IS NULL;

ALTER TABLE public.password_reset_challenges ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions use service role)
DROP POLICY IF EXISTS password_reset_service ON public.password_reset_challenges;
CREATE POLICY password_reset_service ON public.password_reset_challenges
  FOR ALL USING (false);

INSERT INTO public.email_templates (template_key, subject, body_html, body_text)
VALUES (
  'password_reset_otp',
  'Your Ryvo password reset code',
  '<p>Hi {user.name},</p><p>Your password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">{otp.code}</p><p>This code expires in {otp.expires_minutes} minutes. If you did not request this, ignore this email.</p><p>— Ryvo</p>',
  'Hi {user.name}, your Ryvo password reset code is {otp.code}. Expires in {otp.expires_minutes} minutes.'
)
ON CONFLICT (template_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
