-- pdf-uploads bucket: single PDF analysis, breeze frames, and related uploads.
-- Policies existed in 20260204170256 but the bucket row was never created.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-uploads',
  'pdf-uploads',
  false,
  62914560,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Edge functions (upload-pdf, ai-analysis) use service_role for storage I/O.
DO $$ BEGIN
  CREATE POLICY "Service role manages pdf-uploads"
    ON storage.objects FOR ALL TO service_role
    USING (bucket_id = 'pdf-uploads')
    WITH CHECK (bucket_id = 'pdf-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
