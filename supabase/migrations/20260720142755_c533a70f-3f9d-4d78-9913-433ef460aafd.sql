
-- Extend pathway_days with gamification (subtitle + quiz)
ALTER TABLE public.pathway_days
  ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT 'Cognitive Protocol',
  ADD COLUMN IF NOT EXISTS quiz_question TEXT NOT NULL DEFAULT 'Which principle best describes today''s core idea?',
  ADD COLUMN IF NOT EXISTS quiz_options JSONB NOT NULL DEFAULT '["Awareness precedes change","Effort equals outcome","Emotion overrides reason","All work is equal"]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_answer_index INTEGER NOT NULL DEFAULT 0;

-- Extend pathway_progress with journal + quiz + XP
ALTER TABLE public.pathway_progress
  ADD COLUMN IF NOT EXISTS journal_entry TEXT,
  ADD COLUMN IF NOT EXISTS quiz_correct BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 50;

-- ===== Research library =====
CREATE TABLE IF NOT EXISTS public.research_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  authors TEXT,
  category TEXT NOT NULL DEFAULT 'neuroscience', -- neuroscience | behavioral_psychology | editorial | research
  abstract TEXT NOT NULL,
  body TEXT NOT NULL,
  source_url TEXT,
  citation TEXT,
  hero_image_url TEXT,
  published_date DATE NOT NULL DEFAULT CURRENT_DATE,
  read_minutes INTEGER NOT NULL DEFAULT 6,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.research_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_articles TO authenticated;
GRANT ALL ON public.research_articles TO service_role;

ALTER TABLE public.research_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published research"
  ON public.research_articles FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage research"
  ON public.research_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_research_articles_updated
  BEFORE UPDATE ON public.research_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed a few starter research items
INSERT INTO public.research_articles (slug, title, subtitle, authors, category, abstract, body, citation, hero_image_url, read_minutes, sort_order) VALUES
('default-mode-network-and-rest','The Default Mode Network and the Cost of Rest','Why idle minds are not idle brains','Raichle, M. E.','neuroscience',
 'The default mode network activates during rest and self-referential thought, revealing that mental downtime is metabolically expensive and cognitively essential.',
 'The default mode network (DMN) — a set of medial prefrontal, posterior cingulate, and parietal regions — activates when attention turns inward. Far from being noise, this baseline activity supports autobiographical memory, prospection, and moral reasoning. Chronic suppression of the DMN through overwork correlates with rumination and impaired creative insight. Cognitive protocols that build in strategic idleness (walks without inputs, single-task recovery) are not indulgent; they are neurologically load-bearing.',
 'Raichle, M. E. (2015). The Brain''s Default Mode Network. Annual Review of Neuroscience, 38, 433–447.',
 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1600&q=80', 7, 10),
('effort-paradox-behavioral','The Effort Paradox in Modern Work','Why we value what costs us','Inzlicht, M., Shenhav, A., Olivola, C.','behavioral_psychology',
 'Effort is aversive in the moment yet increases the perceived value of outcomes. This paradox reshapes how we design goals and rewards.',
 'Classical economics treats effort as pure cost. Contemporary behavioral research shows the opposite pattern: effortful outcomes are valued more highly than easy ones, an "IKEA effect" extending across domains. For cognitive workers, this predicts that frictionless tools may reduce ownership while structured difficulty increases meaning. The design implication: build interfaces that make important work feel like craftsmanship, not consumption.',
 'Inzlicht, M., Shenhav, A., & Olivola, C. Y. (2018). The Effort Paradox. Trends in Cognitive Sciences, 22(4), 337–349.',
 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80', 6, 20),
('editorial-attention-economy','Editorial: Reclaiming Attention as Infrastructure','The atelier''s stance on the attention economy','The Cognitive Atelier','editorial',
 'A short editorial arguing that attention is civic infrastructure and should be defended with the seriousness of clean water or public transit.',
 'When attention is priced by advertisers rather than protected by institutions, individual willpower cannot compensate. The atelier''s position is straightforward: cognitive hygiene is a shared responsibility, and the tools we build must treat user attention as a resource to be conserved, not extracted. Every archetype in our system is designed with this principle in mind — from the Sentinel''s deep-focus routines to the Explorer''s bounded curiosity windows.',
 'The Cognitive Atelier Editorial Board (2026).',
 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80', 4, 30)
ON CONFLICT (slug) DO NOTHING;
