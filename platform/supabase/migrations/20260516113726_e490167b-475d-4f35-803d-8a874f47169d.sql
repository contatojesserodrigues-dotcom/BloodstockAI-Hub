
-- 1. Fix catalogues storage SELECT policy: enforce owner check via folder
DROP POLICY IF EXISTS "Users can read own catalogues" ON storage.objects;
DROP POLICY IF EXISTS "Service role reads catalogues" ON storage.objects;
CREATE POLICY "Users can read own catalogues"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'catalogues'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 2. Restrict email-assets bucket listing (keep individual file reads public via direct URL by removing listing)
-- Public bucket files remain accessible via signed/direct public URL; SELECT policy here only governs API listing.
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Email assets readable by authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-assets');

-- 3. usage_tracking: remove user-facing UPDATE policy (prevents plan/limit escalation)
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;

-- 4. Restrict catalogues and catalogue_lots public read to authenticated users
DROP POLICY IF EXISTS "Anyone can view catalogues" ON public.catalogues;
CREATE POLICY "Authenticated can view catalogues"
  ON public.catalogues FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view catalogue_lots" ON public.catalogue_lots;
CREATE POLICY "Authenticated can view catalogue_lots"
  ON public.catalogue_lots FOR SELECT
  TO authenticated
  USING (true);

-- 5. user_roles: explicit admin-only management policies
CREATE POLICY "Super admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
