-- Restrict user_catalog_access INSERT to service_role only
DROP POLICY IF EXISTS "Users can insert own catalog access" ON public.user_catalog_access;

CREATE POLICY "Only service role can insert catalog access"
ON public.user_catalog_access
FOR INSERT
TO service_role
WITH CHECK (true);