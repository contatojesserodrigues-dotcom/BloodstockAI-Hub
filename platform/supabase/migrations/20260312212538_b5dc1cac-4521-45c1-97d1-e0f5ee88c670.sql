DROP VIEW IF EXISTS public.free_users_exhausted;
CREATE VIEW public.free_users_exhausted
WITH (security_invoker = true)
AS
SELECT email,
    analyses_used,
    analyses_remaining,
    plan_started_at
FROM profiles
WHERE plan = 'free'::user_plan AND analyses_remaining = 0
ORDER BY plan_started_at DESC;