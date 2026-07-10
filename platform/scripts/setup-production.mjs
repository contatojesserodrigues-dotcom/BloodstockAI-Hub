#!/usr/bin/env node
/**
 * Setup new Supabase production: admin user, authorized_users, migrate from old project.
 * Requires NEW_SERVICE_ROLE_KEY; optional OLD_SERVICE_ROLE_KEY for user import.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY;
const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://zqeegxhqtnabzkcmgcfv.supabase.co";
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = "admin@agentbloodstockai.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "BloodstockAI2026!";

if (!NEW_KEY) {
  console.error("Set NEW_SERVICE_ROLE_KEY");
  process.exit(1);
}

const newAdmin = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function tableStatus(table) {
  const { count, error } = await newAdmin.from(table).select("*", { count: "exact", head: true });
  return error ? { ok: false, error: error.message, code: error.code } : { ok: true, count: count ?? 0 };
}

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

async function ensureAuthorizedUser(email) {
  const attempts = [
    { email: email.toLowerCase(), role: "super_admin", full_access: true },
    { email: email.toLowerCase(), role: "super_admin" },
    { email: email.toLowerCase() },
  ];
  for (const row of attempts) {
    const { error } = await newAdmin.from("authorized_users").upsert(row, { onConflict: "email" });
    if (!error) return;
    if (!error.message.includes("Could not find")) throw new Error(`authorized_users: ${error.message}`);
  }
  throw new Error("authorized_users: schema mismatch — run supabase db push");
}

async function ensureAdminUser() {
  const email = ADMIN_EMAIL.toLowerCase();
  let user;
  const { data: listed, error: listError } = await newAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  user = listed.users.find((u) => u.email?.toLowerCase() === email);

  if (user) {
    const { data, error } = await newAdmin.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "BloodstockAI Admin", first_name: "Admin", last_name: "BloodstockAI" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await newAdmin.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "BloodstockAI Admin", first_name: "Admin", last_name: "BloodstockAI" },
    });
    if (error) throw error;
    user = data.user;
  }

  const profileAttempts = [
    {
      user_id: user.id,
      id: user.id,
      email,
      full_name: "BloodstockAI Admin",
      first_name: "Admin",
      last_name: "BloodstockAI",
      company_name: "BloodstockAI",
      plan: "pro",
      analyses_limit: 999999,
      analyses_used: 0,
      analyses_remaining: 999999,
      account_type: "company",
    },
    {
      user_id: user.id,
      id: user.id,
      email,
      full_name: "BloodstockAI Admin",
      plan: "pro",
      analyses_limit: 999999,
      analyses_used: 0,
      analyses_remaining: 999999,
    },
    {
      user_id: user.id,
      id: user.id,
      email,
      full_name: "BloodstockAI Admin",
      plan: "pro",
      credits_remaining: 999999,
    },
    { user_id: user.id, id: user.id, email, full_name: "BloodstockAI Admin" },
  ];

  const { data: existing } = await newAdmin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  let profileOk = false;
  let lastProfileError = "";
  for (const profile of profileAttempts) {
    const profileRes = existing
      ? await newAdmin.from("profiles").update(profile).eq("user_id", user.id)
      : await newAdmin.from("profiles").insert(profile);
    if (!profileRes.error) {
      profileOk = true;
      break;
    }
    lastProfileError = profileRes.error.message;
    if (!lastProfileError.includes("Could not find")) break;
  }
  if (!profileOk) throw new Error(`profiles: ${lastProfileError}`);

  const roleRes = await newAdmin.from("user_roles").delete().eq("user_id", user.id);
  if (roleRes.error && !roleRes.error.message.includes("Could not find")) {
    throw new Error(`user_roles delete: ${roleRes.error.message}`);
  }
  const addRole = await newAdmin.from("user_roles").insert({ user_id: user.id, role: "super_admin" });
  if (addRole.error && !addRole.error.message.includes("Could not find")) {
    throw new Error(`user_roles: ${addRole.error.message}`);
  }

  return user.id;
}

async function migrateUsers() {
  if (!OLD_KEY) return { skipped: true, reason: "OLD_SERVICE_ROLE_KEY not set" };
  const oldAdmin = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
  const users = await listAllUsers(oldAdmin);
  let created = 0, skipped = 0, failed = 0;
  const newUsers = await listAllUsers(newAdmin);
  const existingEmails = new Set(newUsers.map((u) => u.email?.toLowerCase()).filter(Boolean));

  for (const user of users) {
    const email = user.email?.toLowerCase();
    if (!email || email === ADMIN_EMAIL.toLowerCase()) {
      skipped += 1;
      continue;
    }
    if (existingEmails.has(email)) {
      skipped += 1;
      continue;
    }
    const { data: createdUser, error: createErr } = await newAdmin.auth.admin.createUser({
      email,
      email_confirm: !!user.email_confirmed_at,
      user_metadata: user.user_metadata ?? {},
      app_metadata: user.app_metadata ?? {},
    });
    if (createErr) {
      failed += 1;
      continue;
    }
    created += 1;
    existingEmails.add(email);
    const newUserId = createdUser.user.id;
    const { data: profile } = await oldAdmin.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (profile) {
      const { user_id: _o, id: _id, ...rest } = profile;
      await newAdmin.from("profiles").upsert({ ...rest, user_id: newUserId, email, id: newUserId });
    }
    const { data: roles } = await oldAdmin.from("user_roles").select("role").eq("user_id", user.id);
    if (roles?.length) {
      for (const r of roles) {
        await newAdmin.from("user_roles").upsert({ user_id: newUserId, role: r.role });
      }
    }
  }
  return { created, skipped, failed, oldTotal: users.length };
}

async function testLogin() {
  const anon = platformEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  const client = createClient(NEW_URL, anon);
  const { data, error } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  return { ok: !!data.session, error: error?.message ?? null };
}

async function testEdge(name) {
  const res = await fetch(`${NEW_URL}/functions/v1/${name}`, { method: "OPTIONS" });
  return res.status;
}

async function main() {
  const report = {
    url: NEW_URL,
    tables: {},
    admin: {},
    migration: {},
    login: {},
    edge: {},
  };

  for (const t of ["profiles", "authorized_users", "user_roles", "activity_logs"]) {
    report.tables[t] = await tableStatus(t);
  }

  const missing = Object.entries(report.tables).filter(([, v]) => !v.ok);
  if (missing.length) {
    console.log(JSON.stringify({ ...report, warning: "Some tables missing — continuing admin setup", missing }, null, 2));
  }

  await ensureAuthorizedUser(ADMIN_EMAIL);
  report.admin.userId = await ensureAdminUser();
  report.migration = await migrateUsers();
  report.login = await testLogin();
  report.edge = {
    ai_analysis: await testEdge("ai-analysis"),
    ai_chat: await testEdge("ai-chat"),
    upload_pdf: await testEdge("upload-pdf"),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
