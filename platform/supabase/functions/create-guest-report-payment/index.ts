import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { reportId, email } = body;

    if (!reportId || typeof reportId !== "string") {
      return new Response(JSON.stringify({ error: "reportId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up report price server-side
    const { data: report, error: reportError } = await supabaseAdmin
      .from("published_reports")
      .select("id, title, price")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceCents = Math.round((report.price ?? 0) * 100);
    if (priceCents <= 0) {
      return new Response(JSON.stringify({ error: "This report is free — no payment required" }), {
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

    const appUrl = Deno.env.get("APP_URL") || "https://agentbloodstockai.lovable.app";

    const revolutRes = await fetch("https://merchant.revolut.com/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revolutApiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount: priceCents,
        currency: "USD",
        description: `${report.title} — One-time purchase`,
        redirect_url: `${appUrl}/payment/success?report=${report.id}`,
        cancel_url: `${appUrl}/payment/cancelled`,
        metadata: {
          guest: "true",
          report_id: report.id,
          report_title: report.title,
          email: email || "",
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

    return new Response(
      JSON.stringify({
        checkout_url: revolutOrder.checkout_url,
        order_id: revolutOrder.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Guest report payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
