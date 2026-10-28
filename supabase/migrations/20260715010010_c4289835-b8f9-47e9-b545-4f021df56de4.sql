
-- Articles: enrich for expandable cards + cover images
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS tldr text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Pathways
CREATE TABLE IF NOT EXISTS public.pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  archetype_slug text NOT NULL REFERENCES public.archetypes(slug) ON DELETE CASCADE,
  icon text NOT NULL DEFAULT '🧭',
  difficulty text NOT NULL DEFAULT 'Beginner',
  duration_days integer NOT NULL DEFAULT 7,
  hero_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pathways TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathways TO authenticated;
GRANT ALL ON public.pathways TO service_role;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published pathways" ON public.pathways
  FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pathways" ON public.pathways
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pathways_updated BEFORE UPDATE ON public.pathways
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Pathway days
CREATE TABLE IF NOT EXISTS public.pathway_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid NOT NULL REFERENCES public.pathways(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  title text NOT NULL,
  content text NOT NULL,
  action_prompt text NOT NULL,
  read_minutes integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pathway_id, day_number)
);
GRANT SELECT ON public.pathway_days TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_days TO authenticated;
GRANT ALL ON public.pathway_days TO service_role;
ALTER TABLE public.pathway_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pathway days" ON public.pathway_days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pathways p WHERE p.id = pathway_id AND (p.published = true OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "Admins manage pathway days" ON public.pathway_days
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pathway_days_updated BEFORE UPDATE ON public.pathway_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-user pathway progress
CREATE TABLE IF NOT EXISTS public.pathway_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES public.pathways(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pathway_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_progress TO authenticated;
GRANT ALL ON public.pathway_progress TO service_role;
ALTER TABLE public.pathway_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pathway progress" ON public.pathway_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pathway progress" ON public.pathway_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own pathway progress" ON public.pathway_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
