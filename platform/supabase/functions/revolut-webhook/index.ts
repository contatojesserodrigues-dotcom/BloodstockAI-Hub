import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Invoice helpers ──────────────────────────────────────────────

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `BAI-${year}-${random}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function monthRange(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${now.toLocaleDateString("en-GB")} — ${next.toLocaleDateString("en-GB")}`;
}

function yearRange(): string {
  const now = new Date();
  const next = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  return `${now.toLocaleDateString("en-GB")} — ${next.toLocaleDateString("en-GB")}`;
}

interface PlanInfo {
  name: string;
  description: string;
  period: string | null;
  features: string[];
}

function getPlanInfo(planId: string, billingCycle: string): PlanInfo {
  const key = billingCycle === "annual" ? `${planId}_annual` : (billingCycle === "one_time" ? planId : `${planId}_monthly`);

  const plans: Record<string, PlanInfo> = {
    extra_credits: {
      name: "BloodstockAI — 3 Extra Analyses",
      description: "One-time credit pack — 3 analysis credits",
      period: null,
      features: ["3 analysis credits", "Credits never expire"],
    },
    single_analysis: {
      name: "BloodstockAI — Single Analysis",
      description: "One-time analysis purchase",
      period: null,
      features: ["1 full horse analysis", "Full access"],
    },
    extra_catalogue: {
      name: "BloodstockAI — Extra Catalogue Upload",
      description: "One-time extra catalogue upload",
      period: null,
      features: ["1 additional catalogue upload", "Full AI lot analysis", "Buying recommendations"],
    },
    ebook: {
      name: "AI Models Behind Winning Racehorses — Ebook",
      description: "Digital ebook — one-time purchase",
      period: null,
      features: ["Full digital ebook", "AI thoroughbred analysis insights"],
    },
    starter_monthly: {
      name: "BloodstockAI Starter — Monthly",
      description: "Starter Plan — Monthly subscription",
      period: monthRange(),
      features: ["100 analyses per month", "Full pedigree research", "Matings Analysis", "PDF Reports", "Upload Single PDFs — unlimited", "Email support"],
    },
    starter_annual: {
      name: "BloodstockAI Starter — Annual",
      description: "Starter Plan — Annual subscription (20% discount applied)",
      period: yearRange(),
      features: ["100 analyses per month", "Full pedigree research", "Matings Analysis", "PDF Reports", "Upload Single PDFs — unlimited", "Email support", "20% annual discount"],
    },
    professional_monthly: {
      name: "BloodstockAI PRO — Monthly",
      description: "PRO Plan — Monthly subscription — 1,000 analyses — $399/mo",
      period: monthRange(),
      features: ["1,000 analyses per month", "2 catalogue uploads per month", "Upload Single PDFs — unlimited", "Visual Analysis — Photo & Video", "Breeze-Up Analysis", "Broodmare Plans", "Full pedigree (5 generations)", "Matings Analysis", "PDF Reports & Downloads", "Priority support"],
    },
    professional_annual: {
      name: "BloodstockAI PRO — Annual",
      description: "PRO Plan — Annual subscription (20% discount applied)",
      period: yearRange(),
      features: ["1,000 analyses per month", "2 catalogue uploads per month", "Upload Single PDFs — unlimited", "Visual Analysis — Photo & Video", "Breeze-Up Analysis", "Broodmare Plans", "Full pedigree (5 generations)", "Matings Analysis", "PDF Reports & Downloads", "Priority support", "20% annual discount"],
    },
  };

  return plans[key] || plans[planId] || {
    name: "BloodstockAI Subscription",
    description: "BloodstockAI platform access",
    period: null,
    features: ["Full platform access"],
  };
}

