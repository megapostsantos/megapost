
CREATE TABLE IF NOT EXISTS public.timecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  clock_out timestamptz,
  worked_hours numeric DEFAULT 0,
  extra_hours numeric DEFAULT 0,
  daily_payment numeric DEFAULT 0,
  notes text,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own timecards" ON public.timecards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own timecards" ON public.timecards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own timecards" ON public.timecards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all timecards" ON public.timecards FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all timecards" ON public.timecards FOR UPDATE USING (has_role(auth.uid(), 'admin'));
