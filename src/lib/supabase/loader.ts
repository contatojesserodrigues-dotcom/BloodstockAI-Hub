import type { SupabaseClient } from "@supabase/supabase-js";

type CreateClientFn = (
  url: string,
  key: string,
  options?: Record<string, unknown>
) => SupabaseClient;

let createClientFn: CreateClientFn | null | undefined;

/** Safely resolve @supabase/supabase-js — returns null if package is missing. */
export function resolveSupabaseCreateClient(): CreateClientFn | null {
  if (createClientFn !== undefined) return createClientFn;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@supabase/supabase-js") as { createClient: CreateClientFn };
    createClientFn = mod.createClient;
    return createClientFn;
  } catch {
    createClientFn = null;
    return null;
  }
}

/** True only when the real Supabase SDK is installed (not the local stub). */
export function isSupabasePackageAvailable(): boolean {
  const createClient = resolveSupabaseCreateClient();
  if (!createClient) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("@supabase/supabase-js/package.json") as { version?: string };
    return !String(pkg.version || "").includes("stub");
  } catch {
    return true;
  }
}
