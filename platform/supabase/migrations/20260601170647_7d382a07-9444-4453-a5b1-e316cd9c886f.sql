GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
GRANT INSERT ON public.marketplace_offers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.marketplace_offers TO authenticated;
GRANT ALL ON public.marketplace_offers TO service_role;