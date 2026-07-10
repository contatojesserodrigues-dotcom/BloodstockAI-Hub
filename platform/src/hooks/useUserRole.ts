import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";

export type AppRole = "free_user" | "premium_user" | "super_admin";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return "free_user" as AppRole;
      
      const { data, error } = await supabase
        .rpc("get_user_role", { _user_id: user.id });
      
      if (error || !data) return "free_user" as AppRole;
      return data as AppRole;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return {
    role: (role ?? "free_user") as AppRole,
    isLoading,
    isFreeUser: role === "free_user",
    isPremium: role === "premium_user" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
  };
};
