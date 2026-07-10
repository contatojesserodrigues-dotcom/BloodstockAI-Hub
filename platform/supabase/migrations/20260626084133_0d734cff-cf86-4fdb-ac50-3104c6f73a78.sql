
CREATE TABLE public.broodmare_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mare jsonb NOT NULL,
  objectives text[] NOT NULL DEFAULT '{}',
  duration_years int NOT NULL CHECK (duration_years BETWEEN 2 AND 6),
  pedigree_extraction jsonb,
  analytics jsonb NOT NULL DEFAULT '{}'::jsonb,
  seasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broodmare_plans_v2 TO authenticated;
GRANT ALL ON public.broodmare_plans_v2 TO service_role;

ALTER TABLE public.broodmare_plans_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own broodmare plans v2"
ON public.broodmare_plans_v2 FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_broodmare_plans_v2_updated_at
BEFORE UPDATE ON public.broodmare_plans_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.breeding_market_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.breeding_market_cache TO authenticated;
GRANT ALL ON public.breeding_market_cache TO service_role;

ALTER TABLE public.breeding_market_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read breeding cache"
ON public.breeding_market_cache FOR SELECT
TO authenticated USING (true);
