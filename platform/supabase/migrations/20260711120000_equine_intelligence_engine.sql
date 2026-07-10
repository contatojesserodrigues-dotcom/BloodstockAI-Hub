-- BloodstockAI Equine Intelligence Inspection Engine™ — Phase 1 schema
-- Extends existing inspection_analyses / inspection_blocks without breaking legacy data.

-- Extend media purpose enum (BREEZE_UP used in UI but missing from DB)
DO $$ BEGIN
  ALTER TYPE public.inspection_media_purpose ADD VALUE IF NOT EXISTS 'BREEZE_UP';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.inspection_media_purpose ADD VALUE IF NOT EXISTS 'GAIT_GALLOP';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend horse category enum with premium workflow categories
DO $$ BEGIN
  ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'WEANLING';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'BREEZE_UP';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'STALLION_PROSPECT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.horse_inspection_category ADD VALUE IF NOT EXISTS 'FLAT_YEARLING';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rich horse profile + intelligence scores on existing table
ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS breed text DEFAULT 'Thoroughbred',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS auction_name text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'equine_intelligence_v1',
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'draft'
    CHECK (processing_status IN ('draft','uploading','processing','complete','failed')),
  ADD COLUMN IF NOT EXISTS elite_potential_score numeric,
  ADD COLUMN IF NOT EXISTS pedigree_intelligence_score numeric,
  ADD COLUMN IF NOT EXISTS behaviour_score numeric,
  ADD COLUMN IF NOT EXISTS hoof_health_score numeric,
  ADD COLUMN IF NOT EXISTS conformation_score numeric,
  ADD COLUMN IF NOT EXISTS biomechanics_score numeric,
  ADD COLUMN IF NOT EXISTS g1_potential_index jsonb,
  ADD COLUMN IF NOT EXISTS distance_profile jsonb,
  ADD COLUMN IF NOT EXISTS soundness_risk text
    CHECK (soundness_risk IS NULL OR soundness_risk IN ('Low','Medium','High')),
  ADD COLUMN IF NOT EXISTS intelligence_scores jsonb,
  ADD COLUMN IF NOT EXISTS roi_prediction jsonb;

CREATE INDEX IF NOT EXISTS idx_inspection_analyses_status
  ON public.inspection_analyses(user_id, processing_status, created_at DESC);

-- Raw video uploads (persisted — fixes reload / retroactive pose)
CREATE TABLE IF NOT EXISTS public.inspection_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.inspection_analyses(id) ON DELETE CASCADE,
  block_id uuid REFERENCES public.inspection_blocks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  video_type text NOT NULL DEFAULT 'general'
    CHECK (video_type IN ('walk','trot','gallop','breeze','general')),
  mime_type text,
  file_size_bytes bigint,
  duration_seconds numeric,
  frame_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','processing','complete','failed')),
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
  view_type text NOT NULL DEFAULT 'lateral'
    CHECK (view_type IN ('lateral','front','rear','composite')),
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
  report_type text NOT NULL DEFAULT 'full'
    CHECK (report_type IN ('full','summary','investment')),
  report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.inspection_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_biomechanical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_conformation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_pedigree_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_frames TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_biomechanical_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_conformation_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_pedigree_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_reports TO authenticated;

GRANT ALL ON public.inspection_videos TO service_role;
GRANT ALL ON public.inspection_frames TO service_role;
GRANT ALL ON public.inspection_biomechanical_metrics TO service_role;
GRANT ALL ON public.inspection_conformation_scores TO service_role;
GRANT ALL ON public.inspection_pedigree_analysis TO service_role;
GRANT ALL ON public.inspection_reports TO service_role;

CREATE POLICY "own inspection videos" ON public.inspection_videos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "frames via own analysis" ON public.inspection_frames FOR ALL
  USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

CREATE POLICY "biomech via own analysis" ON public.inspection_biomechanical_metrics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

CREATE POLICY "conformation via own analysis" ON public.inspection_conformation_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

CREATE POLICY "pedigree analysis via own" ON public.inspection_pedigree_analysis FOR ALL
  USING (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspection_analyses a WHERE a.id = analysis_id AND a.user_id = auth.uid()));

CREATE POLICY "reports via own" ON public.inspection_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inspection_videos_analysis ON public.inspection_videos(analysis_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_frames_block ON public.inspection_frames(block_id, frame_index);
CREATE INDEX IF NOT EXISTS idx_inspection_biomech_analysis ON public.inspection_biomechanical_metrics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_analysis ON public.inspection_reports(analysis_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('inspection-videos', 'inspection-videos', false, 104857600, ARRAY['video/mp4','video/quicktime','video/webm','video/x-msvideo']),
  ('inspection-frames', 'inspection-frames', false, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('inspection-biomechanics', 'inspection-biomechanics', false, 20971520, ARRAY['image/png','image/jpeg','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: user_id/analysis_id folder structure
DO $$ BEGIN
  CREATE POLICY "Users read own inspection videos storage"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users upload own inspection videos storage"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own inspection frames storage"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-frames' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users upload own inspection frames storage"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-frames' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own inspection biomechanics storage"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-biomechanics' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users upload own inspection biomechanics storage"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-biomechanics' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
