ALTER TABLE public.pathways
  ADD COLUMN IF NOT EXISTS required_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certificate_title text;