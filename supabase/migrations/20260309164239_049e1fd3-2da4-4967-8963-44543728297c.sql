ALTER TABLE public.staff_schedules 
  ADD COLUMN IF NOT EXISTS shift_start_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shift_end_time time DEFAULT NULL;