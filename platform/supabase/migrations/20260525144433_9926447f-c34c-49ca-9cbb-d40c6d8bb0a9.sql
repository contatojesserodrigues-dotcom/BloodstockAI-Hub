
-- Fix self-referential authorized_users policy
DROP POLICY IF EXISTS "Owner can manage authorized users" ON public.authorized_users;

CREATE POLICY "Super admins can manage authorized users"
ON public.authorized_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Restrict horse_database SELECT to own rows
DROP POLICY IF EXISTS "Anyone can view horse_database" ON public.horse_database;

CREATE POLICY "Users can view own horse_database rows"
ON public.horse_database
FOR SELECT
TO authenticated
USING (searched_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));
