
CREATE TABLE IF NOT EXISTS public.newsletter_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source_url TEXT,
  type TEXT NOT NULL DEFAULT 'newsletter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.newsletter_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view newsletter leads"
  ON public.newsletter_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage newsletter leads"
  ON public.newsletter_leads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_newsletter_leads_email ON public.newsletter_leads(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_leads_created ON public.newsletter_leads(created_at DESC);
