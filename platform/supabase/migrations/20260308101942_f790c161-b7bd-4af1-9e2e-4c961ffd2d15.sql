
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
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 10 END,
      0,
      CASE WHEN _role = 'super_admin' THEN 999999 ELSE 10 END
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
