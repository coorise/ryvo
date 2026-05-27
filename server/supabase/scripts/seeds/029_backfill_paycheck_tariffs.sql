-- Link legacy paychecks to the driver's active tariff package

UPDATE public.driver_paychecks pc
SET tariff_package_id = sub.tariff_package_id
FROM public.driver_tariff_subscriptions sub
WHERE pc.tariff_package_id IS NULL
  AND sub.driver_id = pc.driver_id
  AND sub.status = 'active';
