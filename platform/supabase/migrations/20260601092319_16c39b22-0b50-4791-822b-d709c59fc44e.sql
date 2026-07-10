
DROP VIEW IF EXISTS public.marketplace_offers_public;

CREATE OR REPLACE FUNCTION public.get_public_offers(_listing_id uuid)
RETURNS TABLE (
  id uuid,
  listing_id uuid,
  offeror_initials text,
  amount integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, listing_id, offeror_initials, amount, created_at
  FROM public.marketplace_offers
  WHERE listing_id = _listing_id
  ORDER BY created_at DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.get_public_offers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_offers(uuid) TO anon, authenticated;
