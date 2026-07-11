-- Stripe billing columns and payment provider tracking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'revolut';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'revolut',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
