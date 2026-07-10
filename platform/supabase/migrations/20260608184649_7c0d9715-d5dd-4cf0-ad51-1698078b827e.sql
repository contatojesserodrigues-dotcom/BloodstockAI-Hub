CREATE POLICY "Users can update own files in pdf-uploads"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'pdf-uploads' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'pdf-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);