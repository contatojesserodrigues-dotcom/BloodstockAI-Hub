REVOKE SELECT (internal_notes) ON public.marketplace_listings FROM anon;
REVOKE SELECT (internal_notes) ON public.marketplace_listings FROM authenticated;
GRANT SELECT (internal_notes) ON public.marketplace_listings TO service_role;

DROP POLICY IF EXISTS "Anyone can read offer pulses" ON public.marketplace_offer_events;
CREATE POLICY "Authenticated can read offer pulses for visible listings"
ON public.marketplace_offer_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings l
    WHERE l.id = marketplace_offer_events.listing_id
      AND l.status IN ('active','sold')
  )
);

CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

CREATE POLICY "Block client writes to search cache (insert)"
ON public.search_cache_v2
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client writes to search cache (update)"
ON public.search_cache_v2
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block client writes to search cache (delete)"
ON public.search_cache_v2
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);