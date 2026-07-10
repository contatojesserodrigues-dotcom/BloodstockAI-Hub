
-- 1. training_horses
CREATE TABLE public.training_horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  breed TEXT,
  sire TEXT,
  dam TEXT,
  dam_sire TEXT,
  trainer TEXT,
  owner TEXT,
  stable TEXT,
  country TEXT,
  training_centre TEXT,
  racing_code TEXT,
  status TEXT DEFAULT 'In Training',
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_horses TO authenticated;
GRANT ALL ON public.training_horses TO service_role;
ALTER TABLE public.training_horses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training horses"
  ON public.training_horses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER training_horses_updated_at BEFORE UPDATE ON public.training_horses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. training_sessions
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.training_horses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  surface TEXT,
  distance_m INTEGER,
  exercise_type TEXT,
  rider TEXT,
  weather TEXT,
  ground_condition TEXT,
  trainer_notes TEXT,
  vet_notes TEXT,
  video_url TEXT,
  gps_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training sessions"
  ON public.training_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER training_sessions_updated_at BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX training_sessions_horse_idx ON public.training_sessions(horse_id, session_date DESC);

-- 3. training_video_analyses
CREATE TABLE public.training_video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_narrative TEXT,
  recommendations JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'claude',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_video_analyses TO authenticated;
GRANT ALL ON public.training_video_analyses TO service_role;
ALTER TABLE public.training_video_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training video analyses"
  ON public.training_video_analyses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. training_gps_reports
CREATE TABLE public.training_gps_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  provider TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_gps_reports TO authenticated;
GRANT ALL ON public.training_gps_reports TO service_role;
ALTER TABLE public.training_gps_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training gps reports"
  ON public.training_gps_reports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. training_reports
CREATE TABLE public.training_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.training_horses(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  title TEXT,
  file_url TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_reports TO authenticated;
GRANT ALL ON public.training_reports TO service_role;
ALTER TABLE public.training_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training reports"
  ON public.training_reports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
