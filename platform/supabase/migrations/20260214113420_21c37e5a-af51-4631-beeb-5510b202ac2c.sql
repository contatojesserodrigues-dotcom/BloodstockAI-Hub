
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
    -- Determine role based on email (case-insensitive)
    IF LOWER(NEW.email) = 'contatojesserodrigues@gmail.com' THEN
      _role := 'super_admin';
    ELSE
      _role := 'free_user';
    END IF;

    INSERT INTO public.profiles (id, user_id, email, plan, credits_remaining)
    VALUES (NEW.id, NEW.id, NEW.email, 'basic', 3);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role);
    
    -- Log super_admin assignment
    IF _role = 'super_admin' THEN
      INSERT INTO public.activity_logs (user_id, action, resource_type, metadata)
      VALUES (NEW.id, 'super_admin_assigned', 'user_roles', jsonb_build_object('method', 'auto_signup'));
    END IF;
    
    RETURN NEW;
END;
$function$;
