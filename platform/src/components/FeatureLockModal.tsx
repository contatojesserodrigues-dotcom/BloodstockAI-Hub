import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
} from "@/components/ui/premium-modal";

interface FeatureLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  planName: string;
}

export const FeatureLockModal = ({ open, onOpenChange, featureName }: FeatureLockModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="sm">
      <PremiumModalHeader
        eyebrow="Upgrade"
        title={`Unlock ${featureName}`}
        description="This feature is available with a paid plan. Explore our options to get full access."
      />
      <PremiumModalBody className="space-y-3">
        <PremiumModalPrimaryButton onClick={() => { onOpenChange(false); navigate("/pricing"); }}>
          See Monthly Plans
        </PremiumModalPrimaryButton>
        <PremiumModalDismiss onClick={() => onOpenChange(false)} />
      </PremiumModalBody>
    </PremiumDialog>
  );
};
