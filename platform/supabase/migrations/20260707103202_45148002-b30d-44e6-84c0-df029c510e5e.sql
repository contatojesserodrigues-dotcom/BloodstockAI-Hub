
-- 1) payments: remove authenticated INSERT; restrict INSERT to service_role
DROP POLICY IF EXISTS "Service can insert payments" ON public.payments;
CREATE POLICY "Service role can insert payments"
ON public.payments FOR INSERT
TO service_role
WITH CHECK (true);

-- 2) usage_tracking: remove authenticated INSERT; restrict to service_role
DROP POLICY IF EXISTS "Service can insert usage tracking" ON public.usage_tracking;
CREATE POLICY "Service role can insert usage tracking"
ON public.usage_tracking FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) profiles: prevent non-admins from changing plan/quota columns via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Backend/service role bypasses this check
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins can modify anything
  IF public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admin users cannot change billing/quota columns
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.analyses_limit IS DISTINCT FROM OLD.analyses_limit
     OR NEW.analyses_remaining IS DISTINCT FROM OLD.analyses_remaining
     OR NEW.analyses_used IS DISTINCT FROM OLD.analyses_used THEN
    RAISE EXCEPTION 'Not allowed to modify billing or quota fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
