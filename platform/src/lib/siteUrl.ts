/** Official production URL — never use window.location.origin for auth redirects. */
export const OFFICIAL_SITE_URL = "https://www.agentbloodstockai.com";

export function authRedirectPath(path = "/auth"): string {
  return `${OFFICIAL_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isPreviewHost(hostname = window.location.hostname): boolean {
  return hostname.includes("vercel.app") || hostname.includes("localhost");
}

export function redirectPreviewToOfficial(): void {
  if (typeof window === "undefined" || !isPreviewHost()) return;
  const target = `${OFFICIAL_SITE_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}

/** Convert Supabase verify/action links to official BloodstockAI auth URLs for emails. */
export function toOfficialAuthLink(supabaseActionLink: string): string {
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

/** Ensure Supabase auth links redirect to the official domain after verification. */
export function brandPasswordResetLink(actionLink: string): string {
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
