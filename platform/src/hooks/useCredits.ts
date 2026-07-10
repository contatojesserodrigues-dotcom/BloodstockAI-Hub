import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isSuperAdminEmail } from "@/config/admin";

export function useCredits() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const adminAccess = isSuperAdmin || isSuperAdminEmail(user?.email);
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  const isPaidPlan = adminAccess || ["starter", "pro", "enterprise"].includes(plan);
  const effectivePlan = adminAccess ? "pro" : plan;
  const isFreePlan = !isPaidPlan;

  const fetchCredits = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (adminAccess) {
      setPlan("pro");
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPlan((data as { plan?: string }).plan ?? "free");
    }

    setLoading(false);
  }, [user?.id, adminAccess]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const unlimited = isPaidPlan ? 99999 : 0;

  return {
    plan: effectivePlan,
    isFreePlan,
    isPaidPlan,
    loading,
    refetch: fetchCredits,
    analysesRemaining: unlimited,
    analysesUsed: 0,
    analysesLimit: unlimited,
    isTrialPlan: isFreePlan,
    hasCredits: isPaidPlan,
    creditsRemaining: unlimited,
    checkHasCredits: useCallback(async () => isPaidPlan, [isPaidPlan]),
    consumeCredit: useCallback(async () => unlimited, [unlimited]),
    canRunAnalysis: useCallback(async () => unlimited, [unlimited]),
  };
};
