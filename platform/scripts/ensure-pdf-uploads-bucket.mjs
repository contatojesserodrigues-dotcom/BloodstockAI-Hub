#!/usr/bin/env node
/**
 * Ensures the pdf-uploads storage bucket exists in Supabase.
 * Uses SUPABASE_SERVICE_ROLE_KEY from platform/.env.migrate.local or env.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(root, ".env.migrate.local"));
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.NEW_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://uzkicvizgezitiyhihcq.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEW_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  "Content-Type": "application/json",
};

const bucketPayload = {
  id: "pdf-uploads",
  name: "pdf-uploads",
  public: false,
  file_size_limit: 62914560,
  allowed_mime_types: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ],
};

async function main() {
  const listRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers });
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`list buckets failed (${listRes.status}): ${text}`);
  }
  const buckets = await listRes.json();
  const exists = buckets.some((b) => b.id === "pdf-uploads" || b.name === "pdf-uploads");
  if (exists) {
    console.log("pdf-uploads bucket already exists");
    return;
  }

  const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify(bucketPayload),
  });
  if (createRes.ok) {
    console.log("Created pdf-uploads bucket");
    return;
  }
  const errText = await createRes.text();
  if (createRes.status === 409 || /already exists/i.test(errText)) {
    console.log("pdf-uploads bucket already exists (race)");
    return;
  }
  throw new Error(`create bucket failed (${createRes.status}): ${errText}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
