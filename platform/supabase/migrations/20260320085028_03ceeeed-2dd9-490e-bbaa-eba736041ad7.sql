-- Fix: Replace authorized_users policy to use auth.email() instead of mutable profiles.email
DROP POLICY IF EXISTS "Owner can manage authorized users" ON public.authorized_users;

CREATE POLICY "Owner can manage authorized users"
  ON public.authorized_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.authorized_users au
      WHERE lower(trim(au.email)) = lower(trim(auth.email()))
        AND au.can_edit = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.authorized_users au
      WHERE lower(trim(au.email)) = lower(trim(auth.email()))
        AND au.can_edit = true
    )
  );