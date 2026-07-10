
CREATE POLICY "Users read own broodmare reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'broodmare-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own broodmare reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'broodmare-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own broodmare reports"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'broodmare-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own broodmare reports"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'broodmare-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
