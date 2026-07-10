INSERT INTO public.authorized_users (email, role, full_access)
VALUES ('admin@agentbloodstockai.com', 'super_admin', true)
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    full_access = true;
