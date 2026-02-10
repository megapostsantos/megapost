
-- Financial entries table
CREATE TABLE public.financeiro_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'MANUAL', -- ROTA_AUTOMATICA, FIXO_ML, MANUAL
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'aguardando', -- aguardando, recebido
  recebido_em timestamp with time zone,
  dia_id uuid REFERENCES public.dias(id),
  documento_id uuid, -- will reference documentos after creation
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage financeiro_entradas"
  ON public.financeiro_entradas FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financeiro_entradas_updated_at
  BEFORE UPDATE ON public.financeiro_entradas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial exits table
CREATE TABLE public.financeiro_saidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'MANUAL', -- FUNCIONARIO_DIARIA, FIXA, IMPOSTO_MEI, MANUAL
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendente', -- pendente, pago
  pago_em timestamp with time zone,
  documento_id uuid,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_saidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage financeiro_saidas"
  ON public.financeiro_saidas FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financeiro_saidas_updated_at
  BEFORE UPDATE ON public.financeiro_saidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'OUTROS', -- NOTA_FISCAL, RECIBO, ORCAMENTO, COMPROVANTE, OUTROS
  arquivo_url text,
  arquivo_nome text,
  status text NOT NULL DEFAULT 'aguardando_pagamento', -- aguardando_pagamento, recebido
  valor numeric(12,2),
  data_referencia date DEFAULT CURRENT_DATE,
  financeiro_entrada_id uuid REFERENCES public.financeiro_entradas(id),
  financeiro_saida_id uuid REFERENCES public.financeiro_saidas(id),
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage documentos"
  ON public.documentos FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin upload documentos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documentos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read documentos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete documentos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documentos' AND has_role(auth.uid(), 'admin'));

-- Add FK reference from financeiro tables to documentos
ALTER TABLE public.financeiro_entradas 
  ADD CONSTRAINT financeiro_entradas_documento_id_fkey 
  FOREIGN KEY (documento_id) REFERENCES public.documentos(id);

ALTER TABLE public.financeiro_saidas 
  ADD CONSTRAINT financeiro_saidas_documento_id_fkey 
  FOREIGN KEY (documento_id) REFERENCES public.documentos(id);
