ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);