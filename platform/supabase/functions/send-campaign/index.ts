import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated super_admin or service-role
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let authorized = !!token && token === serviceKey;
    if (!authorized && token) {
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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all users with profiles
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, first_name, full_name");

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const profile of profiles) {
      const firstName = profile.first_name || profile.full_name?.split(" ")[0] || "there";
      const email = profile.email;
      if (!email) continue;

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#0B0B0D;padding:30px 20px;text-align:center;">
    <h1 style="color:#D4AF37;font-family:'Georgia',serif;font-size:24px;margin:0;">BloodstockAI</h1>
  </div>
  <div style="padding:30px 25px;color:#333;">
    <p style="font-size:16px;line-height:1.6;">Hi ${firstName},</p>
    <p style="font-size:15px;line-height:1.7;">Thank you for being part of BloodstockAI — the AI-powered platform transforming how bloodstock professionals research, analyze, and make decisions.</p>
    <p style="font-size:15px;line-height:1.7;">We'd love to hear about your experience. How has BloodstockAI been working for you so far?</p>
    <p style="font-size:15px;line-height:1.7;">Reply to this email and tell us — your feedback shapes everything we build next.</p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:25px 0;">
    <div style="background:#FFFDF5;border:2px solid #D4AF37;border-radius:8px;padding:20px;text-align:center;">
      <p style="font-size:18px;font-weight:bold;color:#0B0B0D;margin:0 0 5px;">🎁 EXCLUSIVE OFFER — 20% OFF ANY ANNUAL PLAN</p>
      <p style="font-size:14px;color:#555;margin:0 0 15px;">As a valued member, we're offering you 20% off any annual plan.</p>
    </div>
    <p style="font-size:15px;line-height:1.7;margin-top:20px;">Whether you're looking to unlock deeper pedigree analysis, broodmare planning, unlimited PDF reports, or full catalogue uploads — now is the perfect time to upgrade.</p>
    <p style="font-size:14px;font-weight:bold;color:#0B0B0D;">Here's what BloodstockAI can do for you:</p>
    <ul style="font-size:14px;line-height:2;color:#333;padding-left:20px;">
      <li>🔍 Search any thoroughbred instantly across global databases</li>
      <li>📊 Full race performance & speed figure analysis</li>
      <li>🧬 Deep pedigree, inbreeding & dosage analysis</li>
      <li>🐴 Yearling & unnamed horse analysis with sibling comparisons</li>
      <li>📋 Broodmare Plans & breeding strategy reports</li>
      <li>🏷️ Sales history across Keeneland, Tattersalls, Goffs, Arqana, Magic Millions, OBS, Inglis, Arion NZ & more</li>
      <li>📄 Professional PDF reports (up to 12 pages)</li>
      <li>📈 Weekly market reports & insights</li>
      <li>🌍 Global coverage — UK, Ireland, France, USA, Australia & NZ</li>
    </ul>
    <p style="font-size:15px;line-height:1.7;">Use code: <strong style="color:#D4AF37;">ANNUAL20</strong> at checkout for 20% off any annual plan.</p>
    <div style="text-align:center;margin:25px 0;">
      <a href="https://agentbloodstockai.lovable.app/pricing" style="display:inline-block;background:#D4AF37;color:#0B0B0D;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:6px;text-decoration:none;">Upgrade Now and Save 20% →</a>
    </div>
    <p style="font-size:13px;color:#999;">This offer is available for a limited time.</p>
    <p style="font-size:15px;line-height:1.7;">Best regards,<br><strong>The BloodstockAI Team</strong></p>
  </div>
  <div style="background:#0B0B0D;padding:20px;text-align:center;">
    <p style="color:#D4AF37;font-size:13px;margin:0 0 5px;font-family:'Georgia',serif;">BloodstockAI — Smarter Bloodstock Decisions, Powered by AI</p>
    <p style="color:#666;font-size:11px;margin:0;">
      <a href="https://agentbloodstockai.lovable.app/privacy-policy" style="color:#666;">Unsubscribe</a> | 
      <a href="https://agentbloodstockai.lovable.app/privacy-policy" style="color:#666;">Privacy Policy</a>
    </p>
  </div>
</div>
</body></html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "BloodstockAI <noreply@agentbloodstockai.com>",
            reply_to: "office@agentbloodstockai.com",
            to: [email],
            subject: "How was your BloodstockAI experience? 🐎 + Exclusive 20% Off",
            html,
          }),
        });
        if (res.ok) { sent++; } else { failed++; console.error(`Failed for ${email}:`, await res.text()); }
      } catch (e) { failed++; console.error(`Error sending to ${email}:`, e); }

      // Rate limit: small delay between emails
      await new Promise(r => setTimeout(r, 200));
    }

    // Log the campaign
    await supabaseAdmin.from("email_logs").insert({
      type: "campaign_annual20",
      recipient: "all_users",
      subject: "How was your BloodstockAI experience? 🐎 + Exclusive 20% Off",
      status: "sent",
      metadata: { sent, failed, total: profiles.length },
    });

    return new Response(JSON.stringify({ success: true, sent, failed, total: profiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Campaign error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
