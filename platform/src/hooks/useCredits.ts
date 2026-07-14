import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/integrations/supabase/hooks/useAuth';

export function useCredits() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const isFreePlan = plan === 'free';
  const isPaidPlan = ['starter', 'pro', 'enterprise'].includes(plan);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setPlan((data as any).plan ?? 'free');
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    plan,
    isFreePlan,
    isPaidPlan,
    loading,
    refetch: fetchCredits,
    // Legacy compat — always 0 for free, always high for paid
    analysesRemaining: isPaidPlan ? 99999 : 0,
    analysesUsed: 0,
    analysesLimit: isPaidPlan ? 99999 : 0,
    isTrialPlan: isFreePlan,
    hasCredits: isPaidPlan,
    creditsRemaining: isPaidPlan ? 99999 : 0,
    // No-op stubs for legacy callers
    checkHasCredits: useCallback(async () => isPaidPlan, [isPaidPlan]),
    consumeCredit: useCallback(async () => isPaidPlan ? 99999 : 0, [isPaidPlan]),
    canRunAnalysis: useCallback(async () => isPaidPlan ? 99999 : 0, [isPaidPlan]),
  };
}
