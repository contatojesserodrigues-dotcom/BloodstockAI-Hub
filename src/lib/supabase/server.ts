import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabasePackageAvailable, resolveSupabaseCreateClient } from "@/lib/supabase/loader";

export interface SupabaseConfig {
  configured: boolean;
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
  warning?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "") || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  if (!url || !serviceRoleKey || url.includes("your-project")) {
    return {
      configured: false,
      url,
      anonKey,
      serviceRoleKey,
      warning:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Running in mock mode.",
    };
  }

  return { configured: true, url, anonKey, serviceRoleKey };
}

export function getSetupWarnings(): string[] {
  const warnings: string[] = [];
  if (!isSupabasePackageAvailable()) {
    warnings.push("@supabase/supabase-js not installed — running in mock mode. Run npm install.");
  }
  const sb = getSupabaseConfig();
  if (!sb.configured) warnings.push(sb.warning!);
  if (!process.env.TAVILY_API_KEY?.trim()) warnings.push("TAVILY_API_KEY missing — web research will use mock data.");
  if (!process.env.HUBSPOT_ACCESS_TOKEN?.trim()) warnings.push("HUBSPOT_ACCESS_TOKEN missing — CRM sync skipped.");
  if (!process.env.N8N_AGENT_WEBHOOK_URL?.trim()) warnings.push("N8N_AGENT_WEBHOOK_URL missing — n8n execution disabled.");
  if (!process.env.ANTHROPIC_API_KEY?.trim()) warnings.push("ANTHROPIC_API_KEY missing — Claude copy uses templates.");
  return warnings;
}

/** Legacy REST helpers — prefer createSupabaseAdmin() in new code. */
export async function insertSupabaseRows(table: string, rows: Record<string, unknown>[]) {
  const admin = createSupabaseAdmin();
  if (!admin || rows.length === 0) return { ok: false, skipped: true };
  const { error } = await admin.from(table).insert(rows);
  return { ok: !error, error: error?.message };
}

export async function upsertSupabaseRow(table: string, row: Record<string, unknown>) {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, skipped: true };
  const { error } = await admin.from(table).upsert(row);
  return { ok: !error, error: error?.message };
}

/** Server-side anon client for routes that must not use service role. */
export function createSupabaseServerClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !isSupabasePackageAvailable()) return null;
  const createClient = resolveSupabaseCreateClient();
  if (!createClient) return null;
  try {
    return createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}
