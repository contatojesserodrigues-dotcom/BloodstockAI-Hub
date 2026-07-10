
DROP POLICY IF EXISTS "Authenticated read biomechanics" ON storage.objects;

CREATE POLICY "Owner read biomechanics"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-biomechanics'
  AND EXISTS (
    SELECT 1 FROM public.inspection_analyses ia
    WHERE ia.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ia.id::text
  )
);
