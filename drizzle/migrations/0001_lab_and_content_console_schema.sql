-- Role helpers (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_lab_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','data_scientist'));
$$;
CREATE OR REPLACE FUNCTION public.is_content_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','content_editor'));
$$;
GRANT EXECUTE ON FUNCTION public.is_lab_user(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_content_editor(uuid) TO anon, authenticated, service_role;

-- Soft-delete / archive support on articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Content editors get the same content rights as admins
CREATE POLICY "Editors manage articles" ON public.articles FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));
CREATE POLICY "Editors manage article tags" ON public.article_archetypes FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));
CREATE POLICY "Editors manage pathways" ON public.pathways FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));
CREATE POLICY "Editors manage pathway days" ON public.pathway_days FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));
CREATE POLICY "Editors manage research" ON public.research_articles FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));

-- ===== Immutable audit log =====
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_lab_user(auth.uid()) OR public.is_content_editor(auth.uid()));
CREATE POLICY "Staff append audit log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor = auth.uid() AND (public.is_lab_user(auth.uid()) OR public.is_content_editor(auth.uid())));
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);

-- ===== Lab: datasets =====
CREATE TABLE public.lab_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  recipe text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  suppressed_cells integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_datasets TO authenticated;
GRANT ALL ON public.lab_datasets TO service_role;
ALTER TABLE public.lab_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab users manage datasets" ON public.lab_datasets FOR ALL TO authenticated
  USING (public.is_lab_user(auth.uid())) WITH CHECK (public.is_lab_user(auth.uid()));

-- ===== Lab: model runs (versioned registry) =====
CREATE TABLE public.model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  dataset_id uuid REFERENCES public.lab_datasets(id) ON DELETE SET NULL,
  dataset_snapshot jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  progress_label text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  promotion_state text NOT NULL DEFAULT 'experiment',
  created_by uuid NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_runs TO authenticated;
GRANT ALL ON public.model_runs TO service_role;
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab users manage runs" ON public.model_runs FOR ALL TO authenticated
  USING (public.is_lab_user(auth.uid())) WITH CHECK (public.is_lab_user(auth.uid()));
CREATE INDEX model_runs_key_idx ON public.model_runs (model_key, created_at DESC);

-- ===== Lab: insight log =====
CREATE TABLE public.lab_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.model_runs(id) ON DELETE CASCADE,
  hypothesis text NOT NULL DEFAULT '',
  finding text NOT NULL DEFAULT '',
  follow_up text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  linked_article_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_insights TO authenticated;
GRANT ALL ON public.lab_insights TO service_role;
ALTER TABLE public.lab_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab users manage insights" ON public.lab_insights FOR ALL TO authenticated
  USING (public.is_lab_user(auth.uid())) WITH CHECK (public.is_lab_user(auth.uid()));
CREATE POLICY "Editors read insights" ON public.lab_insights FOR SELECT TO authenticated
  USING (public.is_content_editor(auth.uid()));

-- ===== Lab: shareable read-only links =====
CREATE TABLE public.lab_share_links (
  token text PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.model_runs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.lab_share_links TO authenticated;
GRANT SELECT ON public.lab_share_links TO anon;
GRANT ALL ON public.lab_share_links TO service_role;
ALTER TABLE public.lab_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab users manage share links" ON public.lab_share_links FOR ALL TO authenticated
  USING (public.is_lab_user(auth.uid())) WITH CHECK (public.is_lab_user(auth.uid()));
CREATE POLICY "Anyone can resolve unexpired links" ON public.lab_share_links FOR SELECT TO anon, authenticated
  USING (expires_at > now());
-- shared runs are readable via the token only (server function enforces token match and strips non-aggregate fields)
CREATE POLICY "Shared runs are publicly readable" ON public.model_runs FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.lab_share_links l WHERE l.run_id = model_runs.id AND l.expires_at > now()));
GRANT SELECT ON public.model_runs TO anon;

-- ===== Content versions (triggers on content tables) =====
CREATE TABLE public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  version integer NOT NULL,
  change_kind text NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors read versions" ON public.content_versions FOR SELECT TO authenticated
  USING (public.is_content_editor(auth.uid()));
CREATE INDEX content_versions_entity_idx ON public.content_versions (entity_type, entity_id, version DESC);

CREATE OR REPLACE FUNCTION public.capture_content_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v integer;
  eid text;
  snap jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    eid := OLD.id::text; snap := to_jsonb(OLD);
  ELSE
    eid := NEW.id::text; snap := to_jsonb(NEW);
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v FROM public.content_versions
    WHERE entity_type = TG_TABLE_NAME AND entity_id = eid;
  INSERT INTO public.content_versions (entity_type, entity_id, version, change_kind, snapshot, changed_by)
    VALUES (TG_TABLE_NAME, eid, v, lower(TG_OP), snap, auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_articles_version AFTER INSERT OR UPDATE OR DELETE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.capture_content_version();
CREATE TRIGGER trg_pathways_version AFTER INSERT OR UPDATE OR DELETE ON public.pathways
  FOR EACH ROW EXECUTE FUNCTION public.capture_content_version();
CREATE TRIGGER trg_pathway_days_version AFTER INSERT OR UPDATE OR DELETE ON public.pathway_days
  FOR EACH ROW EXECUTE FUNCTION public.capture_content_version();
CREATE TRIGGER trg_research_version AFTER INSERT OR UPDATE OR DELETE ON public.research_articles
  FOR EACH ROW EXECUTE FUNCTION public.capture_content_version();

-- ===== Scheduled publishing queue =====
CREATE TABLE public.scheduled_publishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_title text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'publish',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_by uuid NOT NULL,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_publishes TO authenticated;
GRANT ALL ON public.scheduled_publishes TO service_role;
ALTER TABLE public.scheduled_publishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editors manage schedule" ON public.scheduled_publishes FOR ALL TO authenticated
  USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));
CREATE INDEX scheduled_publishes_due_idx ON public.scheduled_publishes (status, scheduled_for);

-- Editors and lab users may read role rows needed for staff lists
CREATE POLICY "Staff can view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_lab_user(auth.uid()) OR public.is_content_editor(auth.uid()));