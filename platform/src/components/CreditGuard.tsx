import { ReactNode } from "react";

interface CreditGuardProps {
  children: ReactNode;
  featureName?: string;
  requirePremium?: boolean;
}

// CreditGuard now always renders children — paywall is handled at action level
export const CreditGuard = ({ children }: CreditGuardProps) => {
  return <>{children}</>;
};
