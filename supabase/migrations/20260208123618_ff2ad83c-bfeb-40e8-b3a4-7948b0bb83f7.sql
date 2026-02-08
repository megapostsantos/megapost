
-- Make rota_id nullable for external occurrences
ALTER TABLE public.ocorrencias ALTER COLUMN rota_id DROP NOT NULL;
