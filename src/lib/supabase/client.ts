import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabasePackageAvailable, resolveSupabaseCreateClient } from "@/lib/supabase/loader";

export function getSupabaseBrowserConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const hasEnv = Boolean(url && anonKey && !url.includes("your-project"));
  return {
    configured: Boolean(hasEnv && isSupabasePackageAvailable()),
    url,
    anonKey,
    warning: "Supabase browser client not configured. Realtime and live reads disabled.",
  };
}

let browserClient: SupabaseClient | null = null;

/** Browser-only client — uses anon key. Never use service role here. */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const cfg = getSupabaseBrowserConfig();
  if (!cfg.configured) return null;

  const createClient = resolveSupabaseCreateClient();
  if (!createClient) return null;

  try {
    if (!browserClient) {
      browserClient = createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
    }
    return browserClient;
  } catch {
    return null;
  }
}
