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
} from "../_shared/email-templates/theme-html.ts";
import { toOfficialAuthLink } from "../_shared/auth-links.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isServiceRoleJwt(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

const RESEND_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "BloodstockAI <noreply@agentbloodstockai.com>";
const OFFICE_EMAIL = "office@agentbloodstockai.com";
const SITE_URL = "https://www.agentbloodstockai.com";

function newsletterWelcomeHtml(email: string, name?: string | null): string {
  const greeting = name ? name : "there";
  return `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1("Welcome to BloodstockAI")}
${emailP(`Hello ${greeting},`)}
${emailP(`Thank you for subscribing to our newsletter! <strong>BloodstockAI</strong> is the most advanced AI-powered platform for thoroughbred analysis — covering pedigree research, performance data, mating analysis, stallion recommendations, broodmare planning, and auction catalogue intelligence.`)}
${emailP(`You can <strong>create a free account</strong> and explore the entire platform. When you're ready to run an analysis, simply choose the plan that suits you best.`)}
${emailButton(`${SITE_URL}/auth`, "Create Free Account")}
${emailDivider}
${emailH2("Explore Our Plans")}
${emailP("Explore our monthly and annual plans — or contact us for bespoke analysis and consultancy on specific lots or auctions.")}
${emailButtonOutline(`${SITE_URL}/pricing`, "View Plans →")}
${emailDivider}
${emailH2("Market Reports & Auction Catalogues")}
${emailP(`Check out our ready-made market reports and auction catalogue analyses covering <strong>UK, Ireland, USA</strong> and <strong>Australia</strong> — Tattersalls, Goffs, Keeneland, Fasig-Tipton, Magic Millions and more.`)}
${emailButtonOutline(`${SITE_URL}/reports`, "View Reports →")}
${emailDivider}
${emailH2("Contact Us")}
${emailP("For enquiries, bespoke analysis or consultancy on specific lots:")}
${emailP(`🇬🇧 UK: ${emailLink("tel:+447533314408", "+44 7533 314408")}`)}
${emailP(`🇮🇪 IRE: ${emailLink("tel:+3530831949936", "+353 083 194 9936")}`)}
${emailP(`Email: ${emailLink("mailto:office@agentbloodstockai.com", "office@agentbloodstockai.com")}`)}
${emailMuted(`You can ${emailLink(SITE_URL, "unsubscribe")} at any time.`)}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;
}

function newUserNotificationHtml(email: string, name: string | null, plan: string, timestamp: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1("New Platform Registration")}
${emailP(`Email: <strong>${esc(email)}</strong>`)}
${emailP(`Registered at: <strong>${esc(timestamp)}</strong>`)}
${name ? emailP(`Name: <strong>${esc(name)}</strong>`) : ""}
${emailP(`Plan: <strong>${esc(plan || "Free")}</strong>`)}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;
}

function newsletterNotificationHtml(email: string, name: string | null, source: string, timestamp: string, totalCount: number): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1("New Newsletter Subscriber")}
${emailP(`Email: <strong>${esc(email)}</strong>`)}
${emailP(`Source page: <strong>${esc(source)}</strong>`)}
${emailP(`Time: <strong>${esc(timestamp)}</strong>`)}
${emailMuted(`Total active subscribers: ${totalCount}`)}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;
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
    let authorized = token && (token === serviceKey || isServiceRoleJwt(token));
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

    if (type === "platform_access_welcome") {
      const { email, action_link, name } = body;
      const displayName = name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const officialLink = toOfficialAuthLink(action_link);
      const html = `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1(`Welcome, ${displayName}`)}
${emailP(`Your <strong>BloodstockAI</strong> account is ready on our new platform — the most advanced AI system for thoroughbred bloodstock analysis.`)}
${emailDivider}
${emailH2("Create Your Password")}
${emailP("Tap the button below to set your password and open your dashboard at <strong>www.agentbloodstockai.com</strong>. This secure link is personal to you.")}
${emailButton(officialLink, "Set Password & Access Platform →")}
${emailDivider}
${emailH2("Platform Features")}
${emailFeatureItem("<span style=\"color:#C58A2B;font-weight:600;\">✦</span>&nbsp; Horse Search — 6-generation pedigree &amp; performance")}
${emailFeatureItem("<span style=\"color:#C58A2B;font-weight:600;\">✦</span>&nbsp; Sale Inspection — AI photo &amp; video analysis")}
${emailFeatureItem("<span style=\"color:#C58A2B;font-weight:600;\">✦</span>&nbsp; Auction Catalogue Upload with buying recommendations")}
${emailFeatureItem("<span style=\"color:#C58A2B;font-weight:600;\">✦</span>&nbsp; Breeze-Up, Broodmare Plans &amp; Matings Analysis")}
${emailHighlightBox(`<p style="font-size:14px;color:${EMAIL_COLORS.body};margin:0;line-height:1.6;">To unlock full analysis features, choose a plan at <a href="${SITE_URL}/pricing" style="color:${EMAIL_COLORS.gold};font-weight:600;text-decoration:none;">agentbloodstockai.com/pricing</a>. Monthly and annual options available.</p>`)}
${emailMuted(`Need help? Contact us at ${emailLink("mailto:office@agentbloodstockai.com", "office@agentbloodstockai.com")} or +44 7533 314408.`)}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;
      const subject = `${displayName}, your BloodstockAI account is ready`;
      const result = await sendWithResend(resendKey, email, subject, html);
      await logEmail(supabaseAdmin, "platform_access_welcome", email, subject, result.ok ? "sent" : "failed", result.error);
      return new Response(JSON.stringify({ success: result.ok, error: result.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "trial_invitation") {
      const { email, name } = body;
      const SIGNUP_URL = "https://www.agentbloodstockai.com/auth";

      const html = `${emailBodyOpen}
${emailHeaderHtml}
${emailCardOpen}
${emailH1("Your BloodstockAI Trial is Ready")}
${emailP("You have been personally invited to explore the most advanced AI-powered bloodstock analysis platform — free, for 10 analyses.")}
${emailDivider}
${emailH2("What You Can Do With 10 Free Analyses")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Upload sale catalogs — get instant AI purchase recommendations")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Search any horse — pedigree, performance, and auction history")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Run nick analysis and broodmare planning for your mares")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Find and compare stallions by fee, availability, and bloodline")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Access weekly market reports from Keeneland, Tattersalls &amp; Goffs")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Breeze-Up Analysis — deep family research for 2yo sales horses (paid plans)")}
${emailFeatureItem("<span style=\"color:#C58A2B;\">✦</span>&nbsp; Visual Analysis — AI photo &amp; video conformation analysis (PRO)")}
${emailHighlightBox(`<p style="font-size:14px;color:${EMAIL_COLORS.body};margin:0;font-style:italic;">Create your free account and explore all features. Choose a plan when you're ready to analyse.</p>`)}
${emailButton(SIGNUP_URL, "Create My Free Account →")}
${emailMuted("You received this because you were personally invited to trial the platform.")}
${emailCardClose}
${emailFooterBarHtml(SITE_URL)}
${emailBodyClose}`;

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
