CREATE POLICY "Admins can delete timecards" ON public.timecards
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));