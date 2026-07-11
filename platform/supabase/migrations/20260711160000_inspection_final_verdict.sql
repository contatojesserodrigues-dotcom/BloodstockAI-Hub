-- Final Buyer Verdict — persisted Claude synthesis on inspection_analyses

ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS final_verdict jsonb,
  ADD COLUMN IF NOT EXISTS final_verdict_generated_at timestamptz;

COMMENT ON COLUMN public.inspection_analyses.final_verdict IS 'Structured BUY/WATCH/PASS verdict from inspection-final-verdict edge function';
COMMENT ON COLUMN public.inspection_analyses.final_verdict_generated_at IS 'Timestamp when final_verdict was last generated';
