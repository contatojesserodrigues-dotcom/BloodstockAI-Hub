#!/usr/bin/env node
/**
 * Migrate auth users + profiles from old Supabase project to new one.
 *
 * Usage:
 *   OLD_SUPABASE_URL=... OLD_SERVICE_ROLE_KEY=... \
 *   NEW_SUPABASE_URL=https://uzkicvizgezitiyhihcq.supabase.co \
 *   NEW_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-supabase-users.mjs
 *
 * Notes:
 * - Password hashes cannot be exported via Admin API; migrated users must reset passwords
 *   unless you use a full auth schema dump with Supabase support tools.
 * - Profiles and user_roles are copied when present.
 */

import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL ?? "https://uzkicvizgezitiyhihcq.supabase.co";
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_KEY) {
  console.error("Missing env: OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, NEW_SERVICE_ROLE_KEY");
  process.exit(1);
}

const oldAdmin = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newAdmin = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function listAllUsers(client) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < 200) break;
    page += 1;
  }
  return users;
}

async function main() {
  console.log("Fetching users from old project...");
  const users = await listAllUsers(oldAdmin);
  console.log(`Found ${users.length} users`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const email = user.email?.toLowerCase();
    if (!email) {
      skipped += 1;
      continue;
    }

    const { data: existing } = await newAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const already = existing?.users?.find((u) => u.email?.toLowerCase() === email);
    if (already) {
      console.log(`Skip (exists): ${email}`);
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
      console.error(`Failed ${email}:`, createErr.message);
      failed += 1;
      continue;
    }

    created += 1;
    const newUserId = createdUser.user.id;

    const { data: profile } = await oldAdmin.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (profile) {
      const { user_id: _oldId, ...rest } = profile;
      await newAdmin.from("profiles").upsert({ ...rest, user_id: newUserId, email }, { onConflict: "user_id" });
    }

    const { data: roles } = await oldAdmin.from("user_roles").select("*").eq("user_id", user.id);
    if (roles?.length) {
      await newAdmin.from("user_roles").upsert(
        roles.map((r) => ({ ...r, user_id: newUserId, id: undefined })),
        { onConflict: "user_id,role" },
      );
    }

    console.log(`Migrated: ${email}`);
  }

  console.log(`Done. created=${created} skipped=${skipped} failed=${failed}`);
  console.log("Ask migrated users to use 'Forgot password' to set a new password.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
