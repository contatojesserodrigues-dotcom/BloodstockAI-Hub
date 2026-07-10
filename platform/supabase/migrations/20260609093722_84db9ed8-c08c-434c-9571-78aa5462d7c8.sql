
-- 1. plan_inquiries: explicit admin-only access
CREATE POLICY "Admins view plan inquiries" ON public.plan_inquiries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins manage plan inquiries" ON public.plan_inquiries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can submit plan inquiry" ON public.plan_inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(full_name) BETWEEN 1 AND 200
    AND char_length(company_name) BETWEEN 1 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(email) <= 320
    AND (plan_interest IS NULL OR char_length(plan_interest) <= 100)
  );

-- 2. marketplace_offers: tighten INSERT with server-side validation
DROP POLICY IF EXISTS "Anyone can submit offers" ON public.marketplace_offers;
CREATE POLICY "Anyone can submit offers" ON public.marketplace_offers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    amount > 0
    AND char_length(offeror_name) BETWEEN 2 AND 200
    AND char_length(offeror_initials) BETWEEN 1 AND 10
    AND char_length(contact_number) BETWEEN 5 AND 40
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(email) <= 320
    AND (message IS NULL OR char_length(message) <= 2000)
    AND is_genuine = true
  );

-- 3. search_cache_v2: writes restricted to service_role (edge functions)
DROP POLICY IF EXISTS "search_cache_v2 write" ON public.search_cache_v2;
DROP POLICY IF EXISTS "search_cache_v2 update" ON public.search_cache_v2;
REVOKE INSERT, UPDATE, DELETE ON public.search_cache_v2 FROM authenticated;
