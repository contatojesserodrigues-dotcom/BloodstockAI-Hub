import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const loadEnv = (path) =>
  Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );

const platformEnv = loadEnv(".env");
const rootEnv = loadEnv("../.env");
const url = platformEnv.VITE_SUPABASE_URL;
const serviceRoleKey = rootEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Supabase admin environment unavailable");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = "demo.dashboard@agentbloodstockai.com";
const password = `Bsa!${crypto.randomBytes(12).toString("base64url")}7a`;

const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;

let user = usersData.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: "BloodstockAI Dashboard Demo" },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "BloodstockAI Dashboard Demo" },
  });
  if (error) throw error;
  user = data.user;
}

const profile = {
  email,
  full_name: "BloodstockAI Dashboard Demo",
  first_name: "Dashboard",
  last_name: "Demo",
  company_name: "BloodstockAI",
  plan: "pro",
  analyses_limit: 1000,
  analyses_remaining: 1000,
};
const { data: existingProfile, error: profileReadError } = await supabase
  .from("profiles")
  .select("id")
  .eq("user_id", user.id)
  .maybeSingle();
if (profileReadError) throw profileReadError;

const profileResult = existingProfile
  ? await supabase.from("profiles").update(profile).eq("user_id", user.id)
  : await supabase
      .from("profiles")
      .insert({ ...profile, id: crypto.randomUUID(), user_id: user.id });
if (profileResult.error) throw profileResult.error;

const removeRoles = await supabase.from("user_roles").delete().eq("user_id", user.id);
if (removeRoles.error) throw removeRoles.error;
const addRole = await supabase
  .from("user_roles")
  .insert({ user_id: user.id, role: "premium_user" });
if (addRole.error) throw addRole.error;

console.log(
  JSON.stringify({
    email,
    password,
    plan: "pro",
    role: "premium_user",
    confirmed: true,
  }),
);
