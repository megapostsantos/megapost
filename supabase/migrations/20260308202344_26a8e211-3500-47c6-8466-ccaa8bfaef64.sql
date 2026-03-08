-- Table for divergence records (discrepancies in operation)
CREATE TABLE public.divergencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'contagem',
  notas text,
  foto_url text,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencias ENABLE ROW LEVEL SECURITY;

-- Staff can manage all divergencias
CREATE POLICY "Staff manage divergencias"
  ON public.divergencias FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_divergencias_updated_at
  BEFORE UPDATE ON public.divergencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();