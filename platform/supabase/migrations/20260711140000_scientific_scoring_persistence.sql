-- Scientific Scoring Engine persistence — raw metrics, calculated metrics, versioning
-- Python is the single source of truth for all scoring formulas.

CREATE TABLE IF NOT EXISTS public.inspection_scoring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  raw_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  scientific_version jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_scoring_runs_inspection
  ON public.inspection_scoring_runs(inspection_id, created_at DESC);

ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS raw_metrics_json jsonb,
  ADD COLUMN IF NOT EXISTS calculated_metrics_json jsonb,
  ADD COLUMN IF NOT EXISTS scientific_version_json jsonb,
  ADD COLUMN IF NOT EXISTS last_scoring_run_id uuid REFERENCES public.inspection_scoring_runs(id) ON DELETE SET NULL;

ALTER TABLE public.inspection_reports
  DROP CONSTRAINT IF EXISTS inspection_reports_report_type_check;

-- Allow scientific report type (ignore if constraint doesn't exist)
DO $$ BEGIN
  ALTER TABLE public.inspection_reports
    ADD CONSTRAINT inspection_reports_report_type_check
    CHECK (report_type IN ('full', 'summary', 'scientific'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.inspection_scoring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scoring runs"
  ON public.inspection_scoring_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages scoring runs"
  ON public.inspection_scoring_runs FOR ALL
  USING (auth.role() = 'service_role');
