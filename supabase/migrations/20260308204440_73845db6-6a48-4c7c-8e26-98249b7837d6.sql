CREATE TABLE public.route_sack_conference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  cycle text NOT NULL DEFAULT 'AM0',
  external_route_code text NOT NULL,
  sacks_count integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_sack_conference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage route_sack_conference"
  ON public.route_sack_conference FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));