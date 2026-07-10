
-- Add catalog_hash column to catalogues
ALTER TABLE public.catalogues ADD COLUMN IF NOT EXISTS catalog_hash text UNIQUE;

-- Create user_catalog_access table
CREATE TABLE IF NOT EXISTS public.user_catalog_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  catalog_id uuid NOT NULL REFERENCES public.catalogues(id) ON DELETE CASCADE,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, catalog_id)
);

-- Enable RLS
ALTER TABLE public.user_catalog_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own access records
CREATE POLICY "Users can view own catalog access"
  ON public.user_catalog_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own access records
CREATE POLICY "Users can insert own catalog access"
  ON public.user_catalog_access FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage catalog access"
  ON public.user_catalog_access FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_catalogues_catalog_hash ON public.catalogues(catalog_hash);
