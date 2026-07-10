import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalFooterNote,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface FreemiumUpgradeWallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURES = [
  "Unlimited AI-powered horse searches",
  "Full pedigree & nick analysis",
  "Broodmare planning & sire recommendations",
  "Sale catalog upload & purchase recommendations",
  "Real-time market intelligence",
  "Weekly auction reports from Keeneland, Tattersalls, Goffs & more",
];

export const FreemiumUpgradeWall = ({ open, onOpenChange }: FreemiumUpgradeWallProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Upgrade"
        title="Unlock Full Access"
        description="Subscribe to a plan to continue using the platform with full capabilities."
      />
      <PremiumModalBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-secondary">✦</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <PremiumModalPrimaryButton onClick={() => { onOpenChange(false); navigate("/pricing"); }}>
          View Plans →
        </PremiumModalPrimaryButton>
        <PremiumModalFooterNote>
          No contract · Cancel anytime · Used at Keeneland & Tattersalls
        </PremiumModalFooterNote>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
