
-- 1) Add new columns to estoque
ALTER TABLE public.estoque
  ADD COLUMN IF NOT EXISTS origem_driver_id uuid REFERENCES public.drivers(id),
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS destino_saida text,
  ADD COLUMN IF NOT EXISTS saida_route_id uuid REFERENCES public.rotas(id),
  ADD COLUMN IF NOT EXISTS retirada_id uuid;

-- 2) Migrate existing status values to new naming
UPDATE public.estoque SET status = 'NO_LOCAL' WHERE status = 'em_estoque';
UPDATE public.estoque SET status = 'SAIU_PARA_GALPAO' WHERE status = 'enviado_galpao';
UPDATE public.estoque SET status = 'SAIU_EM_REENTREGA' WHERE status = 'reentregue';

-- 3) Migrate existing tipo_insucesso values
UPDATE public.estoque SET tipo_insucesso = 'TENTATIVA' WHERE tipo_insucesso = 'tentativa_de_entrega';
UPDATE public.estoque SET tipo_insucesso = 'AVARIA' WHERE tipo_insucesso = 'avaria';

-- 4) Create stock_pickups table
CREATE TABLE public.stock_pickups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_id uuid REFERENCES public.dias(id),
  tipo_retirada text NOT NULL DEFAULT 'GALPAO',
  motorista_nome text NOT NULL,
  placa text,
  telefone text,
  quantidade_informada integer,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage stock_pickups"
  ON public.stock_pickups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER update_stock_pickups_updated_at
  BEFORE UPDATE ON public.stock_pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Add FK from estoque.retirada_id to stock_pickups
ALTER TABLE public.estoque
  ADD CONSTRAINT estoque_retirada_id_fkey FOREIGN KEY (retirada_id) REFERENCES public.stock_pickups(id);

-- 6) Create route_event_log table
CREATE TABLE public.route_event_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.rotas(id),
  actor_role text NOT NULL DEFAULT 'OPERADOR',
  action text NOT NULL,
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage route_event_log"
  ON public.route_event_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
