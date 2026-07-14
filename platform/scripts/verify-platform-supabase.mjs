#!/usr/bin/env node
/**
 * Verify Supabase ↔ Vercel ↔ platform feature connectivity.
 * Read-only — uses anon key from .env only.
 */
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

const env = { ...loadEnv(".env"), ...loadEnv(".env.vercel.production") };
const URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT = env.VITE_SUPABASE_PROJECT_ID ?? "uzkicvizgezitiyhihcq";

if (!URL || !ANON) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const FEATURES = [
  {
    feature: "Auth & profiles",
    tables: ["profiles", "authorized_users", "user_roles"],
    functions: [],
  },
  {
    feature: "AI analyses (BreezeUp, conformation, PDF)",
    tables: ["analysis_reports"],
    functions: ["ai-analysis", "upload-pdf"],
  },
  {
    feature: "Catalog upload & analysis",
    tables: ["catalogue_uploads_log"],
    functions: ["process-catalogue", "catalog-extract", "catalog-research", "catalog-analyze", "compare-uploads"],
  },
  {
    feature: "Sale Inspection / Equine Intelligence",
    tables: ["inspection_analyses", "inspection_blocks"],
    functions: [
      "inspection-analysis",
      "inspection-engine",
      "inspection-scoring",
      "inspection-pedigree-insight",
      "inspection-pedigree-research",
      "inspection-final-verdict",
      "inspection-upload-video",
      "video-pose-frames",
      "detect-horse-pose",
    ],
  },
  {
    feature: "Chat & market",
    tables: [],
    functions: ["ai-chat", "market-news", "market-insights"],
  },
  {
    feature: "Horse search & mating",
    tables: [],
    functions: ["horse-search", "mating-analysis", "broodmare-plan", "broodmare-planning", "pedigree-lookup"],
  },
  {
    feature: "Contact & newsletter",
    tables: [],
    functions: ["contact-inquiry"],
  },
  {
    feature: "Payments",
    tables: [],
    functions: ["create-payment", "revolut-webhook"],
  },
  {
    feature: "Marketplace",
    tables: ["marketplace_listings"],
    functions: [],
  },
];

async function probeTable(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: ANON },
  });
  return res.status;
}

async function probeFunction(name) {
  const res = await fetch(`${URL}/functions/v1/${name}`, { method: "OPTIONS" });
  return res.status;
}

async function main() {
  const tableCache = new Map();
  const fnCache = new Map();

  const allTables = [...new Set(FEATURES.flatMap((f) => f.tables))];
  const allFns = [...new Set(FEATURES.flatMap((f) => f.functions))];

  for (const t of allTables) tableCache.set(t, await probeTable(t));
  for (const fn of allFns) fnCache.set(fn, await probeFunction(fn));

  const rows = FEATURES.map((f) => {
    const tables = f.tables.map((t) => ({ name: t, status: tableCache.get(t) }));
    const functions = f.functions.map((fn) => ({ name: fn, status: fnCache.get(fn) }));
    const tablesOk = f.tables.length === 0 || f.tables.every((t) => tableCache.get(t) === 200);
    const fnsOk = f.functions.length === 0 || f.functions.every((fn) => fnCache.get(fn) !== 404);
    const ready = tablesOk && fnsOk;
    return { feature: f.feature, ready, tables, functions };
  });

  const vercelVars = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PROJECT_ID",
    "SUPABASE_URL",
    "POSTGRES_URL",
  ];

  const vercelEnvPath = ".env.vercel.production";
  const vercelPresent = fs.existsSync(vercelEnvPath);
  const vercelStatus = vercelVars.map((v) => ({
    name: v,
    present: vercelPresent ? v in loadEnv(vercelEnvPath) : null,
  }));

  const liveBundleOk = await fetch("https://www.agentbloodstockai.com/")
    .then((r) => r.text())
    .then((html) => {
      const js = html.match(/assets\/index-[^"]+\.js/)?.[0];
      if (!js) return false;
      return fetch(`https://www.agentbloodstockai.com/${js}`)
        .then((r) => r.text())
        .then((body) => body.includes(PROJECT));
    })
    .catch(() => false);

  const summary = {
    project: PROJECT,
    supabaseUrl: URL,
    frontendConnected: URL.includes(PROJECT),
    liveSiteUsesProject: liveBundleOk,
    featuresReady: rows.filter((r) => r.ready).length,
    featuresTotal: rows.length,
    blockers: rows.filter((r) => !r.ready).map((r) => r.feature),
  };

  console.log(JSON.stringify({ summary, vercelIntegration: vercelStatus, features: rows }, null, 2));

  if (summary.blockers.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
