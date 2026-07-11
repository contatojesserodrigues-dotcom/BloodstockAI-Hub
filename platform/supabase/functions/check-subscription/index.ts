import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  activatePaidPlan,
  deactivatePaidPlan,
  PLAN_USD_CENTS,
} from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: subscriptionRow } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const plan = profile?.plan ?? "free";
      const isPaid = ["starter", "pro", "enterprise"].includes(plan);
      return new Response(JSON.stringify({
        subscribed: isPaid,
        plan,
        subscription_end: subscriptionRow?.current_period_end ?? null,
        source: "database",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customerId = profile?.stripe_customer_id ??
      (await stripe.customers.list({ email: user.email, limit: 1 })).data[0]?.id;

    if (!customerId) {
      return new Response(JSON.stringify({
        subscribed: false,
        plan: profile?.plan ?? "free",
        subscription_end: null,
        source: "none",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      if (subscriptionRow?.payment_provider === "stripe") {
        await deactivatePaidPlan(supabaseClient, user.id);
      }

      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        subscription_end: null,
        source: "stripe",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const planId = subscription.metadata?.plan_id;
    const billingCycle = subscription.metadata?.billing_cycle ?? "monthly";
    const planDef = planId ? PLAN_USD_CENTS[planId] : null;
    const plan = planDef?.profilePlan ?? profile?.plan ?? "free";
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    if (planId && planDef) {
      await activatePaidPlan(supabaseClient, {
        userId: user.id,
        planId,
        billingCycle,
        periodEnd: new Date(subscription.current_period_end * 1000),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        paymentProvider: "stripe",
      });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan,
      subscription_end: subscriptionEnd,
      source: "stripe",
    }), {
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
