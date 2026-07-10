-- Create published_reports table for weekly PDF sales
CREATE TABLE IF NOT EXISTS public.published_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL, -- 'auction', 'pedigree', 'performance', 'trends'
  pdf_url TEXT NOT NULL,
  cover_image_url TEXT,
  price NUMERIC DEFAULT 0, -- Price in EUR for one-time purchase
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auction_house TEXT, -- 'keeneland', 'magic_millions', 'goffs', 'tattersalls_ie', 'tattersalls_uk'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create report_purchases table to track purchases
CREATE TABLE IF NOT EXISTS public.report_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.published_reports(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  price_paid NUMERIC NOT NULL,
  UNIQUE(user_id, report_id)
);

-- Enable RLS
ALTER TABLE public.published_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for published_reports
CREATE POLICY "Anyone can view published reports"
  ON public.published_reports
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage published reports"
  ON public.published_reports
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for report_purchases
CREATE POLICY "Users can view own purchases"
  ON public.report_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases"
  ON public.report_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.report_purchases
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_published_reports_type ON public.published_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_published_reports_published_at ON public.published_reports(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_reports_auction_house ON public.published_reports(auction_house);
CREATE INDEX IF NOT EXISTS idx_report_purchases_user_id ON public.report_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_report_purchases_report_id ON public.report_purchases(report_id);

-- Trigger for updated_at
CREATE TRIGGER update_published_reports_updated_at
  BEFORE UPDATE ON public.published_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();