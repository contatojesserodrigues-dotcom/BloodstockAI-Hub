
CREATE TABLE public.catalog_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sale_name text NOT NULL,
  sale_date date,
  sale_location text,
  breed_type text CHECK (breed_type IN ('Flat','NH')),
  foaling_year int,
  currency text,
  extraction jsonb NOT NULL DEFAULT '[]'::jsonb,
  research jsonb NOT NULL DEFAULT '{}'::jsonb,
  scored_lots jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  shortlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_analyses TO authenticated;
GRANT ALL ON public.catalog_analyses TO service_role;
ALTER TABLE public.catalog_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own catalog analyses"
  ON public.catalog_analyses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.catalog_research_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.catalog_research_cache TO service_role;
ALTER TABLE public.catalog_research_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only research cache"
  ON public.catalog_research_cache FOR ALL
  USING (false) WITH CHECK (false);

-- Security finding fix: ensure internal_notes is never readable via public SELECT policy
REVOKE SELECT (internal_notes) ON public.marketplace_listings FROM anon;
REVOKE SELECT (internal_notes) ON public.marketplace_listings FROM authenticated;
