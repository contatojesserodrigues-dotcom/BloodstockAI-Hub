import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalFooterNote,
  PremiumModalHeader,
  PremiumModalHighlight,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface PostAnalysisUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostAnalysisUpsellModal = ({ open, onOpenChange }: PostAnalysisUpsellModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="lg">
      <PremiumModalHeader
        eyebrow="Complete"
        title="Analysis Complete"
        description="Continue exploring the platform or upgrade for unlimited analyses."
      />
      <PremiumModalBody>
        <PremiumModalHighlight>
          <h3 className="font-semibold text-foreground">Upgrade to a Monthly Plan</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Full platform access with monthly analyses, priority support, and more.
          </p>
          <PremiumModalPrimaryButton
            className="mt-3"
            onClick={() => {
              onOpenChange(false);
              navigate("/pricing");
            }}
          >
            View Plans →
          </PremiumModalPrimaryButton>
        </PremiumModalHighlight>
        <PremiumModalFooterNote>Questions? Contact us at office@agentbloodstockai.com</PremiumModalFooterNote>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
