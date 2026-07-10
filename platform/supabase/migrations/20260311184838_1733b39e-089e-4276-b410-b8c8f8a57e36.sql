
-- Add columns to catalogues for chunked processing
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS storage_url TEXT;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS file_size_mb INTEGER;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS processed_chunks INTEGER DEFAULT 0;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS processed_lots INTEGER DEFAULT 0;
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploading';
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add enrichment columns to catalogue_lots
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS pedigree_raw TEXT;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS pedigree_g2 JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS pedigree_g3 JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS pedigree_g4 JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS pedigree_complete JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS siblings_full JSONB DEFAULT '[]';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS sire_profile JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS dam_profile JSONB DEFAULT '{}';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS inbreeding_coefficient NUMERIC;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS dosage_di NUMERIC;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS nick_rating TEXT;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS overall_score INTEGER;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS lot_status TEXT DEFAULT 'extracted';
ALTER TABLE public.catalogue_lots ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;

-- Create catalogues storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalogues', 'catalogues', false, 524288000, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to catalogues bucket
CREATE POLICY "Authenticated users can upload catalogues" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalogues');

-- RLS: authenticated users can read own catalogues  
CREATE POLICY "Users can read own catalogues" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'catalogues');

-- RLS: service role can read all catalogues (for edge functions)
CREATE POLICY "Service can manage catalogues" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'catalogues');

-- Helper function for atomic increment of processed_lots
CREATE OR REPLACE FUNCTION public.increment_catalogue_lots(cat_id UUID, amount INTEGER)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE catalogues 
  SET processed_lots = processed_lots + amount,
      updated_at = now()
  WHERE id = cat_id;
$$;
