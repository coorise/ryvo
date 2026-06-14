-- Remove bootstrap placeholder KYC rows (seed/*, pending/*) so status reflects real uploads only.
DELETE FROM public.kyc_documents
WHERE s3_key LIKE 'seed/%'
   OR s3_key LIKE 'pending/%';

UPDATE public.driver_profiles dp
SET kyc_status = 'pending'
WHERE kyc_status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM public.kyc_documents kd
    WHERE kd.driver_id = dp.user_id
      AND kd.status = 'approved'
      AND kd.s3_key IS NOT NULL
      AND kd.s3_key NOT LIKE 'seed/%'
      AND kd.s3_key NOT LIKE 'pending/%'
  );
