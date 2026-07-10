import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  single_analysis: { monthly: 2500, annual: 2500, name: "BloodstockAI — Single Analysis" },
  catalogue_analysis: { monthly: 9700, annual: 9700, name: "BloodstockAI — Full Auction Catalogue Analysis" },
  breezeup_analysis: { monthly: 9700, annual: 9700, name: "BloodstockAI — Full Breeze-Up Analysis" },
  broodmare_plan: { monthly: 9700, annual: 9700, name: "BloodstockAI — Broodmare Plan" },
  mating_analysis: { monthly: 6900, annual: 6900, name: "BloodstockAI — Mating Analysis" },
  visual_analysis: { monthly: 6900, annual: 6900, name: "BloodstockAI — Visual Analysis" },
  extra_credits: { monthly: 4900, annual: 4900, name: "3 Extra Analyses" },
  extra_catalogue: { monthly: 9700, annual: 9700, name: "Extra Catalogue Upload" },
  ebook: { monthly: 7900, annual: 7900, name: "AI Models Behind Winning Racehorses — Ebook" },
  report_purchase: { monthly: 0, annual: 0, name: "BloodstockAI Report" }, // dynamic pricing
  starter: { monthly: 9900, annual: 94800, name: "Starter Plan — 100 analyses" },
  professional: { monthly: 39900, annual: 382800, name: "Professional Plan — 1,000 analyses" },
};

// VAT rates by country code
const VAT_RATES: Record<string, number> = {
  IE: 23, DE: 19, FR: 20, IT: 22, ES: 21, PT: 23,
  NL: 21, BE: 21, AT: 20, SE: 25, DK: 25, FI: 24,
  PL: 23, GR: 24, CZ: 21, RO: 19, HU: 27, BG: 20,
  HR: 25, SK: 20, SI: 22, LT: 21, LV: 21, EE: 22,
  CY: 19, LU: 17, MT: 18, GB: 20,
  US: 0, CA: 0, AU: 0, BR: 0,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { planId, billingCycle = "monthly", country, vatNumber } = body;

    if (!planId || typeof planId !== "string") {
      return new Response(JSON.stringify({ error: "planId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Free plan
    if (planId === "free") {
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_id: "free",
          billing_cycle: "monthly",
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      return new Response(JSON.stringify({ redirect: "/dashboard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PLAN_PRICES[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Unknown plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const revolutApiKey = Deno.env.get("REVOLUT_API_KEY");
    if (!revolutApiKey) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://www.agentbloodstockai.com";
    const isOneTime = planId === "extra_credits" || planId === "ebook" || planId === "extra_catalogue" || planId === "single_analysis" || planId === "catalogue_analysis" || planId === "breezeup_analysis" || planId === "broodmare_plan" || planId === "mating_analysis" || planId === "visual_analysis" || planId === "report_purchase";
    
    // For report_purchase, look up price server-side from published_reports
    let subtotalCents: number;
    if (planId === "report_purchase") {
      const reportId = body.reportId;
      if (!reportId || typeof reportId !== "string") {
        return new Response(JSON.stringify({ error: "reportId is required for report purchases" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: report, error: reportError } = await supabaseAdmin
        .from("published_reports")
        .select("price")
        .eq("id", reportId)
        .single();
      if (reportError || !report) {
        return new Response(JSON.stringify({ error: "Report not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subtotalCents = Math.round((report.price ?? 0) * 100);
    } else {
      subtotalCents = isOneTime ? plan.monthly : (billingCycle === "annual" ? plan.annual : plan.monthly);
    }

    // Determine VAT
    let vatRate = 0;
    const countryCode = (country || "").toUpperCase();
    if (countryCode && VAT_RATES[countryCode] !== undefined) {
      vatRate = VAT_RATES[countryCode];
    }

    // Check for business VAT exemption
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("account_type, vat_number")
      .eq("user_id", userId)
      .single();

    const userVatNumber = vatNumber || profile?.vat_number || "";
    if (profile?.account_type === "professional" && userVatNumber) {
      vatRate = 0; // Reverse charge
    }

    const vatAmountCents = Math.round(subtotalCents * vatRate / 100);
    const totalCents = subtotalCents + vatAmountCents;

    const description = isOneTime
      ? `${plan.name} — One-time`
      : `${plan.name} - ${billingCycle === "annual" ? "Annual" : "Monthly"}`;

    const revolutRes = await fetch("https://merchant.revolut.com/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revolutApiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount: totalCents,
        currency: "USD",
        description,
        redirect_url: `${appUrl}/payment/success`,
        cancel_url: `${appUrl}/payment/cancelled`,
        metadata: {
          user_id: userId,
          plan_id: planId,
          billing_cycle: isOneTime ? "one_time" : billingCycle,
          vat_rate: vatRate,
          vat_amount_cents: vatAmountCents,
          subtotal_cents: subtotalCents,
          country: countryCode,
          vat_number: userVatNumber,
          ...(planId === "report_purchase" && body.reportId ? { report_id: body.reportId } : {}),
        },
      }),
    });

    if (!revolutRes.ok) {
      const errText = await revolutRes.text();
      console.error("Revolut API error:", errText);
      return new Response(JSON.stringify({ error: "Payment creation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const revolutOrder = await revolutRes.json();

    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: isOneTime ? "one_time" : billingCycle,
      amount: subtotalCents,
      currency: "USD",
      status: "pending",
      revolut_order_id: revolutOrder.id,
      checkout_url: revolutOrder.checkout_url,
      vat_rate: vatRate,
      vat_amount: vatAmountCents,
      total_amount: totalCents,
      country: countryCode,
      vat_number_used: userVatNumber,
      account_type: profile?.account_type || "personal",
      metadata: { revolut_order: revolutOrder },
    });

    return new Response(
      JSON.stringify({ checkout_url: revolutOrder.checkout_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Create payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
