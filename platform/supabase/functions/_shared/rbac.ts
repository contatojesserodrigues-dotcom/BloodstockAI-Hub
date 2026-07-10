// Shared RBAC utility for edge functions
// Roles: free_user, premium_user, super_admin

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AppRole = "free_user" | "premium_user" | "super_admin";

export interface RoleCheckResult {
  authorized: boolean;
  userId: string;
  role: AppRole;
  error?: string;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  free_user: 1,
  premium_user: 2,
  super_admin: 3,
};

/**
 * Authenticate user and retrieve their role from the database.
 * Returns userId, role, and authorization status.
 */
export async function authenticateAndGetRole(req: Request): Promise<RoleCheckResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, userId: "", role: "free_user", error: "Missing authorization" };
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { authorized: false, userId: "", role: "free_user", error: "Unauthorized" };
  }

  // Get role from database via security definer function
  const { data: roleData, error: roleError } = await supabaseAdmin
    .rpc("get_user_role", { _user_id: user.id });

  if (roleError || !roleData) {
    // Default to free_user if no role found
    return { authorized: true, userId: user.id, role: "free_user" };
  }

  return { authorized: true, userId: user.id, role: roleData as AppRole };
}

/**
 * Check if user has the minimum required role level.
 */
export function hasMinRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Create an unauthorized response with CORS headers.
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message = "Unauthorized") {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create a forbidden response for insufficient role.
 */
export function forbiddenResponse(corsHeaders: Record<string, string>, message = "Upgrade required to access this feature") {
  return new Response(
    JSON.stringify({ error: message, upgrade_required: true }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
