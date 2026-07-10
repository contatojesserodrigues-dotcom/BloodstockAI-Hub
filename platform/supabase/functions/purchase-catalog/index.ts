const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Static catalog registry (keep in sync with frontend)
const CATALOGS: Record<string, { title: string; price: number; currency: string; pdfUrl: string; packageFiles?: { label: string; url: string }[] }> = {
  "obs-june-2026": {
    title: "2026 June Two-Year-Olds and Horses of Racing Age Sale",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_OBS_June_2026_Report.pdf",
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Spreadsheet.pdf" },
    ],
  },
  "goffs-london-2026": {
    title: "Goffs London Sale 2026 — Eve of Royal Ascot",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_Goffs_London_2026_Report.pdf",
  },
  "arqana-summer-2026": {
    title: "Arqana Summer Sale 2026 — Deauville",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf" },
      { label: "Black-Type Spotlight (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_BlackType_Spotlight.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Spreadsheet.pdf" },
    ],
  },
  "tatts-derby-2026": {
    title: "Tattersalls Ireland Derby Sale 2026 — NH Stores",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf",
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Spreadsheet.pdf" },
    ],
  },
  "tatts-breezeup-2026": {
    title: "Tattersalls Ireland Derby Sale 2026 — Breeze-Up / Part I",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf",
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf" },
    ],
  },
  "goffs-breezeup-2026": {
    title: "Goffs Classic Breeze-Up Sale 2026",
    price: 129,
    currency: "USD",
    pdfUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf",
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Spreadsheet.pdf" },
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { catalogId, full_name, email } = await req.json();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Please enter a valid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2 || full_name.length > 120) {
      return new Response(JSON.stringify({ error: "Please enter your full name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const catalog = CATALOGS[catalogId];
    if (!catalog) {
      return new Response(JSON.stringify({ error: "Catalog not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "Unknown";

    const revolutApiKey = Deno.env.get("REVOLUT_API_KEY");
    if (!revolutApiKey) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://agentbloodstockai.lovable.app";
    const priceCents = Math.round(catalog.price * 100);

    const revolutRes = await fetch("https://merchant.revolut.com/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revolutApiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount: priceCents,
        currency: catalog.currency,
        description: `${catalog.title} — Full analyzed catalog`,
        redirect_url: `${appUrl}/payment/success?catalog=${catalogId}`,
        cancel_url: `${appUrl}/payment/cancelled`,
        customer: { email: email.trim().toLowerCase(), full_name: full_name.trim() },
        metadata: {
          guest: "true",
          catalog_id: catalogId,
          catalog_title: catalog.title,
          buyer_name: full_name.trim(),
          buyer_email: email.trim().toLowerCase(),
        },
      }),
    });

    if (!revolutRes.ok) {
      const errText = await revolutRes.text();
      console.error("Revolut API error:", errText);
      return new Response(JSON.stringify({ error: "Could not create payment link" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const revolutOrder = await revolutRes.json();

    // Send office notification (non-blocking failure)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const now = new Date().toLocaleString("en-IE", { timeZone: "Europe/Dublin" });
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "BloodstockAI <noreply@agentbloodstockai.com>",
            to: ["office@agentbloodstockai.com"],
            subject: `New Sale Catalog Purchase Started — ${catalog.title}`,
            html: `<h2>New Sale Catalog Purchase Started</h2>
<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;">
  <tr><td style="padding:8px;font-weight:bold;">Catalog:</td><td style="padding:8px;">${escapeHtml(catalog.title)}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Price:</td><td style="padding:8px;">$${catalog.price.toFixed(2)} ${escapeHtml(catalog.currency)}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Buyer Name:</td><td style="padding:8px;">${escapeHtml(full_name.trim())}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Buyer Email:</td><td style="padding:8px;">${escapeHtml(email.trim())}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Revolut Order ID:</td><td style="padding:8px;">${escapeHtml(revolutOrder.id ?? "n/a")}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Checkout URL:</td><td style="padding:8px;"><a href="${escapeHtml(revolutOrder.checkout_url ?? "")}">${escapeHtml(revolutOrder.checkout_url ?? "")}</a></td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Date:</td><td style="padding:8px;">${now}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">IP:</td><td style="padding:8px;">${userIp}</td></tr>
</table>
<p style="font-size:12px;color:#666;">This notification is sent when a buyer starts checkout. Payment confirmation arrives via the Revolut webhook.</p>`,
          }),
        });
      } catch (e) {
        console.error("Office email failed (non-blocking):", e);
      }
    }

    return new Response(
      JSON.stringify({ checkout_url: revolutOrder.checkout_url, order_id: revolutOrder.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("purchase-catalog error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});