
-- Add new columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS country text;

-- Add VAT columns to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS vat_number_used text,
  ADD COLUMN IF NOT EXISTS account_type text;

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  analyses_used integer NOT NULL DEFAULT 0,
  analyses_allowed integer NOT NULL DEFAULT 3,
  period_start date DEFAULT date_trunc('month', now()),
  period_end date DEFAULT (date_trunc('month', now()) + interval '1 month - 1 day'),
  expiry_date timestamp with time zone,
  payment_type text DEFAULT 'free',
  revolut_payment_id text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_tracking
CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
