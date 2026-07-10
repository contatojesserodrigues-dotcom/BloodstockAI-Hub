import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  emailBodyClose,
  emailBodyOpen,
  emailButton,
  emailCardClose,
  emailCardOpen,
  emailDivider,
  emailFeatureItem,
  emailFooterBarHtml,
  emailH1,
  emailH2,
  emailHeaderHtml,
  emailHighlightBox,
  emailLink,
  emailMuted,
  emailP,
  EMAIL_COLORS,
} from "../_shared/email-templates/theme-html.ts";

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

      const html = `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailP(`Hi ${firstName},`)}
${emailP("Thank you for being part of BloodstockAI — the AI-powered platform transforming how bloodstock professionals research, analyze, and make decisions.")}
${emailP("We'd love to hear about your experience. How has BloodstockAI been working for you so far?")}
${emailP("Reply to this email and tell us — your feedback shapes everything we build next.")}
${emailDivider}
${emailHighlightBox(`<p style="font-size:16px;font-weight:600;color:${EMAIL_COLORS.text};margin:0 0 6px;">🎁 Exclusive Offer — 20% Off Any Annual Plan</p><p style="font-size:14px;color:${EMAIL_COLORS.muted};margin:0;">As a valued member, we're offering you 20% off any annual plan.</p>`)}
${emailP("Whether you're looking to unlock deeper pedigree analysis, broodmare planning, unlimited PDF reports, or full catalogue uploads — now is the perfect time to upgrade.")}
${emailH2("Here's what BloodstockAI can do for you")}
${emailFeatureItem("🔍 Search any thoroughbred instantly across global databases")}
${emailFeatureItem("📊 Full race performance & speed figure analysis")}
${emailFeatureItem("🧬 Deep pedigree, inbreeding & dosage analysis")}
${emailFeatureItem("🐴 Yearling & unnamed horse analysis with sibling comparisons")}
${emailFeatureItem("📋 Broodmare Plans & breeding strategy reports")}
${emailFeatureItem("🏷️ Sales history across Keeneland, Tattersalls, Goffs, Arqana, Magic Millions, OBS, Inglis & more")}
${emailFeatureItem("📄 Professional PDF reports (up to 12 pages)")}
${emailFeatureItem("📈 Weekly market reports & insights")}
${emailFeatureItem("🌍 Global coverage — UK, Ireland, France, USA, Australia & NZ")}
${emailP(`Use code: <strong style="color:${EMAIL_COLORS.gold};">ANNUAL20</strong> at checkout for 20% off any annual plan.`)}
${emailButton("https://www.agentbloodstockai.com/pricing", "Upgrade Now and Save 20% →")}
${emailMuted("This offer is available for a limited time.")}
${emailP("Best regards,<br><strong>The BloodstockAI Team</strong>")}
${emailCardClose}
${emailFooterBarHtml("https://www.agentbloodstockai.com")}
${emailBodyClose}`;

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
