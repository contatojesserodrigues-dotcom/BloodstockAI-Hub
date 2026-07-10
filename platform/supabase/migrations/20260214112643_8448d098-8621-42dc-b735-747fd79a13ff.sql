
-- Step 1: Drop all dependent policies
DROP POLICY IF EXISTS "Admins can manage horses" ON public.horses;
DROP POLICY IF EXISTS "Admins can manage races" ON public.races;
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can manage stallions" ON public.stallions;
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.pdf_uploads;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.analysis_reports;
DROP POLICY IF EXISTS "Admins can manage published reports" ON public.published_reports;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.report_purchases;

-- Step 2: Drop old has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Create new enum, migrate column, drop old, rename
CREATE TYPE public.app_role_v2 AS ENUM ('admin', 'user', 'free_user', 'premium_user', 'super_admin');

ALTER TABLE public.user_roles 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role_v2 USING (role::text::public.app_role_v2),
  ALTER COLUMN role SET DEFAULT 'free_user'::public.app_role_v2;

DROP TYPE public.app_role;
ALTER TYPE public.app_role_v2 RENAME TO app_role;

-- Step 4: Recreate has_role with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 5: Recreate all dropped policies using super_admin
CREATE POLICY "Admins can manage horses" ON public.horses FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage races" ON public.races FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage stallions" ON public.stallions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all uploads" ON public.pdf_uploads FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all reports" ON public.analysis_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage published reports" ON public.published_reports FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all purchases" ON public.report_purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Step 6: Migrate existing data
UPDATE public.user_roles SET role = 'free_user' WHERE role = 'user';
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';

-- Step 7: Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, plan, credits_remaining)
    VALUES (NEW.id, NEW.id, NEW.email, 'basic', 3);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'free_user');
    
    RETURN NEW;
END;
$function$;

-- Step 8: Create get_user_role for edge functions
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
