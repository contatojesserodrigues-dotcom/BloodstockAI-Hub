import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNUP_URL = "https://www.agentbloodstockai.com/auth";
const SITE_URL = "https://www.agentbloodstockai.com";
const PRICING_URL = "https://www.agentbloodstockai.com/pricing";
const LOGO_URL = "https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png";

function buildInvitationHtml(recipientName: string, includeProCta: boolean, proCheckoutUrl?: string): string {
  const proCta = includeProCta ? `
  <tr><td style="padding:0 35px 30px;">
    <hr style="border:none;border-top:1px solid rgba(212,175,55,0.2);margin:0 0 24px;" />

    <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;font-family:'Cinzel','Georgia',serif;">EXCLUSIVE: PROFESSIONAL PLAN</p>

    <p style="margin:0 0 16px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;">Upgrade to our <strong style="color:#D4AF37;">Professional Plan — $399/month</strong> and unlock unlimited access to every feature on the platform:</p>

    <p style="margin:0 0 8px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; 1,000 AI analyses per month</p>
    <p style="margin:0 0 8px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; Full auction catalog analysis (2 standard + 2 strategic)</p>
    <p style="margin:0 0 8px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; Breeze-Up biomechanical video analysis</p>
    <p style="margin:0 0 8px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; Advanced mating & broodmare planning</p>
    <p style="margin:0 0 8px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; Performance tracking & market intelligence</p>
    <p style="margin:0 0 24px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;"><span style="color:#D4AF37;">★</span>&nbsp; PDF report generation & export</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${proCheckoutUrl || PRICING_URL}" target="_blank" style="display:block;width:100%;background:linear-gradient(135deg,#D4AF37,#B8941F);color:#0B0B0D;text-decoration:none;text-align:center;padding:18px 32px;border-radius:6px;font-size:17px;font-weight:bold;font-family:'Cinzel','Georgia',serif;box-sizing:border-box;text-transform:uppercase;letter-spacing:1.5px;">Subscribe to Pro — $399/mo →</a>
    </td></tr>
    </table>

    <p style="margin:16px 0 0;font-size:12px;color:#888;text-align:center;font-family:'Georgia',serif;">Secure payment via Revolut. Cancel anytime.</p>
  </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:'Cinzel','Georgia',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;">
<tr><td align="center" style="padding:20px 0;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<!-- HEADER -->
<tr><td style="background:#0B0B0D;padding:30px 25px 20px;text-align:center;">
  <img src="${LOGO_URL}" alt="BloodstockAI" width="160" style="display:block;margin:0 auto;" />
</td></tr>

<!-- BODY -->
<tr><td style="background:#0B0B0D;padding:30px 35px;border-bottom:3px solid #D4AF37;">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:bold;color:#D4AF37;font-family:'Cinzel','Georgia',serif;">Hi ${recipientName}, Welcome to Bloodstock AI</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#CFCFCF;line-height:1.7;font-family:'Georgia',serif;">You have been personally invited to join the most advanced AI-powered bloodstock analysis platform in the industry.</p>

  <hr style="border:none;border-top:1px solid rgba(212,175,55,0.2);margin:0 0 24px;" />

  <p style="margin:0 0 16px;font-size:14px;font-weight:bold;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;font-family:'Cinzel','Georgia',serif;">WHAT YOU CAN DO</p>

  <p style="margin:0 0 10px;font-size:15px;color:#CFCFCF;line-height:1.6;font-family:'Georgia',serif;"><span style="color:#D4AF37;">✦</span>&nbsp; Upload sale catalogs — get instant AI purchase recommendations</p>
  <p style="margin:0 0 10px;font-size:15px;color:#CFCFCF;line-height:1.6;font-family:'Georgia',serif;"><span style="color:#D4AF37;">✦</span>&nbsp; Search any horse — pedigree, performance, and auction history</p>
  <p style="margin:0 0 10px;font-size:15px;color:#CFCFCF;line-height:1.6;font-family:'Georgia',serif;"><span style="color:#D4AF37;">✦</span>&nbsp; Run nick analysis and broodmare planning for your mares</p>
  <p style="margin:0 0 10px;font-size:15px;color:#CFCFCF;line-height:1.6;font-family:'Georgia',serif;"><span style="color:#D4AF37;">✦</span>&nbsp; Find and compare stallions by fee, availability, and bloodline</p>
  <p style="margin:0 0 24px;font-size:15px;color:#CFCFCF;line-height:1.6;font-family:'Georgia',serif;"><span style="color:#D4AF37;">✦</span>&nbsp; Access market intelligence from Keeneland, Tattersalls &amp; Goffs</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="${SIGNUP_URL}" target="_blank" style="display:block;width:100%;background:#D4AF37;color:#0B0B0D;text-decoration:none;text-align:center;padding:16px 32px;border-radius:6px;font-size:16px;font-weight:bold;font-family:'Cinzel','Georgia',serif;box-sizing:border-box;text-transform:uppercase;letter-spacing:1px;">Bem-vindo à BloodstockAI →</a>
  </td></tr>
  </table>
</td></tr>

<!-- PRO CTA -->
${proCta}

<!-- FOOTER -->
<tr><td style="background:#0B0B0D;padding:24px 25px;text-align:center;">
  <img src="${LOGO_URL}" alt="BloodstockAI" width="80" style="display:block;margin:0 auto 12px;" />
  <p style="margin:0 0 4px;font-size:12px;color:#999;font-family:'Georgia',serif;font-weight:bold;">Bloodstock AI LTD</p>
  <p style="margin:0 0 4px;font-size:11px;color:#777;font-family:'Georgia',serif;">Floor 3, 50–60 Station Rd, Cambridge CB1 2JH, United Kingdom</p>
  <p style="margin:0 0 8px;font-size:11px;color:#777;font-family:'Georgia',serif;"><a href="mailto:office@agentbloodstockai.com" style="color:#D4AF37;text-decoration:underline;">office@agentbloodstockai.com</a></p>
  <p style="margin:0 0 4px;font-size:11px;color:#666;font-family:'Georgia',serif;"><a href="${SITE_URL}" style="color:#D4AF37;text-decoration:underline;">www.agentbloodstockai.com</a></p>
  <p style="margin:0;font-size:11px;color:#666;font-family:'Georgia',serif;">&copy; 2026 BloodstockAI. All rights reserved.</p>
</td></tr>

</table>
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
    // Require authenticated super_admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let authorized = token === serviceKey;
    if (!authorized) {
      const verifyClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await verifyClient.auth.getUser(token);
      if (user) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: isAdmin } = await admin.rpc("has_role", {
          _user_id: user.id, _role: "super_admin",
        });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body = await req.json();
    const { emails, recipientName, includeProCta, proCheckoutUrl } = body;
    
    const emailList = emails && Array.isArray(emails) ? emails : [body.email];
    if (!emailList || emailList.length === 0) {
      throw new Error("emails array or email is required");
    }

    const name = recipientName || "there";
    const html = buildInvitationHtml(name, includeProCta !== false, proCheckoutUrl);
    const results: { email: string; success: boolean; error?: string }[] = [];

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < emailList.length; i++) {
      const email = emailList[i];
      if (i > 0) await delay(600);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Bloodstock AI <noreply@agentbloodstockai.com>",
            reply_to: "office@agentbloodstockai.com",
            to: [email],
            subject: "You're Invited to Bloodstock AI — Start Free + Go Pro",
            html,
          }),
        });

        if (res.ok) {
          results.push({ email, success: true });
        } else {
          const err = await res.text();
          results.push({ email, success: false, error: err });
        }
      } catch (e) {
        results.push({ email, success: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
