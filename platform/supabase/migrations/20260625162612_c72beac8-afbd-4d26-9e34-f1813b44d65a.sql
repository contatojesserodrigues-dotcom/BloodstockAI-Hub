
ALTER TABLE public.inspection_blocks ADD COLUMN IF NOT EXISTS biomechanics_image_url TEXT;
ALTER TABLE public.inspection_blocks ADD COLUMN IF NOT EXISTS biomechanics_legend JSONB;
