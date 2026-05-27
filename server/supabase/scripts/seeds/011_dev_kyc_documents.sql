-- Approve required KYC documents for drivers already marked approved (local dev / E2E)
INSERT INTO public.kyc_documents (driver_id, doc_type, s3_key, status)
SELECT dp.user_id, t, 'seed/dev/' || t, 'approved'
FROM public.driver_profiles dp
CROSS JOIN unnest(ARRAY['national_id', 'selfie_with_id', 'driver_license', 'bank_statement']::text[]) AS t
WHERE dp.kyc_status = 'approved'
ON CONFLICT (driver_id, doc_type) DO UPDATE
  SET status = 'approved', s3_key = EXCLUDED.s3_key;
