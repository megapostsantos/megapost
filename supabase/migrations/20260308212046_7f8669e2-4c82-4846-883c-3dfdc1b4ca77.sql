
CREATE TABLE public.staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  shift text NOT NULL DEFAULT 'manha',
  status text NOT NULL DEFAULT 'trabalho',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, shift)
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage staff_schedules" ON public.staff_schedules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read own schedule" ON public.staff_schedules
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
