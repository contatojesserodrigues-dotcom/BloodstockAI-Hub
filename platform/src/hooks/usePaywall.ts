import { useState, useCallback } from "react";
import { useCredits } from "@/hooks/useCredits";
import { useUserRole } from "@/hooks/useUserRole";
import type { PaywallType } from "@/components/PaywallModal";

/**
 * Hook to gate ALL actions behind a paywall for non-paid users.
 * Every feature is blocked for free users — no free credits exist.
 *
 * Retry-on-error: when an analysis fails due to an internal error,
 * call `grantRetry(type)` so the user can retry that same feature
 * once without being blocked by the paywall again.
 */
export function usePaywall() {
  const { isPaidPlan } = useCredits();
  const { isSuperAdmin } = useUserRole();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallType, setPaywallType] = useState<PaywallType>("analysis");
  const [retryGrants, setRetryGrants] = useState<Set<PaywallType>>(new Set());

  const shouldBlock = !isPaidPlan && !isSuperAdmin;

  /** Show the paywall modal if the user is not paid. Returns true if blocked. */
  const gate = useCallback((type: PaywallType): boolean => {
    if (!shouldBlock) return false;

    // If a retry was granted for this type (after internal error), consume it
    if (retryGrants.has(type)) {
      setRetryGrants((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
      return false; // allow through
    }

    setPaywallType(type);
    setPaywallOpen(true);
    return true;
  }, [shouldBlock, retryGrants]);

  /** Grant one free retry for a feature type (call after internal error). */
  const grantRetry = useCallback((type: PaywallType) => {
    setRetryGrants((prev) => new Set(prev).add(type));
  }, []);

  return {
    shouldBlock,
    paywallType,
    paywallOpen,
    setPaywallOpen,
    setPaywallType,
    gate,
    grantRetry,
  };
}
