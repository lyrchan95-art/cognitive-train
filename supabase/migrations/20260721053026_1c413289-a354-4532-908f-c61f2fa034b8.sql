
ALTER TABLE public.daily_briefings
  ADD COLUMN IF NOT EXISTS toxicity_alert text,
  ADD COLUMN IF NOT EXISTS evening_prompt text,
  ADD COLUMN IF NOT EXISTS reflection text,
  ADD COLUMN IF NOT EXISTS ai_validation text,
  ADD COLUMN IF NOT EXISTS action_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS reflection_done_at timestamptz;
