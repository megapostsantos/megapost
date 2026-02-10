
-- Add new columns to drivers table
ALTER TABLE public.drivers 
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ENVIOS_EXTRA',
  ADD COLUMN IF NOT EXISTS transportadora_nome TEXT,
  ADD COLUMN IF NOT EXISTS farol TEXT NOT NULL DEFAULT 'VERDE',
  ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Add check constraint for tipo values
ALTER TABLE public.drivers ADD CONSTRAINT drivers_tipo_check CHECK (tipo IN ('ENVIOS_EXTRA', 'TRANSPORTADORA'));

-- Add check constraint for farol values  
ALTER TABLE public.drivers ADD CONSTRAINT drivers_farol_check CHECK (farol IN ('VERDE', 'AMARELO', 'VERMELHO'));
