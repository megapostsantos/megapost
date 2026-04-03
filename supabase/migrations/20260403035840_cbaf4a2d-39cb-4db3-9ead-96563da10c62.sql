
-- Fix 1: training_content - replace public write/update/delete with staff-only
DROP POLICY IF EXISTS "Public write training_content" ON public.training_content;
DROP POLICY IF EXISTS "Public update training_content" ON public.training_content;
DROP POLICY IF EXISTS "Public delete training_content" ON public.training_content;

CREATE POLICY "Staff write training_content" ON public.training_content
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Staff update training_content" ON public.training_content
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Staff delete training_content" ON public.training_content
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Fix 2: timecards - restrict user self-updates to non-financial fields
DROP POLICY IF EXISTS "Users update own timecards" ON public.timecards;

CREATE POLICY "Users update own clock fields" ON public.timecards
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
  );

-- Create trigger to prevent non-admin users from modifying financial fields
CREATE OR REPLACE FUNCTION public.protect_timecard_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If financial fields changed, check if user is admin
  IF (OLD.daily_payment IS DISTINCT FROM NEW.daily_payment
      OR OLD.extra_hours IS DISTINCT FROM NEW.extra_hours
      OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
      OR OLD.worked_hours IS DISTINCT FROM NEW.worked_hours) THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can modify financial timecard fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_timecard_financials ON public.timecards;
CREATE TRIGGER protect_timecard_financials
  BEFORE UPDATE ON public.timecards
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_timecard_financial_fields();

-- Fix 3: Storage bucket file size limits and allowed MIME types
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'driver-photos';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'documentos';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
WHERE id = 'site-assets';
