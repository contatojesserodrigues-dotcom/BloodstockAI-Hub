
-- Add missing columns to existing horses table
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS trainer TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS stud_farm TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS stud_fee TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS is_stallion BOOLEAN DEFAULT false;

-- PEDIGREES: Full pedigree tree
CREATE TABLE IF NOT EXISTS public.pedigrees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
  horse_name TEXT NOT NULL,
  generation_1_sire TEXT,
  generation_1_dam TEXT,
  generation_2_sire_sire TEXT,
  generation_2_sire_dam TEXT,
  generation_2_dam_sire TEXT,
  generation_2_dam_dam TEXT,
  generation_3 JSONB,
  generation_4 JSONB,
  inbreeding_coefficient DECIMAL,
  inbreeding_patterns TEXT[],
  dosage_profile TEXT,
  dosage_index DECIMAL,
  center_of_distribution DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(horse_name)
);

-- RACE RESULTS: Full race history
CREATE TABLE IF NOT EXISTS public.race_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
  horse_name TEXT NOT NULL,
  race_date DATE,
  race_name TEXT,
  race_grade TEXT,
  track TEXT,
  country TEXT,
  distance TEXT,
  surface TEXT,
  finish_position INTEGER,
  runners INTEGER,
  time TEXT,
  margin TEXT,
  jockey TEXT,
  trainer TEXT,
  weight TEXT,
  odds TEXT,
  prize_money DECIMAL,
  currency TEXT,
  speed_rating INTEGER,
  rpr INTEGER,
  timeform_rating INTEGER,
  beyer_figure INTEGER,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SALES HISTORY: Auction results
CREATE TABLE IF NOT EXISTS public.sales_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
  horse_name TEXT,
  sale_name TEXT NOT NULL,
  auction_house TEXT,
  sale_date DATE,
  sale_year INTEGER,
  session TEXT,
  lot_number TEXT,
  price DECIMAL,
  currency TEXT,
  price_usd DECIMAL,
  buyer TEXT,
  seller TEXT,
  consignor TEXT,
  age_at_sale TEXT,
  sex TEXT,
  sire TEXT,
  dam TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CATALOGUES: Raw auction catalogue data
CREATE TABLE IF NOT EXISTS public.catalogues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_house TEXT NOT NULL,
  sale_name TEXT NOT NULL,
  sale_year INTEGER,
  sale_date DATE,
  pdf_url TEXT,
  pdf_processed BOOLEAN DEFAULT false,
  total_lots INTEGER,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CATALOGUE LOTS: Individual entries from catalogues
CREATE TABLE IF NOT EXISTS public.catalogue_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  catalogue_id UUID REFERENCES public.catalogues(id) ON DELETE CASCADE,
  lot_number TEXT,
  horse_name TEXT,
  sex TEXT,
  dob DATE,
  color TEXT,
  sire TEXT,
  dam TEXT,
  dam_sire TEXT,
  breeder TEXT,
  consignor TEXT,
  reserve_price DECIMAL,
  sold_price DECIMAL,
  currency TEXT,
  buyer TEXT,
  withdrawn BOOLEAN DEFAULT false,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SIRES: Stallion profiles and statistics
CREATE TABLE IF NOT EXISTS public.sires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  country TEXT,
  stud_farm TEXT,
  stud_fee TEXT,
  year_born INTEGER,
  sire_of_sire TEXT,
  dam_of_sire TEXT,
  total_runners INTEGER,
  total_winners INTEGER,
  winners_percent DECIMAL,
  stakes_winners INTEGER,
  stakes_winners_percent DECIMAL,
  average_earnings DECIMAL,
  median_earnings DECIMAL,
  top_performers JSONB,
  turf_percent DECIMAL,
  dirt_percent DECIMAL,
  aw_percent DECIMAL,
  avg_winning_distance TEXT,
  avg_sale_price DECIMAL,
  median_sale_price DECIMAL,
  top_sale_price DECIMAL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DAMS: Mare profiles and produce records
CREATE TABLE IF NOT EXISTS public.dams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  country TEXT,
  year_born INTEGER,
  sire TEXT,
  dam TEXT,
  race_record JSONB,
  total_foals INTEGER,
  total_winners INTEGER,
  stakes_winners INTEGER,
  produce_record JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEARCH CACHE: Store every Perplexity search result
CREATE TABLE IF NOT EXISTS public.search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  horse_name TEXT,
  perplexity_raw_data TEXT,
  claude_analysis TEXT,
  sources_used TEXT[],
  search_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- DATA SOURCES LOG: Track what was collected from where
CREATE TABLE IF NOT EXISTS public.data_sources_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT,
  source_url TEXT,
  data_type TEXT,
  records_collected INTEGER,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT,
  error_message TEXT
);

-- Enable RLS on all new tables
ALTER TABLE public.pedigrees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources_log ENABLE ROW LEVEL SECURITY;

-- Public read for reference data
CREATE POLICY "Anyone can view pedigrees" ON public.pedigrees FOR SELECT USING (true);
CREATE POLICY "Anyone can view race_results" ON public.race_results FOR SELECT USING (true);
CREATE POLICY "Anyone can view sales_history" ON public.sales_history FOR SELECT USING (true);
CREATE POLICY "Anyone can view catalogues" ON public.catalogues FOR SELECT USING (true);
CREATE POLICY "Anyone can view catalogue_lots" ON public.catalogue_lots FOR SELECT USING (true);
CREATE POLICY "Anyone can view sires" ON public.sires FOR SELECT USING (true);
CREATE POLICY "Anyone can view dams" ON public.dams FOR SELECT USING (true);
CREATE POLICY "Anyone can view search_cache" ON public.search_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can view data_sources_log" ON public.data_sources_log FOR SELECT USING (true);

-- Admin write for all tables
CREATE POLICY "Admins can manage pedigrees" ON public.pedigrees FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage race_results" ON public.race_results FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage sales_history" ON public.sales_history FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage catalogues" ON public.catalogues FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage catalogue_lots" ON public.catalogue_lots FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage sires" ON public.sires FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage dams" ON public.dams FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage search_cache" ON public.search_cache FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can manage data_sources_log" ON public.data_sources_log FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pedigrees_horse_name ON public.pedigrees(horse_name);
CREATE INDEX IF NOT EXISTS idx_race_results_horse_name ON public.race_results(horse_name);
CREATE INDEX IF NOT EXISTS idx_race_results_horse_id ON public.race_results(horse_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_horse_name ON public.sales_history(horse_name);
CREATE INDEX IF NOT EXISTS idx_catalogue_lots_sire ON public.catalogue_lots(sire);
CREATE INDEX IF NOT EXISTS idx_catalogue_lots_dam ON public.catalogue_lots(dam);
CREATE INDEX IF NOT EXISTS idx_search_cache_horse_name ON public.search_cache(horse_name);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON public.search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_horses_slug ON public.horses(slug);
CREATE INDEX IF NOT EXISTS idx_sires_name ON public.sires(name);
CREATE INDEX IF NOT EXISTS idx_dams_name ON public.dams(name);

-- Function to get database stats (for admin widget)
CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS JSON
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
