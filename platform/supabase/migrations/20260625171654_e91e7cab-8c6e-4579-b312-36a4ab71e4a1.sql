ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS temperature_c numeric,
  ADD COLUMN IF NOT EXISTS body_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS resting_heart_rate integer;