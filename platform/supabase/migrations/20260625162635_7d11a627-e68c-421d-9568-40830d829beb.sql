
DO $$ BEGIN
  CREATE POLICY "Authenticated read biomechanics"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-biomechanics');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
