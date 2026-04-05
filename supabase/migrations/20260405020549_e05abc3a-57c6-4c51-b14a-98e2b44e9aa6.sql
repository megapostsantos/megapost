
CREATE TABLE public.staff_unavailability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;

-- Operators can read their own requests
CREATE POLICY "Users read own unavailability"
  ON public.staff_unavailability
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Operators can insert their own requests
CREATE POLICY "Users insert own unavailability"
  ON public.staff_unavailability
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admin manage unavailability"
  ON public.staff_unavailability
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
