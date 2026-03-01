
-- 1) Create unified finance_entries table
CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'saida',
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  categoria text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage finance_entries"
  ON public.finance_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from financeiro_entradas
INSERT INTO public.finance_entries (kind, descricao, valor, categoria, data, status, observacao, created_at)
SELECT 'entrada', descricao, valor, tipo, data_referencia, status, observacao, created_at
FROM public.financeiro_entradas;

-- Migrate existing data from financeiro_saidas
INSERT INTO public.finance_entries (kind, descricao, valor, categoria, data, status, observacao, created_at)
SELECT 'saida', descricao, valor, tipo, data_referencia, status, observacao, created_at
FROM public.financeiro_saidas;

-- 2) Create v_routes_monthly view
CREATE OR REPLACE VIEW public.v_routes_monthly AS
SELECT
  r.id as route_id,
  r.driver_id,
  r.status,
  r.periodo,
  r.rota_codigo,
  r.qr_codigo,
  r.nx_codigo,
  r.hora_saida,
  r.hora_chegada,
  d.id as dia_id,
  d.data as dia_data,
  to_char(d.data, 'YYYY-MM') as month_id
FROM rotas r
JOIN dias d ON d.id = r.dia_id;

-- 3) Create v_driver_monthly view
CREATE OR REPLACE VIEW public.v_driver_monthly AS
SELECT
  r.driver_id,
  to_char(d.data, 'YYYY-MM') as month_id,
  count(*) as atribuidas,
  count(*) FILTER (WHERE r.hora_saida IS NOT NULL) as com_saida,
  count(*) FILTER (WHERE r.status = 'Finalizada') as finalizadas
FROM rotas r
JOIN dias d ON d.id = r.dia_id
WHERE r.driver_id IS NOT NULL
GROUP BY r.driver_id, to_char(d.data, 'YYYY-MM');
