
-- Drop existing policies
DROP POLICY IF EXISTS "Staff can read training_content" ON public.training_content;
DROP POLICY IF EXISTS "Admin manage training_content" ON public.training_content;

-- Allow public read access (app handles auth)
CREATE POLICY "Public read training_content"
  ON public.training_content
  FOR SELECT
  USING (true);

-- Allow public write access (app handles admin check)
CREATE POLICY "Public write training_content"
  ON public.training_content
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update training_content"
  ON public.training_content
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete training_content"
  ON public.training_content
  FOR DELETE
  USING (true);
