import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png";

function buildPaidInvoiceHtml(): string {
  const invoiceNumber = "BAI-2026-0058";
  const date = "30 April 2026";
  const paidDate = "30 April 2026";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px;margin:30px auto;background:#ffffff;border:1px solid #e0e0e0;">
  <tr><td style="background:#0B0B0D;padding:30px 40px;text-align:left;">
    <img src="${LOGO_URL}" alt="BloodstockAI" width="150" style="display:block;" />
  </td></tr>

  <!-- PAID Badge -->
  <tr><td style="padding:35px 40px 5px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1B5E20;border-radius:4px;padding:6px 18px;">
        <span style="font-size:13px;color:#ffffff;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">&#10003; PAID</span>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:15px 40px 10px;">
    <h1 style="font-family:Georgia,serif;font-size:28px;color:#1C1A14;margin:0 0 5px;font-weight:bold;">PAYMENT RECEIPT</h1>
    <p style="font-size:14px;color:#888;margin:0;">Invoice No: <strong style="color:#1C1A14;">${invoiceNumber}</strong></p>
  </td></tr>

  <tr><td style="padding:20px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" valign="top" style="padding-right:20px;">
          <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">From</p>
          <p style="font-size:14px;color:#1C1A14;line-height:1.6;margin:0;">
            <strong>Bloodstock AI LTD</strong><br/>
            Company No. 16857741<br/>
            50-60 Station Road<br/>
            Cambridge, England, CB1 2JH<br/>
            United Kingdom
          </p>
        </td>
        <td width="50%" valign="top">
          <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Bill To</p>
          <p style="font-size:14px;color:#1C1A14;line-height:1.6;margin:0;">
            <strong>Adam Spratt</strong><br/>
            SAS Supply Chain<br/>
            adam.spratt@sassupplychain.co
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:10px 40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%"><p style="font-size:13px;color:#666;margin:0;">Invoice Date: <strong style="color:#1C1A14;">${date}</strong></p></td>
        <td width="33%"><p style="font-size:13px;color:#666;margin:0;">Payment Date: <strong style="color:#1C1A14;">${paidDate}</strong></p></td>
        <td width="34%"><p style="font-size:13px;color:#666;margin:0;">Status: <strong style="color:#1B5E20;">PAID</strong></p></td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 40px;"><hr style="border:none;border-top:2px solid #D4AF37;margin:0;" /></td></tr>

  <tr><td style="padding:20px 40px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="60%" style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee;">Description</td>
        <td width="20%" style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee;text-align:center;">Qty</td>
        <td width="20%" style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #eee;text-align:right;">Amount</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="60%" style="font-size:14px;color:#1C1A14;padding:14px 0;border-bottom:1px solid #f0f0f0;line-height:1.5;">
          <strong>BloodstockAI Subscription</strong><br/>
          <span style="font-size:12px;color:#888;">AI-powered bloodstock analysis platform access</span>
        </td>
        <td width="20%" style="font-size:14px;color:#1C1A14;padding:14px 0;border-bottom:1px solid #f0f0f0;text-align:center;">1</td>
        <td width="20%" style="font-size:14px;color:#1C1A14;padding:14px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">£297.00</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:20px 40px 10px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="60%"></td>
        <td width="20%" style="font-size:13px;color:#666;padding:6px 0;text-align:right;">Subtotal</td>
        <td width="20%" style="font-size:13px;color:#1C1A14;padding:6px 0;text-align:right;">£297.00</td>
      </tr>
      <tr>
        <td width="60%"></td>
        <td width="20%" style="font-size:13px;color:#666;padding:6px 0;text-align:right;">VAT (0%)</td>
        <td width="20%" style="font-size:13px;color:#1C1A14;padding:6px 0;text-align:right;">£0.00</td>
      </tr>
      <tr>
        <td width="60%"></td>
        <td colspan="2" style="padding:8px 0 0;"><hr style="border:none;border-top:2px solid #D4AF37;margin:0;" /></td>
      </tr>
      <tr>
        <td width="60%"></td>
        <td width="20%" style="font-size:16px;color:#1C1A14;padding:10px 0;text-align:right;font-weight:bold;">Total Paid</td>
        <td width="20%" style="font-size:18px;color:#1B5E20;padding:10px 0;text-align:right;font-weight:bold;">£297.00</td>
      </tr>
    </table>
  </td></tr>

  <!-- Thank you message -->
  <tr><td style="padding:25px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:8px;">
      <tr><td style="padding:24px 28px;">
        <p style="font-size:16px;color:#1C1A14;margin:0 0 10px;font-weight:bold;">Thank you for your payment!</p>
        <p style="font-size:14px;color:#6B5E4E;line-height:1.6;margin:0 0 16px;">Your BloodstockAI subscription is now active. You can start using all features immediately.</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="background:#D4AF37;border-radius:6px;text-align:center;">
            <a href="https://www.agentbloodstockai.com/dashboard" style="display:block;padding:14px 32px;color:#0B0B0D;font-family:Georgia,serif;font-size:14px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Go to Dashboard &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:10px 40px 30px;">
    <p style="font-size:12px;color:#888;line-height:1.6;margin:0;text-align:center;">
      This receipt confirms your payment has been processed successfully.<br/>
      Please retain this email for your records.
    </p>
  </td></tr>

  <tr><td style="background:#0B0B0D;padding:25px 40px;text-align:center;">
    <p style="font-size:12px;color:#888;margin:0 0 4px;">Bloodstock AI LTD &middot; Company No. 16857741</p>
    <p style="font-size:12px;color:#888;margin:0 0 4px;">50-60 Station Road, Cambridge, England, CB1 2JH</p>
    <p style="font-size:12px;margin:0;"><a href="https://www.agentbloodstockai.com" style="color:#D4AF37;text-decoration:none;">www.agentbloodstockai.com</a></p>
  </td></tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const html = buildPaidInvoiceHtml();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Bloodstock AI <noreply@agentbloodstockai.com>",
        reply_to: "office@agentbloodstockai.com",
        to: ["adam.spratt@sassupplychain.co"],
        subject: "Payment Confirmed ✓ — Invoice #BAI-2026-0058 — BloodstockAI (£297.00)",
        html,
      }),
    });

    const data = await res.text();
    if (!res.ok) throw new Error(data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
