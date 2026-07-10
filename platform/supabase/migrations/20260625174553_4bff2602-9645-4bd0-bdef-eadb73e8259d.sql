
ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS pedigree_pdf_url text,
  ADD COLUMN IF NOT EXISTS pedigree_pdf_name text,
  ADD COLUMN IF NOT EXISTS pedigree_insight text,
  ADD COLUMN IF NOT EXISTS pedigree_summary jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_generated_at timestamptz;
