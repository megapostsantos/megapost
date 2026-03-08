
-- Batch 1: Convert user_roles SELECT policies from RESTRICTIVE to PERMISSIVE
DROP POLICY "Admins can view roles" ON public.user_roles;
DROP POLICY "Users can read own role" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
