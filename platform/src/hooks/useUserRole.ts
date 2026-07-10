import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { isSuperAdminEmail } from "@/config/admin";

export type AppRole = "free_user" | "premium_user" | "super_admin";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id) return "free_user" as AppRole;

      if (isSuperAdminEmail(user.email)) {
        return "super_admin" as AppRole;
      }

      const { data, error } = await supabase.rpc("get_user_role", { _user_id: user.id });

      if (data === "super_admin") {
        return "super_admin" as AppRole;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (roleRow?.role === "super_admin") {
        return "super_admin" as AppRole;
      }

      if (error || !data) return "free_user" as AppRole;
      return data as AppRole;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const resolvedRole = (role ?? "free_user") as AppRole;
  const isSuperAdmin =
    resolvedRole === "super_admin" || isSuperAdminEmail(user?.email);

  return {
    role: isSuperAdmin ? ("super_admin" as AppRole) : resolvedRole,
    isLoading,
    isFreeUser: !isSuperAdmin && resolvedRole === "free_user",
    isPremium: isSuperAdmin || resolvedRole === "premium_user",
    isSuperAdmin,
  };
};
