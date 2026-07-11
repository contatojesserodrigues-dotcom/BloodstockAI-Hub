#!/usr/bin/env node
/**
 * Migrate platform users from old Supabase + Resend contacts into production Supabase.
 * Sends password-setup emails via Resend so users can log in.
 *
 * Usage:
 *   NEW_SERVICE_ROLE_KEY=... \
 *   RESEND_API_KEY=re_... \
 *   OLD_SERVICE_ROLE_KEY=... \  # optional — old Lovable project
 *   node scripts/migrate-platform-users.mjs
 *
 * Options:
 *   SEND_WELCOME_EMAIL=1   — email recovery links (default 1)
 *   DRY_RUN=1              — list only, no writes
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const loadEnv = (path) => {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
};

const platformEnv = loadEnv(".env");
const NEW_URL = process.env.NEW_SUPABASE_URL ?? platformEnv.VITE_SUPABASE_URL ?? "https://uzkicvizgezitiyhihcq.supabase.co";
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://zqeegxhqtnabzkcmgcfv.supabase.co";
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL ?? "https://www.agentbloodstockai.com";
const SEND_EMAIL = process.env.SEND_WELCOME_EMAIL !== "0";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!NEW_KEY) {
  console.error("Set NEW_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const newAdmin = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function listAllUsers(client) {
  const users = [];
  let page = 1;
  while (page <= 50) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < 200) break;
    page += 1;
  }
  return users;
}

async function fetchResendContacts(apiKey) {
  const emails = new Set();
  const audRes = await fetch("https://api.resend.com/audiences", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!audRes.ok) {
    console.warn("Resend audiences fetch failed:", audRes.status);
    return [];
  }
  const audiences = await audRes.json();
  for (const aud of audiences.data ?? []) {
    let after = undefined;
    for (let i = 0; i < 20; i++) {
      const url = new URL(`https://api.resend.com/audiences/${aud.id}/contacts`);
      if (after) url.searchParams.set("after", after);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) break;
      const data = await res.json();
      for (const c of data.data ?? []) {
        if (c.email) emails.add(c.email.toLowerCase().trim());
      }
      after = data.next;
      if (!after) break;
    }
  }
  return [...emails];
}

async function sendWelcomeEmail(email, actionLink) {
  if (!RESEND_KEY || !SEND_EMAIL) return { skipped: true };
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <h2>Welcome to BloodstockAI</h2>
    <p>Your account is ready on the new platform. Set your password to access your dashboard:</p>
    <p><a href="${actionLink}" style="display:inline-block;background:#0F172A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Set Password & Login</a></p>
    <p>Or copy this link: ${actionLink}</p>
    <p>After login, choose a plan at <a href="${APP_URL}/pricing">${APP_URL}/pricing</a> to unlock full analysis features.</p>
    <p>— BloodstockAI Team</p>
  </body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "BloodstockAI <noreply@agentbloodstockai.com>",
      to: [email],
      subject: "Your BloodstockAI account — set your password",
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { error: err };
  }
  return { ok: true };
}

async function ensureUser(email, metadata = {}, oldProfile = null) {
  const normalized = email.toLowerCase().trim();
  const existing = (await newAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users?.find(
    (u) => u.email?.toLowerCase() === normalized,
  );

  if (existing) {
    return { status: "exists", userId: existing.id };
  }

  if (DRY_RUN) return { status: "would_create" };

  const { data, error } = await newAdmin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) return { status: "failed", error: error.message };

  const userId = data.user.id;

  if (oldProfile) {
    const { user_id: _o, id: _id, ...rest } = oldProfile;
    await newAdmin.from("profiles").upsert(
      {
        ...rest,
        user_id: userId,
        id: userId,
        email: normalized,
        plan: rest.plan === "pro" || rest.plan === "starter" ? rest.plan : "free",
      },
      { onConflict: "user_id" },
    );
  }

  let actionLink = null;
  if (SEND_EMAIL) {
    const { data: linkData, error: linkErr } = await newAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
      options: { redirectTo: `${APP_URL}/auth?mode=reset` },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      actionLink = linkData.properties.action_link;
      await sendWelcomeEmail(normalized, actionLink);
    }
  }

  return { status: "created", userId, emailed: !!actionLink };
}

async function main() {
  const report = { sources: {}, results: { created: 0, exists: 0, failed: 0, emailed: 0 }, dryRun: DRY_RUN };

  const emailSources = new Map();

  if (OLD_KEY) {
    const oldAdmin = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
    const oldUsers = await listAllUsers(oldAdmin);
    report.sources.oldSupabase = oldUsers.length;
    for (const u of oldUsers) {
      if (!u.email) continue;
      emailSources.set(u.email.toLowerCase(), {
        metadata: u.user_metadata ?? {},
        profile: (await oldAdmin.from("profiles").select("*").eq("user_id", u.id).maybeSingle()).data,
      });
    }
  }

  if (RESEND_KEY) {
    const resendEmails = await fetchResendContacts(RESEND_KEY);
    report.sources.resend = resendEmails.length;
    for (const email of resendEmails) {
      if (!emailSources.has(email)) {
        emailSources.set(email, { metadata: {}, profile: null });
      }
    }
  }

  report.sources.totalUnique = emailSources.size;
  console.log(`Migrating ${emailSources.size} unique emails...`);

  for (const [email, { metadata, profile }] of emailSources) {
    if (email === "admin@agentbloodstockai.com") continue;
    const result = await ensureUser(email, metadata, profile);
    if (result.status === "created") {
      report.results.created += 1;
      if (result.emailed) report.results.emailed += 1;
      console.log(`Created: ${email}`);
    } else if (result.status === "exists" || result.status === "would_create") {
      report.results.exists += 1;
    } else {
      report.results.failed += 1;
      console.error(`Failed ${email}:`, result.error);
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
