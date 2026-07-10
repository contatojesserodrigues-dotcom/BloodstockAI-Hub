CREATE TABLE IF NOT EXISTS public.search_cache_v2 (
  cache_key text PRIMARY KEY,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_cache_v2 TO authenticated;
GRANT ALL ON public.search_cache_v2 TO service_role;
ALTER TABLE public.search_cache_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_cache_v2 read"
  ON public.search_cache_v2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "search_cache_v2 write"
  ON public.search_cache_v2 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "search_cache_v2 update"
  ON public.search_cache_v2 FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS search_cache_v2_created_at_idx ON public.search_cache_v2 (created_at);