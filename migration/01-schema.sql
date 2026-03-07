-- ============================================================
-- MIGRATION SCRIPT: Schema para Supabase Externo (megapost-db)
-- Execute este SQL no SQL Editor do seu Supabase externo
-- ============================================================

-- 1. ENUM (pule se já existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABLES
-- user_roles (pule se já existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  placa text,
  foto_url text,
  tipo text NOT NULL DEFAULT 'ENVIOS_EXTRA',
  transportadora_nome text,
  farol text NOT NULL DEFAULT 'VERDE',
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  am0_previsto integer NOT NULL DEFAULT 0,
  am1_previsto integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'aberto'
);

CREATE TABLE IF NOT EXISTS public.rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_id uuid NOT NULL REFERENCES public.dias(id),
  driver_id uuid REFERENCES public.drivers(id),
  periodo text NOT NULL,
  rota_codigo text NOT NULL,
  status text NOT NULL DEFAULT 'Em aberto',
  mx_codigo text,
  nx_codigo text,
  qr_codigo text,
  observacoes text,
  hora_chegada timestamptz,
  hora_saida timestamptz,
  tempo_atendimento_min numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  cidade text,
  cnpj text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pacote text NOT NULL,
  tipo_insucesso text NOT NULL,
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  rota_origem text,
  status text NOT NULL DEFAULT 'em_estoque',
  motivo text,
  destino_saida text,
  enviado_em timestamptz,
  dia_id uuid REFERENCES public.dias(id),
  rota_id uuid REFERENCES public.rotas(id),
  origem_driver_id uuid REFERENCES public.drivers(id),
  saida_route_id uuid REFERENCES public.rotas(id),
  retirada_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_nome text NOT NULL,
  placa text,
  telefone text,
  tipo_retirada text NOT NULL DEFAULT 'GALPAO',
  quantidade_informada integer,
  observacao text,
  dia_id uuid REFERENCES public.dias(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK after stock_pickups exists
DO $$ BEGIN
  ALTER TABLE public.estoque
    ADD CONSTRAINT estoque_retirada_id_fkey
    FOREIGN KEY (retirada_id) REFERENCES public.stock_pickups(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'aberta',
  origem text NOT NULL DEFAULT 'interno',
  nome_motorista text,
  placa_veiculo text,
  rota_numero text,
  nx_codigo_oc text,
  rota_id uuid REFERENCES public.rotas(id),
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id uuid NOT NULL REFERENCES public.rotas(id),
  qtd_app integer,
  qtd_contada integer,
  resultado text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL DEFAULT 'saida',
  status text NOT NULL DEFAULT 'pendente',
  categoria text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financeiro_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'MANUAL',
  status text NOT NULL DEFAULT 'aguardando',
  observacao text,
  recebido_em timestamptz,
  dia_id uuid REFERENCES public.dias(id),
  documento_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financeiro_saidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'MANUAL',
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  pago_em timestamptz,
  documento_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'OUTROS',
  status text NOT NULL DEFAULT 'aguardando_pagamento',
  valor numeric,
  data_referencia date DEFAULT CURRENT_DATE,
  arquivo_url text,
  arquivo_nome text,
  observacao text,
  financeiro_entrada_id uuid REFERENCES public.financeiro_entradas(id),
  financeiro_saida_id uuid REFERENCES public.financeiro_saidas(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK back from financeiro tables to documentos
DO $$ BEGIN
  ALTER TABLE public.financeiro_entradas
    ADD CONSTRAINT financeiro_entradas_documento_id_fkey
    FOREIGN KEY (documento_id) REFERENCES public.documentos(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.financeiro_saidas
    ADD CONSTRAINT financeiro_saidas_documento_id_fkey
    FOREIGN KEY (documento_id) REFERENCES public.documentos(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.route_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.rotas(id),
  action text NOT NULL,
  actor_role text NOT NULL DEFAULT 'OPERADOR',
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  acao text NOT NULL,
  registro_id uuid NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. VIEWS
CREATE OR REPLACE VIEW public.v_routes_monthly AS
SELECT
  r.id AS route_id,
  r.driver_id,
  r.hora_saida,
  r.hora_chegada,
  r.dia_id,
  d.data AS dia_data,
  to_char(d.data, 'YYYY-MM') AS month_id,
  r.status,
  r.periodo,
  r.rota_codigo,
  r.qr_codigo,
  r.nx_codigo
FROM public.rotas r
JOIN public.dias d ON d.id = r.dia_id;

CREATE OR REPLACE VIEW public.v_driver_monthly AS
SELECT
  r.driver_id,
  to_char(d.data, 'YYYY-MM') AS month_id,
  count(*) AS atribuidas,
  count(*) FILTER (WHERE r.hora_saida IS NOT NULL) AS com_saida,
  count(*) FILTER (WHERE r.status = 'Finalizada') AS finalizadas
FROM public.rotas r
JOIN public.dias d ON d.id = r.dia_id
WHERE r.driver_id IS NOT NULL
GROUP BY r.driver_id, to_char(d.data, 'YYYY-MM');

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- updated_at triggers
CREATE OR REPLACE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_rotas_updated_at BEFORE UPDATE ON public.rotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_stock_pickups_updated_at BEFORE UPDATE ON public.stock_pickups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_finance_entries_updated_at BEFORE UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financeiro_entradas_updated_at BEFORE UPDATE ON public.financeiro_entradas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financeiro_saidas_updated_at BEFORE UPDATE ON public.financeiro_saidas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. ENABLE RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_saidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- staff tables (admin + operador)
CREATE POLICY "Staff access drivers" ON public.drivers FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff access dias" ON public.dias FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff access rotas" ON public.rotas FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff manage sellers" ON public.sellers FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff manage estoque" ON public.estoque FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff manage stock_pickups" ON public.stock_pickups FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff access ocorrencias" ON public.ocorrencias FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff access conferencias" ON public.conferencias FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Staff manage route_event_log" ON public.route_event_log FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- admin-only tables
CREATE POLICY "Admin manage finance_entries" ON public.finance_entries FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage financeiro_entradas" ON public.financeiro_entradas FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage financeiro_saidas" ON public.financeiro_saidas FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage documentos" ON public.documentos FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- audit_log
CREATE POLICY "Admin read audit_log" ON public.audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- site_settings
CREATE POLICY "Admins manage site_settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

-- 8. STORAGE BUCKETS (run these separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('driver-photos', 'driver-photos', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false) ON CONFLICT DO NOTHING;

-- 9. REALTIME (if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.rotas;
