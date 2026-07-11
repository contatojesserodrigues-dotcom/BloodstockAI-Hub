-- Async progress + unified intelligence bundle for Sale Inspection upgrade

ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS processing_step jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processing_progress integer DEFAULT 0
    CHECK (processing_progress >= 0 AND processing_progress <= 100),
  ADD COLUMN IF NOT EXISTS intelligence_bundle jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inspection_analyses.processing_step IS
  'Current async step e.g. {"module":"tavily_research","status":"running","started_at":"..."}';
COMMENT ON COLUMN public.inspection_analyses.intelligence_bundle IS
  'Unified JSON: pedigree, market, biomechanics, behaviour, hoof, scores, prediction';
