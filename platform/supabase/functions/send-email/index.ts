import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "BloodstockAI <noreply@agentbloodstockai.com>";
const OFFICE_EMAIL = "office@agentbloodstockai.com";
const SITE_URL = "https://www.agentbloodstockai.com";

function newsletterWelcomeHtml(email: string, name?: string | null): string {
  const greeting = name ? name : "there";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="background:#0B0B0D;text-align:center;padding:30px 25px 20px;">
    <img src="https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="BloodstockAI" width="160" style="display:block;margin:0 auto;" />
  </td></tr>
  <tr><td style="background:#0B0B0D;padding:30px 35px;border-bottom:3px solid #D4AF37;">
    <h1 style="font-family:'Cinzel',Georgia,serif;font-size:22px;color:#D4AF37;margin:0 0 20px;">Welcome to BloodstockAI</h1>
    <p style="font-size:15px;color:#CFCFCF;line-height:1.6;margin:0 0 16px;">Hello ${greeting},</p>
    <p style="font-size:15px;color:#CFCFCF;line-height:1.6;margin:0 0 16px;">
      Thank you for subscribing to our newsletter! <strong>BloodstockAI</strong> is the most advanced AI-powered platform for thoroughbred analysis — covering pedigree research, performance data, mating analysis, stallion recommendations, broodmare planning, and auction catalogue intelligence.
    </p>
    <p style="font-size:15px;color:#CFCFCF;line-height:1.6;margin:0 0 16px;">
      You can <strong>create a free account</strong> and explore the entire platform. When you're ready to run an analysis, simply choose the plan that suits you best.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr><td style="background:#D4AF37;border-radius:6px;text-align:center;">
        <a href="${SITE_URL}/auth" style="display:inline-block;padding:14px 28px;color:#0B0B0D;font-family:'Cinzel',Georgia,serif;font-size:13px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Create Free Account</a>
      </td></tr>
    </table>

    <div style="border-top:1px solid rgba(212,175,55,0.2);margin:24px 0;"></div>

    <p style="font-size:14px;color:#D4AF37;font-weight:bold;margin:0 0 10px;font-family:'Cinzel',Georgia,serif;">EXPLORE OUR PLANS</p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.6;margin:0 0 16px;">
      Explore nossos planos mensais e anuais — ou entre em contato para análises e consultoria única para leilões ou lotes específicos.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr><td style="border:1px solid #D4AF37;border-radius:6px;text-align:center;">
        <a href="${SITE_URL}/pricing" style="display:inline-block;padding:12px 24px;color:#D4AF37;font-family:'Cinzel',Georgia,serif;font-size:12px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">View Plans &rarr;</a>
      </td></tr>
    </table>

    <div style="border-top:1px solid rgba(212,175,55,0.2);margin:24px 0;"></div>

    <p style="font-size:14px;color:#D4AF37;font-weight:bold;margin:0 0 10px;font-family:'Cinzel',Georgia,serif;">MARKET REPORTS &amp; AUCTION CATALOGUES</p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.6;margin:0 0 16px;">
      Check out our ready-made market reports and auction catalogue analyses covering <strong>UK, Ireland, USA</strong> and <strong>Australia</strong> — Tattersalls, Goffs, Keeneland, Fasig-Tipton, Magic Millions and more.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr><td style="border:1px solid #D4AF37;border-radius:6px;text-align:center;">
        <a href="${SITE_URL}/reports" style="display:inline-block;padding:12px 24px;color:#D4AF37;font-family:'Cinzel',Georgia,serif;font-size:12px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">View Reports &rarr;</a>
      </td></tr>
    </table>

    <div style="border-top:1px solid rgba(212,175,55,0.2);margin:24px 0;"></div>

    <p style="font-size:14px;color:#D4AF37;font-weight:bold;margin:0 0 10px;font-family:'Cinzel',Georgia,serif;">CONTACT US</p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.6;margin:0 0 6px;">
      For enquiries, bespoke analysis or consultancy on specific lots:
    </p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.8;margin:0 0 6px;">
      &#x1F1EC;&#x1F1E7; UK: <a href="tel:+447533314408" style="color:#D4AF37;text-decoration:none;">+44 7533 314408</a>
    </p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.8;margin:0 0 16px;">
      &#x1F1EE;&#x1F1EA; IRE: <a href="tel:+3530831949936" style="color:#D4AF37;text-decoration:none;">+353 083 194 9936</a>
    </p>
    <p style="font-size:14px;color:#CFCFCF;line-height:1.6;margin:0 0 6px;">
      Email: <a href="mailto:office@agentbloodstockai.com" style="color:#D4AF37;text-decoration:underline;">office@agentbloodstockai.com</a>
    </p>

    <p style="font-size:11px;color:#888;margin:24px 0 0;">
      You can <a href="${SITE_URL}" style="color:#D4AF37;text-decoration:underline;">unsubscribe</a> at any time.
    </p>
  </td></tr>
  <tr><td style="background:#0B0B0D;text-align:center;padding:15px 25px;">
    <p style="font-size:11px;color:#666;margin:0;">&copy; 2025 BloodstockAI. All rights reserved.</p>
    <p style="font-size:11px;color:#666;margin:4px 0 0;"><a href="${SITE_URL}" style="color:#D4AF37;text-decoration:none;">www.agentbloodstockai.com</a></p>
  </td></tr>
</table>
</body>
</html>`;
}

function newUserNotificationHtml(email: string, name: string | null, plan: string, timestamp: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;">
<h2 style="color:#0B0B0D;">New Platform Registration - BloodstockAI</h2>
<p>Email: <strong>${esc(email)}</strong> | Registered at: <strong>${esc(timestamp)}</strong>${name ? ` | Name: <strong>${esc(name)}</strong>` : ""}</p>
</body></html>`;
}

