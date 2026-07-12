import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  convertUsdCents,
  getUsdCents,
  normalizeCurrency,
  PLAN_USD_CENTS,
} from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const body = await req.json();
    const planId = body.planId as string | undefined;
    const billingCycle = (body.billingCycle ?? "monthly") as string;
    const currency = normalizeCurrency(body.currency ?? "USD");

    if (!planId || !PLAN_USD_CENTS[planId]) {
      throw new Error("Valid planId is required (starter or professional)");
    }
    if (billingCycle !== "monthly" && billingCycle !== "annual") {
      throw new Error("billingCycle must be monthly or annual");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const plan = PLAN_USD_CENTS[planId];
    const usdCents = getUsdCents(planId, billingCycle);
    const unitAmount = await convertUsdCents(usdCents, currency);

    logStep("Creating checkout", { planId, billingCycle, currency, unitAmount });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = Deno.env.get("APP_URL") || "https://www.agentbloodstockai.com";
    const origin = appUrl.replace(/\/$/, "");
    const interval = billingCycle === "annual" ? "year" : "month";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: unitAmount,
            recurring: { interval },
            product_data: {
              name: plan.name,
              metadata: {
                plan_id: planId,
                billing_cycle: billingCycle,
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        currency,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      },
      allow_promotion_codes: true,
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        preferred_currency: currency,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
