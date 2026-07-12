/** Official BloodstockAI domain — never expose Vercel/Supabase URLs in user-facing email links. */
export const OFFICIAL_SITE_URL = "https://www.agentbloodstockai.com";

const BLOCKED_HOSTS = ["vercel.app", "localhost"];

export function isBlockedRedirectHost(hostname: string): boolean {
  return BLOCKED_HOSTS.some((h) => hostname.includes(h));
}

/** Convert a Supabase action/verify link into a www.agentbloodstockai.com auth URL. */
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

/** Force redirect_to on legacy Supabase verify links to the official domain. */
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
