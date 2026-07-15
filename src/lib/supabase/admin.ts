import { getSupabaseConfig } from "@/lib/supabase/server";
import { createSupabaseRestAdmin, type SupabaseRestClient } from "@/lib/supabase/rest-client";

/** Server-only admin client — service role via REST. Never import in client components. */
export function createSupabaseAdmin(): SupabaseRestClient | null {
  return createSupabaseRestAdmin();
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().configured;
}
