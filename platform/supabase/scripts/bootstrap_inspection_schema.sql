-- BloodstockAI — Bootstrap Sale Inspection schema
-- Run once in Supabase Dashboard → SQL Editor → New query → Run
-- Project: uzkicvizgezitiyhihcq
-- Fixes: "Could not find the table public.inspection_analyses in the schema cache"

-- 1) Helper function (safe if already exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.horse_inspection_category AS ENUM (
    'FOAL','YEARLING','FLAT_IN_TRAINING','NH_STORE_YOUNG','NH_IN_TRAINING','BROODMARE_STALLION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inspection_media_purpose AS ENUM (
    'STATIC_CONFORMATION','GAIT_WALK','GAIT_TROT','HOOF_DETAIL','MUSCULATURE','FULL_BODY_VIDEO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TYPE public.inspection_media_purpose ADD VALUE IF NOT EXISTS 'BREEZE_UP'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.inspection_media_purpose ADD VALUE IF NOT EXISTS 'GAIT_GALLOP'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'WEANLING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'BREEZE_UP'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'STALLION_PROSPECT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'FLAT_YEARLING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Core tables
CREATE TABLE IF NOT EXISTS public.inspection_analyses (
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

CREATE TABLE IF NOT EXISTS public.inspection_blocks (
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

-- 4) Extend inspection_analyses
ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS pedigree_pdf_url text,
  ADD COLUMN IF NOT EXISTS pedigree_pdf_name text,
  ADD COLUMN IF NOT EXISTS pedigree_insight text,
  ADD COLUMN IF NOT EXISTS pedigree_summary jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS flag text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pedigree_meta jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_research jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_annotations jsonb,
  ADD COLUMN IF NOT EXISTS market_estimate jsonb,
  ADD COLUMN IF NOT EXISTS roi_projection jsonb,
  ADD COLUMN IF NOT EXISTS buyer_notes text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS breed text DEFAULT 'Thoroughbred',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS auction_name text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'equine_intelligence_v1',
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS elite_potential_score numeric,
  ADD COLUMN IF NOT EXISTS pedigree_intelligence_score numeric,
  ADD COLUMN IF NOT EXISTS behaviour_score numeric,
  ADD COLUMN IF NOT EXISTS hoof_health_score numeric,
  ADD COLUMN IF NOT EXISTS conformation_score numeric,
  ADD COLUMN IF NOT EXISTS biomechanics_score numeric,
  ADD COLUMN IF NOT EXISTS g1_potential_index jsonb,
  ADD COLUMN IF NOT EXISTS distance_profile jsonb,
  ADD COLUMN IF NOT EXISTS soundness_risk text,
  ADD COLUMN IF NOT EXISTS intelligence_scores jsonb,
  ADD COLUMN IF NOT EXISTS roi_prediction jsonb,
  ADD COLUMN IF NOT EXISTS raw_metrics_json jsonb,
  ADD COLUMN IF NOT EXISTS calculated_metrics_json jsonb,
  ADD COLUMN IF NOT EXISTS scientific_version_json jsonb,
  ADD COLUMN IF NOT EXISTS last_scoring_run_id uuid,
  ADD COLUMN IF NOT EXISTS processing_step jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processing_progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intelligence_bundle jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS final_verdict jsonb,
  ADD COLUMN IF NOT EXISTS final_verdict_generated_at timestamptz;

-- 5) Intelligence engine tables
CREATE TABLE IF NOT EXISTS public.inspection_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.inspection_blocks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  video_type text NOT NULL DEFAULT 'general',
  mime_type text,
  file_size_bytes bigint,
  duration_seconds numeric,
  frame_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.inspection_videos(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.inspection_blocks(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  frame_index integer NOT NULL DEFAULT 0,
  timestamp_ms integer NOT NULL DEFAULT 0,
  storage_path text,
  keypoints jsonb,
  angles jsonb,
  stride_phase text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_biomechanical_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.inspection_blocks(id) ON DELETE SET NULL,
  stride_length_estimate numeric,
  stride_frequency numeric,
  stride_consistency numeric,
  stride_efficiency numeric,
  limb_symmetry_score numeric,
  joint_efficiency_score numeric,
  suspension_phase text,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_conformation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.inspection_blocks(id) ON DELETE SET NULL,
  view_type text NOT NULL DEFAULT 'lateral',
  conformation_score numeric,
  scores_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_pedigree_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL UNIQUE REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  pedigree_intelligence_score numeric,
  sire text,
  dam text,
  damsire text,
  maternal_family text,
  black_type_summary text,
  extraction_json jsonb,
  analysis_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'full',
  report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_inspection_analyses_user ON public.inspection_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_blocks_analysis ON public.inspection_blocks(analysis_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inspection_analyses_flag ON public.inspection_analyses(user_id, flag);
CREATE INDEX IF NOT EXISTS idx_inspection_analyses_status ON public.inspection_analyses(user_id, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_scoring_runs_inspection ON public.inspection_scoring_runs(inspection_id, created_at DESC);

-- 7) RLS + grants
ALTER TABLE public.inspection_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_biomechanical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_conformation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_pedigree_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_scoring_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_frames TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_biomechanical_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_conformation_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_pedigree_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_reports TO authenticated;
GRANT SELECT ON public.inspection_scoring_runs TO authenticated;

GRANT ALL ON public.inspection_analyses TO service_role;
GRANT ALL ON public.inspection_blocks TO service_role;
GRANT ALL ON public.inspection_videos TO service_role;
GRANT ALL ON public.inspection_frames TO service_role;
GRANT ALL ON public.inspection_biomechanical_metrics TO service_role;
GRANT ALL ON public.inspection_conformation_scores TO service_role;
GRANT ALL ON public.inspection_pedigree_analysis TO service_role;
GRANT ALL ON public.inspection_reports TO service_role;
GRANT ALL ON public.inspection_scoring_runs TO service_role;

DO $$ BEGIN
  CREATE POLICY "own analyses" ON public.inspection_analyses FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "blocks via own analysis" ON public.inspection_blocks FOR ALL
    USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own inspection videos" ON public.inspection_videos FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own scoring runs" ON public.inspection_scoring_runs FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages scoring runs" ON public.inspection_scoring_runs FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8) Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('inspection-videos', 'inspection-videos', false, 104857600, ARRAY['video/mp4','video/quicktime','video/webm','video/x-msvideo']),
  ('inspection-frames', 'inspection-frames', false, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('inspection-biomechanics', 'inspection-biomechanics', false, 20971520, ARRAY['image/png','image/jpeg','application/pdf']),
  ('inspection-pedigrees', 'inspection-pedigrees', false, 15728640, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 9) Trigger
DROP TRIGGER IF EXISTS trg_inspection_analyses_updated ON public.inspection_analyses;
CREATE TRIGGER trg_inspection_analyses_updated
  BEFORE UPDATE ON public.inspection_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Done — refresh platform and try Create New Inspection again
