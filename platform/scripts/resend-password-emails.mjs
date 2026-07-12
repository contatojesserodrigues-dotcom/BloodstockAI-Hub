#!/usr/bin/env node
/**
 * Resend personalized BloodstockAI password-setup emails to all auth users.
 *
 * Usage:
 *   NEW_SERVICE_ROLE_KEY=... node scripts/resend-password-emails.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const OFFICIAL_SITE_URL = "https://www.agentbloodstockai.com";

function toOfficialAuthLink(supabaseActionLink) {
  try {
    const url = new URL(supabaseActionLink);
    const token = url.searchParams.get("token") ?? url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") ?? "recovery";
    if (!token) return supabaseActionLink;
    const official = new URL(`${OFFICIAL_SITE_URL}/auth`);
    official.searchParams.set("token", token);
    official.searchParams.set("type", type);
    if (type === "recovery") official.searchParams.set("mode", "reset");
    return official.toString();
  } catch {
    return supabaseActionLink;
  }
}

function brandPasswordResetLink(actionLink) {
  try {
    const url = new URL(actionLink);
    if (url.pathname.includes("/auth/v1/verify")) {
      return toOfficialAuthLink(actionLink);
    }
    url.searchParams.set("redirect_to", `${OFFICIAL_SITE_URL}/auth?mode=reset`);
    return url.toString();
  } catch {
    return actionLink;
  }
}

const loadEnv = (path) => {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
  );
};

const platformEnv = loadEnv(".env");
const NEW_URL = process.env.NEW_SUPABASE_URL ?? platformEnv.VITE_SUPABASE_URL ?? "https://uzkicvizgezitiyhihcq.supabase.co";
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = (process.env.APP_URL ?? "https://www.agentbloodstockai.com").replace(/\/$/, "");
const OFFICIAL_AUTH_REDIRECT = `${APP_URL}/auth?mode=reset`;

if (!NEW_KEY) {
  console.error("Set NEW_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function listAllUsers() {
  const users = [];
  let page = 1;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < 200) break;
    page += 1;
  }
  return users;
}

async function sendWelcomeEmail(email, actionLink, name) {
  const { data, error } = await admin.functions.invoke("send-email", {
    body: {
      type: "platform_access_welcome",
      email,
      action_link: actionLink,
      name: name || null,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: data?.success !== false, error: data?.error };
}

async function main() {
  const users = await listAllUsers();
  const report = { total: users.length, sent: 0, skipped: 0, failed: 0, errors: [] };

  for (const user of users) {
    const email = user.email?.toLowerCase();
    if (!email || email === "admin@agentbloodstockai.com") {
      report.skipped += 1;
      continue;
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: OFFICIAL_AUTH_REDIRECT },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      report.failed += 1;
      report.errors.push({ email, error: linkErr?.message ?? "no link" });
      continue;
    }

    const name = user.user_metadata?.first_name || user.user_metadata?.full_name || null;
    const result = await sendWelcomeEmail(email, brandPasswordResetLink(linkData.properties.action_link), name);

    if (result.ok) {
      report.sent += 1;
      console.log(`Sent: ${email}`);
    } else {
      report.failed += 1;
      report.errors.push({ email, error: result.error });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
