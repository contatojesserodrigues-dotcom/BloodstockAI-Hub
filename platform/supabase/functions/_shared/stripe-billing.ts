import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "JPY",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface PlanDefinition {
  monthly: number;
  annual: number;
  name: string;
  profilePlan: "starter" | "pro";
  analysesLimit: number;
}

/** Base prices in USD cents (annual uses promotional pricing shown on /pricing). */
export const PLAN_USD_CENTS: Record<string, PlanDefinition> = {
  starter: {
    monthly: 9900,
    annual: 71100,
    name: "BloodstockAI Starter — 100 analyses/month",
    profilePlan: "starter",
    analysesLimit: 100,
  },
  professional: {
    monthly: 39900,
    annual: 287100,
    name: "BloodstockAI Professional — 1,000 analyses/month",
    profilePlan: "pro",
    analysesLimit: 1000,
  },
};

const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);

export function normalizeCurrency(currency: string): SupportedCurrency {
  const upper = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return upper as SupportedCurrency;
}

export function getUsdCents(planId: string, billingCycle: string): number {
  const plan = PLAN_USD_CENTS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return billingCycle === "annual" ? plan.annual : plan.monthly;
}

export function toStripeAmount(amountMajor: number, currency: string): number {
  if (ZERO_DECIMAL.has(currency.toUpperCase())) {
    return Math.max(1, Math.round(amountMajor));
  }
  return Math.max(1, Math.round(amountMajor * 100));
}

export async function convertUsdCents(
  usdCents: number,
  targetCurrency: string,
): Promise<number> {
  const currency = normalizeCurrency(targetCurrency);
  if (currency === "USD") return usdCents;

  const res = await fetch(
    `https://api.frankfurter.app/latest?from=USD&to=${currency}`,
  );
  if (!res.ok) {
    throw new Error(`Exchange rate lookup failed (${res.status})`);
  }

  const data = await res.json();
  const rate = data.rates?.[currency];
  if (!rate) throw new Error(`No FX rate for ${currency}`);

  const usdMajor = usdCents / 100;
  const convertedMajor = usdMajor * rate;
  return toStripeAmount(convertedMajor, currency);
}

export async function activatePaidPlan(
  supabase: SupabaseClient,
  params: {
    userId: string;
    planId: string;
    billingCycle: string;
    periodEnd: Date;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currency?: string;
    amountCents?: number;
    paymentProvider?: string;
  },
) {
  const plan = PLAN_USD_CENTS[params.planId];
  if (!plan) throw new Error(`Unknown plan: ${params.planId}`);

  const now = new Date();
  const profileUpdate: Record<string, unknown> = {
    plan: plan.profilePlan,
    analyses_limit: plan.analysesLimit,
    analyses_remaining: plan.analysesLimit,
    analyses_used: 0,
    plan_started_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  if (params.stripeCustomerId) {
    profileUpdate.stripe_customer_id = params.stripeCustomerId;
  }
  if (params.currency) {
    profileUpdate.preferred_currency = params.currency.toUpperCase();
  }

  await supabase.from("profiles").update(profileUpdate).eq("user_id", params.userId);

  await supabase.from("subscriptions").upsert(
    {
      user_id: params.userId,
      plan_id: params.planId,
      billing_cycle: params.billingCycle,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: params.periodEnd.toISOString(),
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      payment_provider: params.paymentProvider ?? "stripe",
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (params.amountCents != null && params.currency) {
    await supabase.from("payments").insert({
      user_id: params.userId,
      plan_id: params.planId,
      billing_cycle: params.billingCycle,
      amount: params.amountCents,
      currency: params.currency.toUpperCase(),
      status: "completed",
      payment_provider: params.paymentProvider ?? "stripe",
      metadata: {
        stripe_subscription_id: params.stripeSubscriptionId ?? null,
      },
    });
  }

  await supabase.from("user_roles").delete().eq("user_id", params.userId).eq("role", "free_user");
  await supabase.from("user_roles").upsert(
    { user_id: params.userId, role: "premium_user" },
    { onConflict: "user_id,role" },
  );
}

export async function deactivatePaidPlan(supabase: SupabaseClient, userId: string) {
  const now = new Date().toISOString();

  await supabase
    .from("profiles")
    .update({
      plan: "free",
      analyses_limit: 0,
      analyses_remaining: 0,
      analyses_used: 0,
      updated_at: now,
    })
    .eq("user_id", userId);

  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now,
    })
    .eq("user_id", userId);

  await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "premium_user");
  await supabase.from("user_roles").upsert(
    { user_id: userId, role: "free_user" },
    { onConflict: "user_id,role" },
  );
}
