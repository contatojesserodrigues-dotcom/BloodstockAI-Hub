
-- Drop overly permissive SELECT on offers (was exposing PII to authenticated users)
DROP POLICY IF EXISTS "Public read offers via view" ON public.marketplace_offers;

-- Recreate the view as SECURITY DEFINER (default) so it bypasses RLS and returns
-- only the anonymised columns to anon/authenticated.
DROP VIEW IF EXISTS public.marketplace_offers_public;
CREATE VIEW public.marketplace_offers_public AS
SELECT id, listing_id, offeror_initials, amount, created_at
FROM public.marketplace_offers;

GRANT SELECT ON public.marketplace_offers_public TO anon, authenticated;

-- Drop broad SELECT policies on storage buckets (public buckets are served by CDN; listing not needed)
DROP POLICY IF EXISTS "Public read marketplace photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read marketplace reports" ON storage.objects;
