CREATE OR REPLACE FUNCTION public.increment_credits_used(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles
  SET trial_credits_used = LEAST(COALESCE(trial_credits_used, 0) + 1, COALESCE(trial_credits, 5)),
      credits_remaining = GREATEST(COALESCE(credits_remaining, 0) - 1, 0),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND plan = 'basic';
$$;