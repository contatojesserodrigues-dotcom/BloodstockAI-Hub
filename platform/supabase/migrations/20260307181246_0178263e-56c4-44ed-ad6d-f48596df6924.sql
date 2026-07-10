
-- Remove the permissive INSERT policy that allows any authenticated user to create purchases
DROP POLICY IF EXISTS "Users can create purchases" ON public.report_purchases;

-- Only the service role (edge functions) can now insert into report_purchases.
-- Users can still read their own purchases via the existing SELECT policy.
