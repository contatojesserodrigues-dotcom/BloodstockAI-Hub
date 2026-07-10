-- Storage bucket policies for catalogues
CREATE POLICY "Users can upload catalogues"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'catalogues');

CREATE POLICY "Service role reads catalogues"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'catalogues');

-- Helper function for atomic increment (replace existing)
CREATE OR REPLACE FUNCTION public.increment_processed_lots(
  catalogue_id_input UUID,
  amount INTEGER
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE catalogues 
  SET processed_lots = COALESCE(processed_lots, 0) + amount,
      updated_at = NOW()
  WHERE id = catalogue_id_input;
$$;