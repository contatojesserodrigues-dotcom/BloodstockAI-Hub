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