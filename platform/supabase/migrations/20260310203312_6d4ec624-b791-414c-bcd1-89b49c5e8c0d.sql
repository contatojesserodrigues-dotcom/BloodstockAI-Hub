
-- PEDIGREES_FULL: Complete 5-generation pedigree with genetic analysis
CREATE TABLE IF NOT EXISTS public.pedigrees_full (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  horse_name TEXT NOT NULL UNIQUE,

  -- GENERATION 1
  sire TEXT,
  dam TEXT,

  -- GENERATION 2
  sire_sire TEXT,
  sire_dam TEXT,
  dam_sire TEXT,
  dam_dam TEXT,

  -- GENERATION 3 (8 ancestors)
  sire_sire_sire TEXT,
  sire_sire_dam TEXT,
  sire_dam_sire TEXT,
  sire_dam_dam TEXT,
  dam_sire_sire TEXT,
  dam_sire_dam TEXT,
  dam_dam_sire TEXT,
  dam_dam_dam TEXT,

  -- GENERATION 4 (16 ancestors) — stored as JSONB
  gen4 JSONB,

  -- GENERATION 5 (32 ancestors) — stored as JSONB
  gen5 JSONB,

  -- GENETIC CALCULATIONS
  inbreeding_coefficient DECIMAL,
  inbreeding_patterns TEXT[],
  chefs_de_race JSONB,
  dosage_profile TEXT,
  dosage_index DECIMAL,
  center_of_distribution DECIMAL,
  dosage_interpretation TEXT,

  -- BLOODLINE ANALYSIS
  sire_line TEXT,
  dam_line TEXT,
  nick_rating TEXT,
  nick_notes TEXT,
  northern_dancer_percent DECIMAL,
  native_dancer_percent DECIMAL,
  mr_prospector_percent DECIMAL,
  nearco_percent DECIMAL,
  blood_percentages JSONB,

  -- PERFORMANCE PREDICTIONS
  avg_distance_winners TEXT,
  surface_affinity TEXT,
  class_indicator TEXT,

  -- METADATA
  pedigree_sources TEXT[],
  confidence_score DECIMAL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pedigrees_full ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pedigrees_full" ON public.pedigrees_full
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view pedigrees_full" ON public.pedigrees_full
  FOR SELECT USING (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_pedigrees_full_horse_name ON public.pedigrees_full (horse_name);

-- Update get_db_stats to include pedigrees_full
CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'horses_count', (SELECT COUNT(*) FROM public.horses),
    'pedigrees_count', (SELECT COUNT(*) FROM public.pedigrees),
    'pedigrees_full_count', (SELECT COUNT(*) FROM public.pedigrees_full),
    'race_results_count', (SELECT COUNT(*) FROM public.race_results),
    'sales_history_count', (SELECT COUNT(*) FROM public.sales_history),
    'catalogues_count', (SELECT COUNT(*) FROM public.catalogues),
    'catalogue_lots_count', (SELECT COUNT(*) FROM public.catalogue_lots),
    'sires_count', (SELECT COUNT(*) FROM public.sires),
    'dams_count', (SELECT COUNT(*) FROM public.dams),
    'search_cache_count', (SELECT COUNT(*) FROM public.search_cache),
    'data_sources_count', (SELECT COUNT(*) FROM public.data_sources_log),
    'last_updated', NOW()
  ) INTO result;
  RETURN result;
END;
$$;
