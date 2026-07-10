DROP POLICY IF EXISTS "Public can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins manage listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins manage offers" ON public.marketplace_offers;
DROP POLICY IF EXISTS "Admins view all offers" ON public.marketplace_offers;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

CREATE POLICY "Public can view active listings"
  ON public.marketplace_listings
  FOR SELECT
  TO public
  USING (status IN ('active', 'sold'));

CREATE POLICY "Admins manage listings"
  ON public.marketplace_listings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage offers"
  ON public.marketplace_offers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins view all offers"
  ON public.marketplace_offers
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));