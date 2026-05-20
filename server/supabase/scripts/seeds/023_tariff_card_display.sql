-- Tariff package card appearance (background + corner badge)

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS card_display jsonb NOT NULL DEFAULT jsonb_build_object(
    'background_color', null,
    'badge', jsonb_build_object(
      'enabled', false,
      'position', 'top_right',
      'kind', 'text',
      'text', 'NEW',
      'text_background_color', '#16a34a',
      'blink', true,
      'image_path', null
    )
  );

UPDATE public.driver_tariff_packages
SET card_display = jsonb_build_object(
  'background_color', null,
  'badge', jsonb_build_object(
    'enabled', false,
    'position', 'top_right',
    'kind', 'text',
    'text', 'NEW',
    'text_background_color', '#16a34a',
    'blink', true,
    'image_path', null
  )
)
WHERE card_display IS NULL;
