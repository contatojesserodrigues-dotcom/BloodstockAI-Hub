CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _email text;
  _is_authorized boolean;
  _can_edit boolean;
  _first_name text;
  _last_name text;
  _full_name text;
  _account_type text;
  _company_name text;
  _vat_number text;
BEGIN
    _email := LOWER(TRIM(NEW.email));
    
    -- Read user metadata passed from signUp
    _first_name := NEW.raw_user_meta_data->>'first_name';
    _last_name := NEW.raw_user_meta_data->>'last_name';
    _full_name := NEW.raw_user_meta_data->>'full_name';
    _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'personal');
    _company_name := NEW.raw_user_meta_data->>'company_name';
    _vat_number := NEW.raw_user_meta_data->>'vat_number';

    SELECT true, COALESCE(au.can_edit, false)
    INTO _is_authorized, _can_edit
    FROM public.authorized_users au
    WHERE LOWER(TRIM(au.email)) = _email AND au.full_access = true;

    IF _is_authorized THEN
      _role := 'super_admin';
    ELSE
      _role := 'free_user';
    END IF;

    INSERT INTO public.profiles (id, user_id, email, plan, analyses_limit, analyses_used, analyses_remaining, first_name, last_name, full_name, account_type, company_name, vat_number)
    VALUES (
      NEW.id, NEW.id, NEW.email,
      CASE WHEN _role = 'super_admin' THEN 'pro'::user_plan ELSE 'free'::user_plan END,
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 10 END,
      0,
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 10 END,
      _first_name,
      _last_name,
      _full_name,
      _account_type,
      _company_name,
      _vat_number
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
$function$;