/** Emails that always receive super_admin access (fallback when DB role sync is pending). */
export const SUPER_ADMIN_EMAILS = new Set([
  "admin@agentbloodstockai.com",
  "contatojesserodrigues@gmail.com",
]);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
