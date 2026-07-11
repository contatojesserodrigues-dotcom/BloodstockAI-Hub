import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  emailBodyClose,
  emailBodyOpen,
  emailButton,
  emailButtonOutline,
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
  EMAIL_FONT,
  LOGO_URL,
} from "../_shared/email-templates/theme-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNUP_URL = "https://www.agentbloodstockai.com/auth";
const SITE_URL = "https://www.agentbloodstockai.com";
const PRICING_URL = "https://www.agentbloodstockai.com/pricing";

function buildInvitationHtml(recipientName: string, includeProCta: boolean, proCheckoutUrl?: string): string {
  const proCta = includeProCta ? `
${emailDivider}
${emailH2("Exclusive: Professional Plan")}
${emailP(`Upgrade to our <strong>Professional Plan — $399/month</strong> and unlock unlimited access to every feature on the platform:`)}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; 1,000 AI analyses per month")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; Full auction catalog analysis (2 standard + 2 strategic)")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; Breeze-Up biomechanical video analysis")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; Advanced mating & broodmare planning")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; Performance tracking & market intelligence")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">★</span>&nbsp; PDF report generation & export")}
${emailButton(proCheckoutUrl || PRICING_URL, "Subscribe to Pro — $399/mo →")}
${emailMuted("Secure payment via Revolut. Cancel anytime.")}` : "";

  return `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1(`Hi ${recipientName}, Welcome to BloodstockAI`)}
${emailP("You have been personally invited to join the most advanced AI-powered bloodstock analysis platform in the industry.")}
${emailDivider}
${emailH2("What You Can Do")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Upload sale catalogs — get instant AI purchase recommendations")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Search any horse — pedigree, performance, and auction history")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Run nick analysis and broodmare planning for your mares")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Find and compare stallions by fee, availability, and bloodline")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Access market intelligence from Keeneland, Tattersalls &amp; Goffs")}
${emailButton(SIGNUP_URL, "Welcome to BloodstockAI →")}
${proCta}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
        results.push({ email, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});