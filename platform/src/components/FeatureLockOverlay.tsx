import { ReactNode } from "react";

interface FeatureLockOverlayProps {
  featureName: string;
  requiredPlan: string;
  price: string;
  children: ReactNode;
  locked: boolean;
}

// FeatureLockOverlay now always renders children without any overlay
// Paywall is handled at action level via PaywallModal
export const FeatureLockOverlay = ({ children }: FeatureLockOverlayProps) => {
  return <>{children}</>;
};
