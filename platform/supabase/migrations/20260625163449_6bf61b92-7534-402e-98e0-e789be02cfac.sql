
-- Per-user folder access policies for training-* buckets.
CREATE POLICY "training buckets - user owns folder"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id IN ('training-videos','training-gps','training-reports','training-horse-photos')
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id IN ('training-videos','training-gps','training-reports','training-horse-photos')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Security finding: lock down internal_notes column on marketplace_listings.
REVOKE SELECT (internal_notes) ON public.marketplace_listings FROM anon, authenticated;
