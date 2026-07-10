import { useNavigate } from "react-router-dom";
import { ArrowUpCircle } from "lucide-react";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalHeader,
  PremiumModalHighlight,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="lg">
      <PremiumModalHeader
        eyebrow="Full access"
        title="Unlock Full Access"
        description="You've used all your analysis credits. Upgrade to continue using the platform with full access."
      />
      <PremiumModalBody>
        <PremiumModalHighlight>
          <div className="flex items-start gap-2">
            <ArrowUpCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Upgrade to a Monthly Plan</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                Get monthly analyses, priority support, and full platform access with Starter or Professional plans.
              </p>
            </div>
          </div>
          <PremiumModalPrimaryButton
            onClick={() => {
              navigate("/pricing");
              onOpenChange(false);
            }}
          >
            View Plans →
          </PremiumModalPrimaryButton>
        </PremiumModalHighlight>
        <PremiumModalDismiss onClick={() => onOpenChange(false)} />
      </PremiumModalBody>
    </PremiumDialog>
  );
};
