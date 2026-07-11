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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe secrets not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    log("Event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const resolvePlanFromMetadata = (metadata: Stripe.Metadata | null | undefined) => {
      const planId = metadata?.plan_id;
      const billingCycle = metadata?.billing_cycle ?? "monthly";
      const userId = metadata?.user_id;
      if (!planId || !userId || !PLAN_USD_CENTS[planId]) return null;
      return { planId, billingCycle, userId };
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const meta = resolvePlanFromMetadata(session.metadata);
        if (!meta) break;

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

        await activatePaidPlan(supabase, {
          userId: meta.userId,
          planId: meta.planId,
          billingCycle: meta.billingCycle,
          periodEnd: new Date(subscription.current_period_end * 1000),
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId,
          currency: session.currency?.toUpperCase() ?? "USD",
          amountCents: session.amount_total ?? undefined,
          paymentProvider: "stripe",
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = resolvePlanFromMetadata(subscription.metadata);
        if (!meta) break;

        if (subscription.status === "active" || subscription.status === "trialing") {
          await activatePaidPlan(supabase, {
            userId: meta.userId,
            planId: meta.planId,
            billingCycle: meta.billingCycle,
            periodEnd: new Date(subscription.current_period_end * 1000),
            stripeCustomerId: typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id ?? null,
            stripeSubscriptionId: subscription.id,
            paymentProvider: "stripe",
          });
        } else if (
          subscription.status === "canceled" ||
          subscription.status === "unpaid" ||
          subscription.status === "incomplete_expired"
        ) {
          await deactivatePaidPlan(supabase, meta.userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = resolvePlanFromMetadata(subscription.metadata);
        if (!meta) break;
        await deactivatePaidPlan(supabase, meta.userId);
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
