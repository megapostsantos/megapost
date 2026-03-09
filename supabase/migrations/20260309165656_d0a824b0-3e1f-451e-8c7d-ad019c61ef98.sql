ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'despesa';

-- Backfill existing records: entries with kind='entrada' become 'previsao', kind='saida' become 'despesa'
UPDATE public.finance_entries SET tipo = 'previsao' WHERE kind = 'entrada' AND tipo = 'despesa';
UPDATE public.finance_entries SET tipo = 'despesa' WHERE kind = 'saida';