
CREATE TABLE public.plan_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  plan_interest TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.plan_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role) to insert, no public access needed
CREATE POLICY "Service role can manage inquiries"
  ON public.plan_inquiries
  FOR ALL
  USING (true)
  WITH CHECK (true);
