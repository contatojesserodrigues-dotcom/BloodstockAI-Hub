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
/** Known platform users from legacy migrations / production records. */
const KNOWN_PLATFORM_EMAILS = [
  "contatojesserodrigues@gmail.com",
  "contarojesserodrigues@gmail.com",
  "dani.hurley19@gmail.com",
  "paulharley@ymail.com",
  "matt@stroudcoleman.com",
  "emilio@ofagro.com.br",
  "Jamie@JPbloodstock.co.uk",
  "mouse81@hotmail.com",
  "tdooley@goffs.com",
  "louisvambeck@gmail.com",
  "agentbloodstockai@gmail.com",
  "brunodepauloalmeida@gmail.com",
  "seanfreneybloodstock@gmail.com",
  "mktdigitalagile@gmail.com",
  "vcsoares42@gmail.com",
  "fibrekleen@icloud.com",
  "preview.dashboard.2026@agentbloodstockai.com",
];

const PLAN_OVERRIDES = {
  "dani.hurley19@gmail.com": { plan: "pro", analyses_limit: 1000, analyses_remaining: 1000 },
};

const SUPER_ADMIN_EMAILS = new Set([
  "contatojesserodrigues@gmail.com",
  "contarojesserodrigues@gmail.com",
]);
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

async function sendWelcomeViaEdge(serviceKey, email, actionLink, name) {
  const admin = createClient(NEW_URL, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.functions.invoke("send-email", {
    body: {
      type: "platform_access_welcome",
      email,
      action_link: actionLink,
      name: name || null,
    },
  });
  if (error) return false;
  return data?.success !== false;
}

async function applyEntitlements(userId, email) {
  const normalized = email.toLowerCase().trim();
  const planOverride = PLAN_OVERRIDES[normalized];

  if (SUPER_ADMIN_EMAILS.has(normalized)) {
    await newAdmin.from("authorized_users").upsert(
      { email: normalized, role: "super_admin", full_access: true, can_edit: true },
      { onConflict: "email" },
    );
    await newAdmin.from("profiles").update({
      plan: "pro",
      analyses_limit: 999999,
      analyses_remaining: 999999,
      analyses_used: 0,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    await newAdmin.from("user_roles").delete().eq("user_id", userId);
    await newAdmin.from("user_roles").upsert({ user_id: userId, role: "super_admin" });
    return;
  }

  if (planOverride) {
    await newAdmin.from("profiles").update({
      ...planOverride,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    await newAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "free_user");
    await newAdmin.from("user_roles").upsert({ user_id: userId, role: "premium_user" });
    await newAdmin.from("subscriptions").upsert({
      user_id: userId,
      plan_id: planOverride.plan === "pro" ? "professional" : "starter",
      billing_cycle: "legacy",
      status: "active",
      current_period_start: new Date().toISOString(),
      payment_provider: "legacy",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }
}

async function sendPasswordEmail(email, metadata = {}) {
  if (!SEND_EMAIL) return false;
  const normalized = email.toLowerCase().trim();
  const { data: linkData, error: linkErr } = await newAdmin.auth.admin.generateLink({
    type: "recovery",
    email: normalized,
    options: { redirectTo: `${APP_URL}/auth?mode=reset` },
  });
  if (linkErr || !linkData?.properties?.action_link) return false;
  return sendWelcomeViaEdge(NEW_KEY, normalized, linkData.properties.action_link, metadata?.first_name || metadata?.full_name);
}

async function ensureUser(email, metadata = {}, oldProfile = null) {
  const normalized = email.toLowerCase().trim();
  const existing = (await newAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users?.find(
    (u) => u.email?.toLowerCase() === normalized,
  );

  if (existing) {
    if (!DRY_RUN) {
      await applyEntitlements(existing.id, normalized);
      const emailed = await sendPasswordEmail(normalized, metadata);
      return { status: "exists", userId: existing.id, emailed };
    }
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

  await applyEntitlements(userId, normalized);
  const emailed = await sendPasswordEmail(normalized, metadata);

  return { status: "created", userId, emailed };
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

  for (const email of KNOWN_PLATFORM_EMAILS) {
    const key = email.toLowerCase();
    if (!emailSources.has(key)) {
      emailSources.set(key, { metadata: {}, profile: null });
    }
  }

  const { data: authorizedRows } = await newAdmin.from("authorized_users").select("email");
  for (const row of authorizedRows ?? []) {
    if (row.email) emailSources.set(row.email.toLowerCase(), { metadata: {}, profile: null });
  }

  report.sources.known = KNOWN_PLATFORM_EMAILS.length;
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
      if (result.emailed) {
        report.results.emailed += 1;
        console.log(`Access email sent: ${email}`);
      }
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
