
-- STEP 1: Drop old plan columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS plan CASCADE,
  DROP COLUMN IF EXISTS trial_credits CASCADE,
  DROP COLUMN IF EXISTS trial_credits_used CASCADE,
  DROP COLUMN IF EXISTS credits_remaining CASCADE,
  DROP COLUMN IF EXISTS plan_started_at CASCADE,
  DROP COLUMN IF EXISTS plan_expires_at CASCADE;

-- Drop old types and functions
DROP TYPE IF EXISTS user_plan CASCADE;
DROP FUNCTION IF EXISTS increment_credits_used CASCADE;
DROP FUNCTION IF EXISTS use_analysis_credit CASCADE;
DROP VIEW IF EXISTS free_users_exhausted CASCADE;

-- STEP 2: Create new enum and columns
CREATE TYPE user_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');

ALTER TABLE profiles
  ADD COLUMN plan user_plan NOT NULL DEFAULT 'free',
  ADD COLUMN analyses_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN analyses_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN analyses_remaining INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN plan_started_at TIMESTAMPTZ DEFAULT NOW();

-- STEP 3: Create new credit function
CREATE OR REPLACE FUNCTION use_analysis_credit(p_user_id UUID)
RETURNS boolean AS $$
DECLARE
  v_plan user_plan;
  v_remaining INTEGER;
BEGIN
  SELECT plan, analyses_remaining
  INTO v_plan, v_remaining
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_plan IN ('starter', 'pro', 'enterprise') THEN
    RETURN true;
  END IF;

  IF v_remaining <= 0 THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET
    analyses_used = analyses_used + 1,
    analyses_remaining = GREATEST(analyses_remaining - 1, 0)
  WHERE user_id = p_user_id
    AND plan = 'free';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 4: Update signup trigger function (preserving super admin guardian logic)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _role app_role;
  _email text;
  _is_authorized boolean;
  _can_edit boolean;
BEGIN
    _email := LOWER(TRIM(NEW.email));

    SELECT true, COALESCE(au.can_edit, false)
    INTO _is_authorized, _can_edit
    FROM public.authorized_users au
    WHERE LOWER(TRIM(au.email)) = _email AND au.full_access = true;

    IF _is_authorized THEN
      _role := 'super_admin';
    ELSE
      _role := 'free_user';
    END IF;

    INSERT INTO public.profiles (id, user_id, email, plan, analyses_limit, analyses_used, analyses_remaining)
    VALUES (
      NEW.id, NEW.id, NEW.email,
      CASE WHEN _role = 'super_admin' THEN 'pro'::user_plan ELSE 'free'::user_plan END,
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 5 END,
      0,
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 5 END
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);

    IF _role = 'super_admin' THEN
      INSERT INTO public.activity_logs (user_id, action, resource_type, metadata)
      VALUES (NEW.id, 'super_admin_assigned', 'user_roles', jsonb_build_object('method', 'auto_signup', 'email', NEW.email, 'can_edit', _can_edit));
    END IF;

    RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 6: Admin view
CREATE OR REPLACE VIEW free_users_exhausted AS
SELECT email, analyses_used, analyses_remaining, plan_started_at
FROM profiles
WHERE plan = 'free' AND analyses_remaining = 0
ORDER BY plan_started_at DESC;
