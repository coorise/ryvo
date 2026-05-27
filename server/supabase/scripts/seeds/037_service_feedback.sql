-- Structured service feedback (post-ride, post-support, in-app) for admin analytics
CREATE TABLE IF NOT EXISTS public.service_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('product', 'driver', 'staff')),
  source text NOT NULL CHECK (source IN ('post_ride', 'post_support', 'in_app')),
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  author_role text CHECK (author_role IN ('client', 'driver', 'staff')),
  subject_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  subject_label text,
  trip_id uuid REFERENCES public.trips (id) ON DELETE SET NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  tags text[] NOT NULL DEFAULT '{}',
  is_litige boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_feedback_category_created_idx
  ON public.service_feedback (category, created_at DESC);

CREATE INDEX IF NOT EXISTS service_feedback_litige_idx
  ON public.service_feedback (is_litige)
  WHERE is_litige = true;

-- Demo rows (skipped when table already has data)
DO $$
DECLARE
  i int;
  cat text;
  st smallint;
  tags text[];
  lbl text;
  cm text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.service_feedback LIMIT 1) THEN
    RETURN;
  END IF;

  FOR i IN 0..119 LOOP
    cat := (ARRAY['product', 'driver', 'staff'])[1 + (i % 3)];
    st := (1 + (i % 5))::smallint;
    lbl := NULL;
    tags := '{}';

    IF cat = 'product' THEN
      tags := ARRAY[
        (ARRAY['pricing', 'ux', 'booking', 'gps', 'payments'])[1 + (i % 5)]
      ];
      cm := (ARRAY[
        'Fares feel too high for short trips',
        'Booking flow is confusing after update',
        'App crashed during payment',
        'ETA was inaccurate',
        'Promo code did not apply'
      ])[1 + (i % 5)];
    ELSIF cat = 'driver' THEN
      lbl := 'Driver ' || (1 + (i % 8))::text;
      tags := ARRAY['behaviour', 'safety', 'route'];
      cm := (ARRAY[
        'Driver was rude at pickup',
        'Unsafe driving on highway',
        'Long detour without asking',
        'Vehicle did not match profile',
        'Request to ban this driver'
      ])[1 + (i % 5)];
    ELSE
      lbl := 'Agent ' || (1 + (i % 6))::text;
      tags := ARRAY['response_time', 'resolution', 'tone'];
      cm := (ARRAY[
        'Ticket closed without resolution',
        'Agent was dismissive',
        'Great help, very fast',
        'Escalation ignored for 3 days',
        'Wrong information about refund'
      ])[1 + (i % 5)];
    END IF;

    INSERT INTO public.service_feedback (
      category,
      source,
      author_role,
      stars,
      comment,
      tags,
      is_litige,
      subject_label,
      created_at
    )
    VALUES (
      cat,
      CASE
        WHEN i % 7 = 0 THEN 'post_support'
        WHEN i % 4 = 0 THEN 'in_app'
        ELSE 'post_ride'
      END,
      CASE WHEN i % 6 = 0 THEN 'driver' ELSE 'client' END,
      st,
      cm,
      tags,
      (cat = 'staff' AND st <= 2 AND i % 9 = 0) OR (cat = 'driver' AND st = 1 AND i % 11 = 0),
      lbl,
      now() - ((120 - i) * interval '8 hours')
    );
  END LOOP;
END $$;