function buildInvoiceHTML(inv: {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  company: string;
  plan: PlanInfo;
  subtotal: string;
  vatRate: number;
  vatAmount: string;
  total: string;
  currency: string;
}): string {
  const featuresHtml = inv.plan.features.map(f =>
    `<p style="margin:4px 0;font-size:14px;color:#374151;">🐎 ${f}</p>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center;">
<h1 style="margin:0;font-size:28px;font-weight:700;color:#d4af37;letter-spacing:2px;">BLOODSTOCK AI</h1>
<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;letter-spacing:1px;">Professional Thoroughbred Intelligence Platform</p>
</td></tr>

<!-- Invoice Title -->
<tr><td style="padding:24px 32px 0;">
<table width="100%"><tr>
<td><h2 style="margin:0;font-size:22px;color:#1f2937;">INVOICE / RECEIPT</h2></td>
<td style="text-align:right;"><span style="font-size:16px;font-weight:600;color:#d4af37;">${inv.invoiceNumber}</span></td>
</tr></table>
</td></tr>

<!-- From + Details -->
<tr><td style="padding:24px 32px;">
<table width="100%"><tr>
<td valign="top" width="50%">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">From</p>
<p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#1f2937;">Bloodstock AI LTD</p>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
Company No: 16857741<br>Floor 3, 50 - 60 Station Rd<br>Cambridge CB1 2JH<br>United Kingdom<br>billing@agentbloodstockai.com
</p>
</td>
<td valign="top" width="50%">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Invoice Details</p>
<table style="font-size:13px;color:#6b7280;">
<tr><td style="padding:2px 8px 2px 0;">Invoice No:</td><td style="font-weight:600;color:#1f2937;">${inv.invoiceNumber}</td></tr>
<tr><td style="padding:2px 8px 2px 0;">Date:</td><td>${inv.invoiceDate}</td></tr>
<tr><td style="padding:2px 8px 2px 0;">Status:</td><td><span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">✓ PAID</span></td></tr>
</table>
</td>
</tr></table>
</td></tr>

<!-- Billed To -->
<tr><td style="padding:0 32px 16px;">
<p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Billed To</p>
<p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#1f2937;">${inv.customerName}</p>
<p style="margin:0;font-size:13px;color:#6b7280;">${inv.customerEmail}</p>
${inv.company ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${inv.company}</p>` : ""}
</td></tr>

<!-- Line Items -->
<tr><td style="padding:0 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<thead><tr style="background:#f9fafb;">
<th style="text-align:left;padding:10px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Description</th>
<th style="text-align:center;padding:10px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Qty</th>
<th style="text-align:right;padding:10px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Amount</th>
</tr></thead>
<tbody><tr>
<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;">
<p style="margin:0;font-size:14px;font-weight:600;color:#1f2937;">${inv.plan.name}</p>
<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${inv.plan.description}</p>
${inv.plan.period ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Period: ${inv.plan.period}</p>` : ""}
</td>
<td style="text-align:center;padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;">1</td>
<td style="text-align:right;padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#1f2937;">${inv.currency}${inv.subtotal}</td>
</tr></tbody>
</table>
</td></tr>

<!-- Totals -->
<tr><td style="padding:16px 32px;">
<table width="100%"><tr><td></td><td width="240">
<table width="100%" style="font-size:14px;">
<tr><td style="padding:4px 0;color:#6b7280;">Subtotal:</td><td style="text-align:right;color:#1f2937;">${inv.currency}${inv.subtotal}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280;">VAT (${inv.vatRate}%):</td><td style="text-align:right;color:#1f2937;">${inv.currency}${inv.vatAmount}</td></tr>
<tr style="border-top:2px solid #d4af37;"><td style="padding:8px 0;font-weight:700;font-size:16px;color:#1f2937;">Total Paid:</td><td style="text-align:right;font-weight:700;font-size:16px;color:#d4af37;">${inv.currency}${inv.total}</td></tr>
</table>
</td></tr></table>
</td></tr>

<!-- Payment Note -->
<tr><td style="padding:0 32px 16px;">
<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;">
<p style="margin:0;font-size:13px;color:#166534;">✓ Payment received via Revolut on ${inv.invoiceDate}</p>
</div>
</td></tr>

<!-- Features -->
<tr><td style="padding:0 32px 24px;">
<div style="background:#fffbeb;border-radius:8px;padding:16px;">
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#92400e;">Your Plan Includes</p>
${featuresHtml}
</div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1a1a2e;padding:24px 32px;text-align:center;">
<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#d4af37;">Bloodstock AI LTD</p>
<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Floor 3, 50 - 60 Station Rd, Cambridge CB1 2JH, United Kingdom</p>
<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Company Number: 16857741</p>
<p style="margin:0 0 12px;font-size:12px;color:#9ca3af;">billing@agentbloodstockai.com · agentbloodstockai.com</p>
<p style="margin:0;font-size:11px;color:#6b7280;">This is an official receipt. Please keep for your records.<br>For billing queries contact billing@agentbloodstockai.com</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function sendPaymentInvoice(
  supabaseAdmin: any,
  payment: any,
  profile: any
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("[INVOICE] RESEND_API_KEY not configured, skipping invoice");
    return;
  }

  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = fmtDate(new Date());
  const planInfo = getPlanInfo(payment.plan_id, payment.billing_cycle);

  const subtotalCents = payment.amount || 0;
  const vatAmountCents = payment.vat_amount || 0;
  const totalCents = payment.total_amount || subtotalCents;
  const vatRate = payment.vat_rate || 0;

  const fmt = (cents: number) => (cents / 100).toFixed(2);
  const currency = "$";

  const customerName = profile?.full_name || profile?.first_name
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : profile?.email || payment.user_id;
  const customerEmail = profile?.email || "";
  const company = profile?.company_name || "";

  if (!customerEmail) {
    console.error("[INVOICE] No customer email found, skipping");
    return;
  }

  const html = buildInvoiceHTML({
    invoiceNumber,
    invoiceDate,
    customerName,
    customerEmail,
    company,
    plan: planInfo,
    subtotal: fmt(subtotalCents),
    vatRate,
    vatAmount: fmt(vatAmountCents),
    total: fmt(totalCents),
    currency,
  });

  // Send via Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bloodstock AI LTD <billing@agentbloodstockai.com>",
        to: customerEmail,
        subject: `Invoice ${invoiceNumber} — ${planInfo.name} — Bloodstock AI LTD`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[INVOICE] Resend error:", errText);
    } else {
      console.log(`[INVOICE] Sent ${invoiceNumber} to ${customerEmail}`);
    }
  } catch (e) {
    console.error("[INVOICE] Failed to send email:", e);
  }

  // Save invoice record
  try {
    await supabaseAdmin.from("invoices").insert({
      invoice_number: invoiceNumber,
      customer_id: payment.user_id,
      customer_email: customerEmail,
      customer_name: customerName,
      company_name: company,
      plan: payment.plan_id,
      amount: subtotalCents / 100,
      currency,
      vat_rate: vatRate,
      vat_amount: vatAmountCents / 100,
      total_amount: totalCents / 100,
      payment_method: "Revolut",
      revolut_order_id: payment.revolut_order_id,
      billing_cycle: payment.billing_cycle,
      status: "paid",
    });
  } catch (e) {
    console.error("[INVOICE] Failed to save invoice record:", e);
  }
}

// ── Main webhook handler ─────────────────────────────────────────

// Guest one-off purchases (sales catalogs / standalone reports) — no user row.
// Re-fetch the Revolut order, read metadata, and email the PDF to the buyer.
async function handleGuestOrderCompleted(orderId: string): Promise<void> {
  const revolutApiKey = Deno.env.get("REVOLUT_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const appUrl = Deno.env.get("APP_URL") || "https://www.agentbloodstockai.com";
  if (!revolutApiKey) {
    console.error("[GUEST-ORDER] REVOLUT_API_KEY missing");
    return;
  }

  const orderRes = await fetch(`https://merchant.revolut.com/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${revolutApiKey}`,
      "Revolut-Api-Version": "2024-09-01",
    },
  });
  if (!orderRes.ok) {
    console.error("[GUEST-ORDER] Revolut fetch failed:", await orderRes.text());
    return;
  }
  const order = await orderRes.json();
  const meta = order?.metadata || {};
  const buyerEmail = String(meta.buyer_email || meta.email || "").trim().toLowerCase();
  const buyerName = String(meta.buyer_name || "").trim() || "Customer";

  // Catalog vs single report
  const CATALOGS: Record<string, { title: string; pdfUrl: string; packageFiles?: { label: string; url: string }[] }> = {
    "obs-june-2026": {
      title: "2026 June Two-Year-Olds and Horses of Racing Age Sale",
      pdfUrl: "/reports/BloodstockAI_OBS_June_2026_Report.pdf",
      packageFiles: [
        { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Report.pdf" },
        { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Spreadsheet.pdf" },
      ],
    },
    "goffs-london-2026": {
      title: "Goffs London Sale 2026 — Eve of Royal Ascot",
      pdfUrl: "/reports/BloodstockAI_Goffs_London_2026_Report.pdf",
    },
    "arqana-summer-2026": {
      title: "Arqana Summer Sale 2026 — Deauville",
      pdfUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
      packageFiles: [
        { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf" },
        { label: "Black-Type Spotlight (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_BlackType_Spotlight.pdf" },
        { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Spreadsheet.pdf" },
      ],
    },
    "tatts-derby-2026": {
      title: "Tattersalls Ireland Derby Sale 2026 — NH Stores",
      pdfUrl: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf",
      packageFiles: [
        { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf" },
        { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Spreadsheet.pdf" },
      ],
    },
    "tatts-breezeup-2026": {
      title: "Tattersalls Ireland Derby Sale 2026 — Breeze-Up / Part I",
      pdfUrl: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf",
      packageFiles: [
        { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf" },
      ],
    },
    "goffs-breezeup-2026": {
      title: "Goffs Classic Breeze-Up Sale 2026",
      pdfUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf",
      packageFiles: [
        { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf" },
        { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Spreadsheet.pdf" },
      ],
    },
  };

  let title = String(meta.catalog_title || meta.report_title || "BloodstockAI Report");
  let pdfUrl = "";
  let packageFiles: { label: string; url: string }[] = [];
  if (meta.catalog_id && CATALOGS[meta.catalog_id]) {
    const cat = CATALOGS[meta.catalog_id];
    title = cat.title;
    pdfUrl = appUrl.replace(/\/$/, "") + cat.pdfUrl;
    const base = appUrl.replace(/\/$/, "");
    packageFiles = (cat.packageFiles || [{ label: title, url: cat.pdfUrl }]).map((f) => ({
      label: f.label,
      url: f.url.startsWith("http") ? f.url : base + f.url,
    }));
  } else if (meta.report_id) {
    // Look up published report
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: report } = await supabaseAdmin
      .from("published_reports")
      .select("title, pdf_url")
      .eq("id", meta.report_id)
      .single();
    if (report) {
      title = report.title;
      const p = report.pdf_url || "";
      pdfUrl = p.startsWith("http") ? p : `${appUrl.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
    }
  } else {
    console.log("[GUEST-ORDER] No catalog/report metadata; skipping email.");
    return;
  }

  if (!buyerEmail || !pdfUrl) {
    console.error("[GUEST-ORDER] Missing email or pdfUrl", { buyerEmail, pdfUrl });
    return;
  }
  if (!resendKey) {
    console.error("[GUEST-ORDER] RESEND_API_KEY missing");
    return;
  }

  // Download PDF and attach
  // Download all package PDFs and attach (falls back to single pdfUrl)
  if (packageFiles.length === 0) packageFiles = [{ label: title, url: pdfUrl }];
  const attachments: { filename: string; content: string }[] = [];
  for (const f of packageFiles) {
    try {
      const pdfRes = await fetch(f.url);
      if (!pdfRes.ok) {
        console.error("[GUEST-ORDER] PDF fetch failed:", pdfRes.status, f.url);
        continue;
      }
      const buf = new Uint8Array(await pdfRes.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin);
      const filename = f.url.split("/").pop() || "BloodstockAI_Report.pdf";
      attachments.push({ filename, content: b64 });
    } catch (e) {
      console.error("[GUEST-ORDER] PDF download error:", e);
    }
  }

  const filesListHtml = packageFiles.map((f) =>
    `<li style="margin:4px 0"><a href="${f.url}" style="color:#C9A84C;text-decoration:none">${f.label}</a></li>`
  ).join("");

  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1A14">
  <div style="background:#0F1B2D;padding:20px;text-align:center">
    <h1 style="color:#C9A84C;margin:0;letter-spacing:2px;font-size:22px">BLOODSTOCKAI</h1>
  </div>
  <div style="padding:24px;background:#FFFBF0">
    <h2 style="margin-top:0;color:#0F1B2D">Thank you for your purchase, ${buyerName}!</h2>
    <p>Your analyzed package is ready:</p>
    <p style="font-weight:bold;font-size:16px;color:#C9A84C">${title}</p>
    <p>Your package includes the following PDFs (all attached to this email):</p>
    <ul style="padding-left:20px">${filesListHtml}</ul>
    <p style="font-size:13px;color:#9B8E7A">You can also re-download any file using the links above.</p>
    <p style="font-size:12px;color:#9B8E7A">Need help? Reply to this email or contact office@agentbloodstockai.com</p>
  </div>
</div>`;

  const body: Record<string, unknown> = {
    from: "BloodstockAI <reports@agentbloodstockai.com>",
    to: buyerEmail,
    subject: `Your BloodstockAI Report — ${title}`,
    html,
  };
  if (attachments.length > 0) body.attachments = attachments;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resendRes.ok) {
    console.error("[GUEST-ORDER] Resend error:", await resendRes.text());
  } else {
    console.log(`[GUEST-ORDER] Sent ${title} to ${buyerEmail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body to verify signature, then parse JSON
    const rawBody = await req.text();

    // Revolut signs payloads using HMAC-SHA256 with the Revolut-Signature header
    // format: "v1=<hex>" combined with Revolut-Request-Timestamp.
    const webhookSecret = Deno.env.get("REVOLUT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[REVOLUT-WEBHOOK] REVOLUT_WEBHOOK_SECRET not configured; rejecting webhook");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const signatureHeader = req.headers.get("Revolut-Signature") || "";
    const timestamp = req.headers.get("Revolut-Request-Timestamp") || "";
    if (!signatureHeader || !timestamp) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Reject stale timestamps (>5 minutes) to prevent replay
    const tsMs = Number(timestamp);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "Stale timestamp" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payloadToSign = `v1.${timestamp}.${rawBody}`;
    const keyData = new TextEncoder().encode(webhookSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payloadToSign));
    const expected = "v1=" + Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    // Constant-time compare each signature in the header (comma-separated allowed)
    const provided = signatureHeader.split(",").map((s) => s.trim());
    const enc = new TextEncoder();
    const expBytes = enc.encode(expected);
    let valid = false;
    for (const p of provided) {
      const pBytes = enc.encode(p);
      if (pBytes.length !== expBytes.length) continue;
      let diff = 0;
      for (let i = 0; i < pBytes.length; i++) diff |= pBytes[i] ^ expBytes[i];
      if (diff === 0) { valid = true; break; }
    }
    if (!valid) {
      console.error("[REVOLUT-WEBHOOK] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    const { event, order_id } = body;
    const eventType = event || body.type;

    if (!eventType || !order_id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment, error: findErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("revolut_order_id", order_id)
      .single();

    if (findErr || !payment) {
      // Guest purchases (sales catalogs / one-off reports) are not stored in
      // the `payments` table. Fetch the order from Revolut and dispatch the
      // PDF to the buyer's email if metadata identifies a known asset.
      if (eventType === "ORDER_COMPLETED") {
        try {
          await handleGuestOrderCompleted(order_id);
        } catch (e) {
          console.error("[GUEST-ORDER] Failed:", e);
        }
      }
      return new Response(JSON.stringify({ success: true, guest: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "ORDER_COMPLETED") {
      await supabaseAdmin
        .from("payments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", payment.id);

      const now = new Date();
      const isSingleAnalysis = payment.plan_id === "single_analysis";
      const isExtraCredits = payment.plan_id === "extra_credits";
      const isExtraCatalogue = payment.plan_id === "extra_catalogue";

      if (isExtraCredits) {
        const { data: currentProfile } = await supabaseAdmin
          .from("profiles")
          .select("analyses_remaining")
          .eq("user_id", payment.user_id)
          .single();

        const currentRemaining = currentProfile?.analyses_remaining ?? 0;
        const newRemaining = currentRemaining + 3;

        await supabaseAdmin
          .from("profiles")
          .update({
            analyses_remaining: newRemaining,
            analyses_limit: newRemaining,
            updated_at: now.toISOString(),
          })
          .eq("user_id", payment.user_id);

        await supabaseAdmin.from("usage_tracking").insert({
          user_id: payment.user_id,
          plan: "extra_credits",
          analyses_used: 0,
          analyses_allowed: 3,
          action: "Credits added",
          page_used: "Credit Pack (3 analyses — $49)",
          credits_delta: 3,
          balance_after: newRemaining,
          payment_type: "one_time",
          revolut_payment_id: payment.revolut_order_id,
        });

        console.log(`3 credits added for user ${payment.user_id}, new balance: ${newRemaining}`);

        console.log(`30 credits added for user ${payment.user_id}, new balance: ${newRemaining}`);
      } else if (isExtraCatalogue) {
        // Extra catalogue purchase: just log it, user gets 1 more catalogue upload
        await supabaseAdmin.from("usage_tracking").insert({
          user_id: payment.user_id,
          plan: "extra_catalogue",
          analyses_used: 0,
          analyses_allowed: 1,
          action: "Extra catalogue purchased",
          page_used: "Extra Catalogue Upload — $97",
          credits_delta: 0,
          balance_after: 0,
          payment_type: "one_time",
          revolut_payment_id: payment.revolut_order_id,
        });

        console.log(`Extra catalogue purchased for user ${payment.user_id}`);
      } else if (isSingleAnalysis) {
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + 7);

        await supabaseAdmin.from("usage_tracking").insert({
          user_id: payment.user_id,
          plan: "single_analysis",
          analyses_used: 0,
          analyses_allowed: 1,
          expiry_date: expiryDate.toISOString(),
          payment_type: "one_time",
          revolut_payment_id: payment.revolut_order_id,
        });

        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "pro",
            credits_remaining: 1,
            plan_started_at: now.toISOString(),
            plan_expires_at: expiryDate.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("user_id", payment.user_id);

        await supabaseAdmin.from("subscriptions").upsert(
          {
            user_id: payment.user_id,
            plan_id: "single_analysis",
            billing_cycle: "one_time",
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: expiryDate.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );
      } else {
        const periodEnd = new Date(now);
        if (payment.billing_cycle === "annual") {
          periodEnd.setDate(periodEnd.getDate() + 365);
        } else {
          periodEnd.setDate(periodEnd.getDate() + 30);
        }

        await supabaseAdmin.from("subscriptions").upsert(
          {
            user_id: payment.user_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );

        const planMap: Record<string, string> = {
          starter: "starter",
          professional: "pro",
        };
        const profilePlan = planMap[payment.plan_id] || "free";

        const creditsMap: Record<string, number> = {
          starter: 100,
          professional: 1000,
        };

        await supabaseAdmin
          .from("profiles")
          .update({
            plan: profilePlan,
            plan_started_at: now.toISOString(),
            plan_expires_at: periodEnd.toISOString(),
            credits_remaining: creditsMap[payment.plan_id] || 9999,
            updated_at: now.toISOString(),
          })
          .eq("user_id", payment.user_id);

        await supabaseAdmin.from("usage_tracking").insert({
          user_id: payment.user_id,
          plan: payment.plan_id,
          analyses_used: 0,
          analyses_allowed: creditsMap[payment.plan_id] || 9999,
          period_start: now.toISOString().split("T")[0],
          period_end: periodEnd.toISOString().split("T")[0],
          payment_type: "subscription",
          revolut_payment_id: payment.revolut_order_id,
        });
      }

      // ── Send Invoice Email (best-effort) ──────────────────────
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name, first_name, last_name, company_name")
          .eq("user_id", payment.user_id)
          .single();

        await sendPaymentInvoice(supabaseAdmin, payment, profile);
      } catch (e) {
        console.error("[INVOICE] Error sending invoice:", e);
      }

      // Legacy confirmation email (kept for backwards compat)
      try {
        await supabaseAdmin.functions.invoke("send-email", {
          body: {
            type: "payment_confirmation",
            user_id: payment.user_id,
            plan_id: payment.plan_id,
            amount: payment.total_amount || payment.amount,
          },
        });
      } catch (e) {
        console.error("Failed to send confirmation email:", e);
      }

      console.log(`Payment completed for user ${payment.user_id}, plan: ${payment.plan_id}`);
    } else if (eventType === "ORDER_FAILED" || eventType === "ORDER_CANCELLED") {
      await supabaseAdmin
        .from("payments")
        .update({
          status: eventType === "ORDER_FAILED" ? "failed" : "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.log(`Payment ${eventType.toLowerCase()} for order: ${order_id}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
