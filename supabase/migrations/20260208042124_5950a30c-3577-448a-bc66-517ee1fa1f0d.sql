
-- =============================================
-- PHASE 2 - Tables, Columns, Policies, Storage
-- =============================================

-- 1. Add new columns to existing tables
ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS qr_codigo text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS foto_url text;

-- External occurrence fields
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS nome_motorista text;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS placa_veiculo text;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS rota_numero text;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS nx_codigo_oc text;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'interno';

-- 2. Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create estoque table
CREATE TABLE IF NOT EXISTS public.estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_pacote text NOT NULL,
  tipo_insucesso text NOT NULL,
  rota_origem text,
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'em_estoque',
  enviado_em timestamp with time zone,
  dia_id uuid REFERENCES public.dias(id),
  rota_id uuid REFERENCES public.rotas(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage estoque" ON public.estoque
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER update_estoque_updated_at
  BEFORE UPDATE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Update RLS policies to include operador role
DROP POLICY IF EXISTS "Admins can do everything on rotas" ON public.rotas;
CREATE POLICY "Staff access rotas" ON public.rotas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins can do everything on dias" ON public.dias;
CREATE POLICY "Staff access dias" ON public.dias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins can do everything on drivers" ON public.drivers;
CREATE POLICY "Staff access drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins can do everything on ocorrencias" ON public.ocorrencias;
CREATE POLICY "Staff access ocorrencias" ON public.ocorrencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins can do everything on conferencias" ON public.conferencias;
CREATE POLICY "Staff access conferencias" ON public.conferencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- 6. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-photos', 'driver-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public view driver photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'driver-photos');
CREATE POLICY "Staff upload driver photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-photos');
CREATE POLICY "Staff update driver photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-photos');

CREATE POLICY "Public view site assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-assets');
CREATE POLICY "Admin upload site assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update site assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- 7. Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('link_grupo_wpp', 'https://chat.whatsapp.com/SEU_GRUPO_AQUI'),
  ('whatsapp_megapost', '5513988218339'),
  ('whatsapp_mercadolivre', ''),
  ('qr_code_image_url', ''),
  ('texto_como_funciona', E'1. Chegue na base no horário combinado e dirija-se à portaria para identificação.\n2. Aguarde na fila do drive thru. Mantenha a ordem e não ultrapasse outros veículos.\n3. Na doca, confira todos os volumes, etiquetas e NF com o operador.\n4. Acompanhe o carregamento. Os pacotes devem estar organizados por rota.\n5. Após conferir tudo, registre a saída com QR + NX e siga para a rota.'),
  ('texto_ocorrencia_padrao', E'OCORRÊNCIA MEGA POST\nNome: {{nome}}\nPlaca: {{placa}}\nRota: {{rota}}\nNX: {{nx}}\nTipo: {{tipo}}\nDescrição: {{descricao}}'),
  ('hero_btn1_texto', 'Entrar no Grupo Operacional'),
  ('hero_btn2_texto', 'Falar com a Mega POST'),
  ('dias_alerta_estoque', '3')
ON CONFLICT (key) DO NOTHING;
