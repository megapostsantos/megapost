
-- Create training_content table
CREATE TABLE public.training_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;

-- Operators and admins can read
CREATE POLICY "Staff can read training_content"
  ON public.training_content
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operador'::app_role)
  );

-- Only admins can insert/update/delete
CREATE POLICY "Admin manage training_content"
  ON public.training_content
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_training_content_updated_at
  BEFORE UPDATE ON public.training_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
