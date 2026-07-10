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

  const escapeHtml = (s: unknown): string =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  try {
    const body = await req.json();
    const { full_name, company_name, email, plan_interest, message, _hp, type, source } = body;

    // Honeypot check
    if (_hp) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isNewsletter = type === "newsletter";
    const isNewRegistration = type === "new_registration";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isNewsletter && !isNewRegistration) {
      if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2 || full_name.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid name" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "Unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Public proxy: notify office + Brevo "Registered Users" list on new signup.
    if (isNewRegistration) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            type: "new_user_signup",
            email: email.trim().toLowerCase(),
            name: typeof full_name === "string" ? full_name.trim() : null,
            plan: "Free",
          }),
        });
      } catch (e) {
        console.error("Registration notification failed (non-blocking):", e);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For newsletter: insert into both plan_inquiries (legacy) and trigger send-email
    if (isNewsletter) {
      // Legacy insert
      await supabaseAdmin.from("plan_inquiries").insert({
        full_name: "Newsletter Subscriber",
        company_name: "N/A",
        email: email.trim().toLowerCase(),
        plan_interest: "Newsletter",
      });

      // New canonical newsletter_leads table (separate from registered users)
      const sourceUrl = typeof source === "string" ? source : "homepage";
      await supabaseAdmin.from("newsletter_leads").upsert(
        {
          email: email.trim().toLowerCase(),
          source_url: sourceUrl,
          type: "newsletter",
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

      // Trigger the send-email function for newsletter welcome + office notification
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "newsletter_subscribe",
            email: email.trim().toLowerCase(),
            name: null,
            source: sourceUrl,
          }),
        });
      } catch (emailErr) {
        console.error("Newsletter email trigger failed (non-blocking):", emailErr);
      }
    } else {
      // Plan inquiry / Contact form
      const { error: dbError } = await supabaseAdmin.from("plan_inquiries").insert({
        full_name: full_name.trim(),
        company_name: (company_name || "N/A").trim(),
        email: email.trim().toLowerCase(),
        plan_interest: plan_interest || "General",
      });
      if (dbError) throw new Error("Failed to save inquiry");

      // Send office notification via Resend directly
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const now = new Date().toLocaleString("en-IE", { timeZone: "Europe/Dublin" });
        const isContactForm = source === "contact-page";
        const subject = isContactForm ? "New Contact Message - BloodstockAI" : "New Plan Request - BloodstockAI";
        
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "BloodstockAI <noreply@agentbloodstockai.com>",
              to: ["office@agentbloodstockai.com"],
              subject,
              html: `<h2>${isContactForm ? "New Contact Message" : "New Plan Request"}</h2>
<table style="border-collapse:collapse;width:100%;max-width:500px;">
  <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">${escapeHtml(full_name.trim())}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${escapeHtml(email.trim())}</td></tr>
  ${!isContactForm ? `<tr><td style="padding:8px;font-weight:bold;">Company:</td><td style="padding:8px;">${escapeHtml((company_name || "N/A").trim())}</td></tr>` : ""}
  ${!isContactForm ? `<tr><td style="padding:8px;font-weight:bold;">Plan:</td><td style="padding:8px;">${escapeHtml(plan_interest || "General")}</td></tr>` : ""}
  ${message ? `<tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">${escapeHtml(String(message).substring(0, 2000))}</td></tr>` : ""}
  <tr><td style="padding:8px;font-weight:bold;">Source:</td><td style="padding:8px;">${escapeHtml(source || "website")}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">Date:</td><td style="padding:8px;">${now}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">IP:</td><td style="padding:8px;">${userIp}</td></tr>
</table>`,
            }),
          });
        } catch (e) {
          console.error("Email failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Contact inquiry error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});