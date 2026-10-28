-- Daily check-ins: inputs to the burnout-risk model (risk-v1).
CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Hong_Kong')::date,
  energy smallint NOT NULL CHECK (energy BETWEEN 1 AND 5),
  stress smallint NOT NULL CHECK (stress BETWEEN 1 AND 5),
  workload smallint NOT NULL CHECK (workload BETWEEN 1 AND 5),
  control smallint NOT NULL CHECK (control BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own check-ins" ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own check-ins" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own check-ins" ON public.daily_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own check-ins" ON public.daily_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, checkin_date DESC);

-- Team pilot requests from the public /teams page. Inserted server-side only.
CREATE TABLE public.pilot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  team_size text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pilot_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view pilot requests" ON public.pilot_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
