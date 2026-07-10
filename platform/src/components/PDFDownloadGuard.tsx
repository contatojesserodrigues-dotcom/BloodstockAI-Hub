import { FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface PDFDownloadGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PDFDownloadGuard = ({ open, onOpenChange }: PDFDownloadGuardProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="sm">
      <PremiumModalHeader
        eyebrow="PDF reports"
        title="Upgrade to Download"
        description="PDF reports are available on paid plans. Upgrade now to download professional bloodstock reports."
      />
      <PremiumModalBody className="space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
          <FileDown className="w-6 h-6 text-secondary" />
        </div>
        <PremiumModalPrimaryButton onClick={() => { onOpenChange(false); navigate("/pricing"); }}>
          Upgrade Now →
        </PremiumModalPrimaryButton>
        <PremiumModalDismiss onClick={() => onOpenChange(false)} />
      </PremiumModalBody>
    </PremiumDialog>
  );
};
