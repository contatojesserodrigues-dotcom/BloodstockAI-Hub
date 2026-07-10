
-- Drop the overly permissive policy
DROP POLICY "Service role can manage inquiries" ON public.plan_inquiries;

-- No public policies needed - only service role (edge function) accesses this table
-- Service role bypasses RLS by default
