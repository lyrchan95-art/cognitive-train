
-- ARTICLES (CMS)
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  read_minutes integer NOT NULL DEFAULT 3,
  tags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles are public" ON public.articles FOR SELECT USING (published = true);
CREATE POLICY "Admins manage articles" ON public.articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ARTICLE ↔ ARCHETYPE tagging
CREATE TABLE public.article_archetypes (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  archetype_slug text NOT NULL REFERENCES public.archetypes(slug) ON DELETE CASCADE,
  PRIMARY KEY (article_id, archetype_slug)
);
GRANT SELECT ON public.article_archetypes TO anon, authenticated;
GRANT ALL ON public.article_archetypes TO service_role;
ALTER TABLE public.article_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Article tags are public" ON public.article_archetypes FOR SELECT USING (true);
CREATE POLICY "Admins manage article tags" ON public.article_archetypes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_article_archetypes_slug ON public.article_archetypes(archetype_slug);

-- LIKES
CREATE TABLE public.article_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
GRANT SELECT, INSERT, DELETE ON public.article_likes TO authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own likes" ON public.article_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own likes" ON public.article_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.article_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WORKPLACE AUDIT
CREATE TABLE public.workplace_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autonomy numeric NOT NULL,
  psychological_safety numeric NOT NULL,
  workload numeric NOT NULL,
  recognition numeric NOT NULL,
  purpose numeric NOT NULL,
  toxicity_score numeric NOT NULL,
  responses jsonb NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workplace_audits TO authenticated;
GRANT ALL ON public.workplace_audits TO service_role;
ALTER TABLE public.workplace_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own audits" ON public.workplace_audits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own audits" ON public.workplace_audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own audits" ON public.workplace_audits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_workplace_audits_user ON public.workplace_audits(user_id, taken_at DESC);

-- DAILY BRIEFINGS
CREATE TABLE public.daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  archetype_slug text NOT NULL,
  content text NOT NULL,
  focus text NOT NULL,
  micro_action text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, briefing_date)
);
GRANT SELECT, INSERT, UPDATE ON public.daily_briefings TO authenticated;
GRANT ALL ON public.daily_briefings TO service_role;
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own briefings" ON public.daily_briefings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own briefings" ON public.daily_briefings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own briefings" ON public.daily_briefings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_daily_briefings_user_date ON public.daily_briefings(user_id, briefing_date DESC);

-- STREAKS / PROGRESS
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_check_in date,
  total_briefings_read integer NOT NULL DEFAULT 0,
  total_articles_read integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own streak" ON public.user_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.user_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_streaks_updated BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
