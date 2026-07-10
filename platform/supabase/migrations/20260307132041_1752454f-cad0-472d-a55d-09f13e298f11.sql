
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _email text;
  _credits integer;
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
      _credits := 99999;
    ELSE
      _role := 'free_user';
      _credits := 5;
    END IF;

    INSERT INTO public.profiles (id, user_id, email, plan, credits_remaining)
    VALUES (NEW.id, NEW.id, NEW.email, 
            CASE WHEN _role = 'super_admin' THEN 'pro' ELSE 'basic' END,
            _credits);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);
    
    IF _role = 'super_admin' THEN
      INSERT INTO public.activity_logs (user_id, action, resource_type, metadata)
      VALUES (NEW.id, 'super_admin_assigned', 'user_roles', jsonb_build_object('method', 'auto_signup', 'email', NEW.email, 'can_edit', _can_edit));
    END IF;

    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'new_user_signup',
        'email', NEW.email,
        'name', COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'plan', CASE WHEN _role = 'super_admin' THEN 'Super Admin' ELSE 'Free' END
      )
    );
    
    RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$;

ALTER TABLE public.usage_tracking ALTER COLUMN analyses_allowed SET DEFAULT 5;