function newsletterNotificationHtml(email: string, name: string | null, source: string, timestamp: string, totalCount: number): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;">
<h2 style="color:#0B0B0D;">New Newsletter Subscriber - BloodstockAI</h2>
<p>Email: <strong>${esc(email)}</strong> | Source page: <strong>${esc(source)}</strong> | Time: <strong>${esc(timestamp)}</strong></p>
<p style="color:#666;font-size:12px;">Total active subscribers: ${totalCount}</p>
</body></html>`;
}

// Brevo contact list integration. Silently no-ops if BREVO_API_KEY is not set.
// Lists are resolved (or created) by NAME at runtime. Resolved IDs are cached
// in-memory per cold start so we only hit the lookup/create endpoints once.
const BREVO_LIST_NAMES = {
  newsletter: "Newsletter - BloodstockAI",
  registered: "Registered Users - BloodstockAI",
} as const;
const brevoListIdCache: Record<string, number> = {};

async function brevoFetch(apiKey: string, path: string, init: RequestInit = {}) {
  return fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

async function resolveBrevoListId(apiKey: string, desiredName: string): Promise<number | null> {
  if (brevoListIdCache[desiredName]) return brevoListIdCache[desiredName];

  // 1) Look up existing lists (paginated, but two pages of 50 is plenty for our use case)
  try {
    for (let offset = 0; offset < 200; offset += 50) {
      const res = await brevoFetch(apiKey, `/contacts/lists?limit=50&offset=${offset}&sort=desc`);
      if (!res.ok) break;
      const data = await res.json();
      const lists: Array<{ id: number; name: string }> = data?.lists || [];
      const match = lists.find((l) => l.name === desiredName);
      if (match) {
        brevoListIdCache[desiredName] = match.id;
        return match.id;
      }
      if (lists.length < 50) break;
    }
  } catch (err) {
    console.error("Brevo list lookup failed:", err);
  }

  // 2) Resolve or create the default folder (#1 always exists on new accounts, but be safe).
  let folderId = 1;
  try {
    const folderRes = await brevoFetch(apiKey, `/contacts/folders?limit=10&offset=0`);
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      const folders: Array<{ id: number; name: string }> = folderData?.folders || [];
      if (folders.length > 0) folderId = folders[0].id;
    }
    if (!folderId) {
      const createFolder = await brevoFetch(apiKey, `/contacts/folders`, {
        method: "POST",
        body: JSON.stringify({ name: "BloodstockAI" }),
      });
      if (createFolder.ok) {
        const f = await createFolder.json();
        folderId = f?.id || 1;
      }
    }
  } catch (err) {
    console.error("Brevo folder resolve failed:", err);
  }

  // 3) Create the list.
  try {
    const createRes = await brevoFetch(apiKey, `/contacts/lists`, {
      method: "POST",
      body: JSON.stringify({ name: desiredName, folderId }),
    });
    if (createRes.ok) {
      const created = await createRes.json();
      if (created?.id) {
        brevoListIdCache[desiredName] = created.id;
        return created.id;
      }
    } else {
      console.error("Brevo list create failed:", createRes.status, await createRes.text());
    }
  } catch (err) {
    console.error("Brevo list create error:", err);
  }

  return null;
}

async function addToBrevoList(
  email: string,
  listKey: keyof typeof BREVO_LIST_NAMES,
  attributes?: Record<string, unknown>,
) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return;
  const desiredName = BREVO_LIST_NAMES[listKey];
  const listId = await resolveBrevoListId(apiKey, desiredName);
  const listIds = listId ? [listId] : undefined;
  // Strip undefined attribute values (Brevo rejects nulls in some cases).
  const cleanAttrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attributes || {})) {
    if (v !== undefined && v !== null && v !== "") cleanAttrs[k] = v;
  }
  try {
    const res = await brevoFetch(apiKey, `/contacts`, {
      method: "POST",
      body: JSON.stringify({
        email,
        attributes: cleanAttrs,
        listIds,
        updateEnabled: true,
      }),
    });
    if (!res.ok && res.status !== 204) {
      // 400 with "Contact already exists" + updateEnabled handles dedupe; log others.
      const txt = await res.text();
      if (!txt.includes("duplicate_parameter")) {
        console.error("Brevo contact upsert non-ok:", res.status, txt);
      }
    }
  } catch (err) {
    console.error("Brevo add-contact failed (non-blocking):", err);
  }
}

async function sendWithResend(apiKey: string, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
      });
      const data = await res.json();
      if (res.ok) return { ok: true, id: data.id };
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { ok: false, error: JSON.stringify(data) };
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { ok: false, error: String(err) };
    }
  }
  return { ok: false, error: "Max retries exceeded" };
}

async function logEmail(supabase: any, type: string, recipient: string, subject: string, status: string, errorMessage?: string, metadata?: any) {
  await supabase.from("email_logs").insert({
    type, recipient, subject, status,
    error_message: errorMessage || null,
    metadata: metadata || null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authorization: require service-role key (for internal edge-to-edge calls)
    // or an authenticated super_admin user. This prevents abuse of the email
    // sender for phishing/spam.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let authorized = token && token === serviceKey;
    if (!authorized && token) {
      const verifyClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: { user } } = await verifyClient.auth.getUser(token);
      if (user) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
        const { data: isAdmin } = await admin.rpc("has_role", {
          _user_id: user.id, _role: "super_admin",
        });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { type } = body;
    const now = new Date().toLocaleString("en-IE", { timeZone: "Europe/Dublin" });

    if (type === "new_user_signup") {
      const { email, name, plan } = body;

      // Send internal notification to office
      const subject = `New Platform Registration - BloodstockAI`;
      const html = newUserNotificationHtml(email, name, plan || "Free", now);
      const result = await sendWithResend(resendKey, OFFICE_EMAIL, subject, html);
      await logEmail(supabaseAdmin, "new_user_notification", OFFICE_EMAIL, subject, result.ok ? "sent" : "failed", result.error);

      // Add to Brevo "Registered Users - BloodstockAI" list (no-op if not configured)
      await addToBrevoList(email, "registered", {
        FIRSTNAME: name || undefined,
        SIGNUP_PLAN: plan || "Free",
        REGISTERED_AT: now,
      });

      if (!result.ok) {
        // Alert office about failure
        console.error("Failed to send new user notification:", result.error);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "newsletter_subscribe") {
      const { email, name, source } = body;
      const normalizedEmail = email.trim().toLowerCase();

      // Insert into newsletter_subscribers (upsert)
      const { error: subError } = await supabaseAdmin
        .from("newsletter_subscribers")
        .upsert({ email: normalizedEmail, name: name || null, source: source || "homepage" }, { onConflict: "email" });

      if (subError) console.error("Newsletter insert error:", subError);

      // Add to Brevo "Newsletter - BloodstockAI" list (no-op if not configured).
      await addToBrevoList(normalizedEmail, "newsletter", {
        FIRSTNAME: name || undefined,
        SOURCE: source || "homepage",
        SUBSCRIBED_AT: now,
      });

      // Get total count
      const { count } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      // Send welcome email to subscriber
      const welcomeSubject = "Welcome to the BloodstockAI Inner Circle";
      const welcomeHtml = newsletterWelcomeHtml(normalizedEmail, name);
      const welcomeResult = await sendWithResend(resendKey, normalizedEmail, welcomeSubject, welcomeHtml);
      await logEmail(supabaseAdmin, "newsletter_welcome", normalizedEmail, welcomeSubject, welcomeResult.ok ? "sent" : "failed", welcomeResult.error);

      // Send notification to office
      const notifSubject = `New Newsletter Subscriber - BloodstockAI`;
      const notifHtml = newsletterNotificationHtml(normalizedEmail, name, source || "homepage", now, count || 0);
      const notifResult = await sendWithResend(resendKey, OFFICE_EMAIL, notifSubject, notifHtml);
      await logEmail(supabaseAdmin, "newsletter_notification", OFFICE_EMAIL, notifSubject, notifResult.ok ? "sent" : "failed", notifResult.error);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "trial_invitation") {
      const { email, name } = body;
      const greeting = name || "there";
      const LOGO_URL = "https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png";
      const SIGNUP_URL = "https://www.agentbloodstockai.com/auth";

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="background:#1A2E1A;text-align:center;padding:32px 25px;">
    <img src="${LOGO_URL}" alt="BloodstockAI" width="160" style="display:block;margin:0 auto;" />
  </td></tr>
  <tr><td style="background:#F5F0E8;padding:40px 32px;">
    <h1 style="font-family:Georgia,serif;font-size:26px;color:#1C1A14;margin:0 0 12px;font-weight:bold;">Your Bloodstock AI Trial is Ready</h1>
    <p style="font-size:15px;color:#9B8E7A;line-height:1.6;margin:0 0 24px;">
      You have been personally invited to explore the most advanced AI-powered bloodstock analysis platform — free, for 10 analyses.
    </p>
    <hr style="border:none;border-top:1px solid #D9D0BE;margin:0 0 24px;" />
    <p style="font-size:13px;color:#1C1A14;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">WHAT YOU CAN DO WITH 10 FREE ANALYSES</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Upload sale catalogs — get instant AI purchase recommendations</td></tr>
      <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Search any horse — pedigree, performance, and auction history</td></tr>
      <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Run nick analysis and broodmare planning for your mares</td></tr>
      <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Find and compare stallions by fee, availability, and bloodline</td></tr>
       <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Access weekly market reports from Keeneland, Tattersalls &amp; Goffs</td></tr>
       <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;Breeze-Up Analysis — deep family research for 2yo sales horses (paid plans)</td></tr>
       <tr><td style="padding:4px 0;font-size:15px;color:#1C1A14;line-height:1.6;"><span style="color:#C9A84C;font-size:14px;">✦</span>&nbsp;&nbsp;📷 Visual Analysis — AI photo &amp; video conformation analysis (PRO/$49)</td></tr>
    </table>
    <p style="font-size:14px;color:#6B5E4E;font-style:italic;margin:0 0 28px;">Create your free account and explore all features. Choose a plan when you're ready to analyse.</p>
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="background:#C9A84C;border-radius:6px;text-align:center;">
        <a href="${SIGNUP_URL}" style="display:block;padding:16px 32px;color:#FFFFFF;font-family:Georgia,serif;font-size:16px;font-weight:bold;text-decoration:none;">Create My Free Account →</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="border-top:1px solid #D9D0BE;padding:20px 32px;text-align:center;">
    <p style="font-size:12px;color:#9B8E7A;margin:0 0 4px;">Bloodstock AI · www.agentbloodstockai.com</p>
    <p style="font-size:12px;color:#9B8E7A;margin:0 0 4px;">You received this because you were personally invited to trial the platform.</p>
    <p style="font-size:12px;color:#9B8E7A;margin:0;">Questions? Reply to this email.</p>
  </td></tr>
</table>
</body>
</html>`;

      const subject = "Your Bloodstock AI Access is Ready — Explore Free Today";
      const result = await sendWithResend(resendKey, email, subject, html);
      await logEmail(supabaseAdmin, "trial_invitation", email, subject, result.ok ? "sent" : "failed", result.error);

      return new Response(JSON.stringify({ success: result.ok, error: result.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown email type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
