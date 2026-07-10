
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
    IF LOWER(NEW.email) = 'contatojesserodrigues@gmail.com' THEN
      _role := 'super_admin';
    ELSE
      _role := 'free_user';
    END IF;

    INSERT INTO public.profiles (id, user_id, email, plan, credits_remaining)
    VALUES (NEW.id, NEW.id, NEW.email, 'basic', 3);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);
    
    IF _role = 'super_admin' THEN
      INSERT INTO public.activity_logs (user_id, action, resource_type, metadata)
      VALUES (NEW.id, 'super_admin_assigned', 'user_roles', jsonb_build_object('method', 'auto_signup'));
    END IF;

    -- Notify office about new signup via edge function (async, best-effort)
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
        'plan', 'Free'
      )
    );
    
    RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user signup if email notification fails
    RETURN NEW;
END;
$function$;
