-- Deactivate all free-tier users: set analyses_remaining to 0
-- This forces them to re-register or purchase a plan to use the platform
UPDATE public.profiles
SET analyses_remaining = 0,
    analyses_used = analyses_limit,
    updated_at = now()
WHERE plan = 'free'
  AND analyses_remaining > 0;