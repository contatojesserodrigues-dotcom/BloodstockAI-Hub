-- Create search_history table to track all client searches
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- 'horse_search', 'mating_analysis', 'broodmare_plan'
  search_query JSONB NOT NULL, -- stores the search parameters
  results_data JSONB, -- stores the results for learning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_feedback table to track effectiveness and improve AI
CREATE TABLE IF NOT EXISTS public.analysis_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  analysis_id UUID, -- reference to specific analysis
  accuracy_score NUMERIC, -- user satisfaction/accuracy
  helpful BOOLEAN,
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extracted_data table to store all data from uploads and searches
CREATE TABLE IF NOT EXISTS public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'pdf_upload', 'image_upload', 'web_search'
  source_id UUID, -- reference to pdf_uploads or other source
  horse_name TEXT,
  pedigree_data JSONB,
  performance_data JSONB,
  sales_data JSONB,
  progeny_data JSONB,
  siblings_data JSONB,
  raw_data JSONB, -- full extracted data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_history
CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for analysis_feedback
CREATE POLICY "Users can view own feedback"
  ON public.analysis_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.analysis_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.analysis_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for extracted_data
CREATE POLICY "Users can view own extracted data"
  ON public.extracted_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own extracted data"
  ON public.extracted_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_type ON public.search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_user_id ON public.analysis_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_user_id ON public.extracted_data(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_horse_name ON public.extracted_data(horse_name);

-- Create trigger for updated_at
CREATE TRIGGER update_extracted_data_updated_at
  BEFORE UPDATE ON public.extracted_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();