
-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'homepage',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow edge functions with service role to manage, no public access needed
CREATE POLICY "Admins can manage subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Email logs table
CREATE TABLE public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
