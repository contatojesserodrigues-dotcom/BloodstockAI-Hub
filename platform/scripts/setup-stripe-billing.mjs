#!/usr/bin/env node
/**
 * Print Stripe webhook setup instructions for BloodstockAI production.
 *
 * After setting secrets:
 *   export STRIPE_SECRET_KEY=sk_live_...
 *   export STRIPE_WEBHOOK_SECRET=whsec_...
 *   npx supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... --project-ref uzkicvizgezitiyhihcq
 */

const PROJECT_REF = "uzkicvizgezitiyhihcq";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook`;

console.log(`
BloodstockAI — Stripe Billing Setup
===================================

1. Stripe Dashboard → Developers → API keys
   - Copy Secret key (sk_live_... or sk_test_...)

2. Stripe Dashboard → Developers → Webhooks → Add endpoint
   URL: ${WEBHOOK_URL}
   Events:
     - checkout.session.completed
     - customer.subscription.updated
     - customer.subscription.deleted

3. Copy webhook signing secret (whsec_...) and set Supabase secrets:

   npx supabase secrets set \\
     STRIPE_SECRET_KEY=sk_live_... \\
     STRIPE_WEBHOOK_SECRET=whsec_... \\
     --project-ref ${PROJECT_REF}

4. Stripe Dashboard → Settings → Billing → Customer portal
   Enable portal so "Manage Subscription" works in dashboard.

5. Test checkout at https://www.agentbloodstockai.com/pricing
   Use Stripe test mode first if using sk_test_ keys.

Supported checkout currencies: USD, EUR, GBP, AUD, CAD, CHF, NZD, JPY
Prices convert automatically from USD base rates at checkout time.
`);
