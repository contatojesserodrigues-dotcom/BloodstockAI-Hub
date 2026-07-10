
CREATE TYPE public.horse_inspection_category AS ENUM (
  'FOAL','YEARLING','FLAT_IN_TRAINING','NH_STORE_YOUNG','NH_IN_TRAINING','BROODMARE_STALLION'
);

CREATE TYPE public.inspection_media_purpose AS ENUM (
  'STATIC_CONFORMATION','GAIT_WALK','GAIT_TROT','HOOF_DETAIL','MUSCULATURE','FULL_BODY_VIDEO'
);

CREATE TABLE public.inspection_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  horse_name text NOT NULL,
  lot_ref text,
  sale_context text,
  horse_category public.horse_inspection_category NOT NULL,
  consolidated_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_analyses TO authenticated;
GRANT ALL ON public.inspection_analyses TO service_role;
ALTER TABLE public.inspection_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.inspection_analyses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_inspection_analyses_updated
  BEFORE UPDATE ON public.inspection_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inspection_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  media_purpose public.inspection_media_purpose NOT NULL,
  file_urls text[] NOT NULL DEFAULT '{}',
  block_score numeric,
  score_breakdown jsonb,
  measurements_json jsonb,
  attention_points text[] DEFAULT '{}',
  observations text,
  bloodstock_insight text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_blocks TO authenticated;
GRANT ALL ON public.inspection_blocks TO service_role;
ALTER TABLE public.inspection_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks via own analysis" ON public.inspection_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

CREATE INDEX idx_inspection_blocks_analysis ON public.inspection_blocks(analysis_id, created_at);
CREATE INDEX idx_inspection_analyses_user ON public.inspection_analyses(user_id, created_at DESC);
