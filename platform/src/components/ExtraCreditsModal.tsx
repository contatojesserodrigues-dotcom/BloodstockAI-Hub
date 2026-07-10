import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface ExtraCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExtraCreditsModal = ({ open, onOpenChange }: ExtraCreditsModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Credits"
        title="Unlock More Analyses"
        description="Upgrade to a monthly plan for unlimited analyses and full platform access."
      />
      <PremiumModalBody className="space-y-3">
        <PremiumModalPrimaryButton onClick={() => { onOpenChange(false); navigate("/pricing"); }}>
          View Plans →
        </PremiumModalPrimaryButton>
        <PremiumModalDismiss onClick={() => onOpenChange(false)}>Cancel</PremiumModalDismiss>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
