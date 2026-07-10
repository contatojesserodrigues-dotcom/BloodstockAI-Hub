import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";

export interface UsageData {
  plan: string;
  analyses_used: number;
  analyses_allowed: number;
  expiry_date: string | null;
  period_start: string | null;
  period_end: string | null;
}

export const useUsageTracking = () => {
  const { user } = useAuth();

  const { data: usage, refetch } = useQuery({
    queryKey: ["usage_tracking", user?.id],
    queryFn: async (): Promise<UsageData | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data as UsageData;
    },
    enabled: !!user?.id,
  });

  const getUsageLabel = () => {
    if (!usage) return null;
    
    const plan = usage.plan;
    const used = usage.analyses_used;
    const allowed = usage.analyses_allowed;
    
    if (plan === "free") {
      return `Trial — ${used}/3 analyses used`;
    }
    if (plan === "single_analysis") {
      const expiry = usage.expiry_date ? new Date(usage.expiry_date).toLocaleDateString() : "N/A";
      return `Single Analysis — ${used}/1 · Expires ${expiry}`;
    }
    if (plan === "starter") {
      return `Analyses used: ${used}/100 this month`;
    }
    if (plan === "professional") {
      return `Analyses used: ${used}/300 this month`;
    }
    if (plan === "enterprise") {
      return `Analyses used: Unlimited`;
    }
    return null;
  };

  const isAtLimit = () => {
    if (!usage) return false;
    if (usage.plan === "enterprise") return false;
    return usage.analyses_used >= usage.analyses_allowed;
  };

  const isNearLimit = () => {
    if (!usage) return false;
    if (usage.plan === "starter") return usage.analyses_used >= 20;
    if (usage.plan === "professional") return usage.analyses_used >= 160;
    return false;
  };

  const getNearLimitMessage = () => {
    if (!usage) return null;
    const remaining = usage.analyses_allowed - usage.analyses_used;
    if (usage.plan === "starter" && remaining <= 5) {
      return `⚠️ ${remaining} analyses remaining this month. Upgrade to Professional for 300/month.`;
    }
    if (usage.plan === "professional" && remaining <= 40) {
      return `⚠️ You're running low — ${remaining} analyses remaining. Contact us for Enterprise unlimited access.`;
    }
    return null;
  };

  const isSingleAnalysis = usage?.plan === "single_analysis";
  const isFreePlan = !usage || usage.plan === "free";

  return {
    usage,
    refetch,
    getUsageLabel,
    isAtLimit,
    isNearLimit,
    getNearLimitMessage,
    isSingleAnalysis,
    isFreePlan,
  };
};
