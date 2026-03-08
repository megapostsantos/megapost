
-- Add profile fields for personal info and document photo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS documento_foto_url text;
