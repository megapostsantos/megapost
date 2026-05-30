
-- Tighten driver-photos storage policies (require admin/operador)
DROP POLICY IF EXISTS "Staff upload driver photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff update driver photos" ON storage.objects;

CREATE POLICY "Staff upload driver photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver-photos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role)));

CREATE POLICY "Staff update driver photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'driver-photos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role)))
WITH CHECK (bucket_id = 'driver-photos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role)));

CREATE POLICY "Staff delete driver photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'driver-photos' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role)));

-- Add DELETE policy for site-assets
CREATE POLICY "Admin delete site assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-assets' AND has_role(auth.uid(),'admin'::app_role));

-- Tighten audit_log INSERT (restrict to staff)
DROP POLICY IF EXISTS "Staff insert audit_log" ON public.audit_log;
CREATE POLICY "Staff insert audit_log" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role))
);

-- Revoke EXECUTE on trigger SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_timecard_financial_fields() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
