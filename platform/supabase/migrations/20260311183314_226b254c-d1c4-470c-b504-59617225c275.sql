
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  company_name TEXT,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  vat_rate NUMERIC DEFAULT 0,
  vat_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'Revolut',
  revolut_order_id TEXT,
  billing_cycle TEXT,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Service can insert invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (true);
