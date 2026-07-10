
-- Remove super_admin role from everyone except contatojesserodrigues@gmail.com
DELETE FROM public.user_roles
WHERE role = 'super_admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'contatojesserodrigues@gmail.com'
  );

-- Ensure contatojesserodrigues@gmail.com HAS super_admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'contatojesserodrigues@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
