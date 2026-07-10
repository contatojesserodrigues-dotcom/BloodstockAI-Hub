import { useNavigate } from "react-router-dom";
import { Search, Dna, Activity, Heart, Upload, Download } from "lucide-react";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalFeatureGrid,
  PremiumModalFooterNote,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSectionLabel,
} from "@/components/ui/premium-modal";

interface SingleAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { icon: Search, title: "Horse Search & Performance", desc: "Full career overview, race record, ratings and performance analysis" },
  { icon: Dna, title: "Mating Analysis", desc: "Nick rating, inbreeding coefficient, compatibility score and breeding recommendations" },
  { icon: Activity, title: "Performance Analysis", desc: "Detailed performance breakdown by distance, going, class and career progression charts" },
  { icon: Heart, title: "Broodmare Plans", desc: "AI breeding strategies and stallion recommendations for your mares" },
  { icon: Upload, title: "PDF Upload", desc: "Upload single PDFs for AI-powered analysis and recommendations" },
  { icon: Download, title: "PDF Reports", desc: "Download professional PDF reports for all your analyses" },
];

export const SingleAnalysisModal = ({ open, onOpenChange }: SingleAnalysisModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Upgrade"
        title="Unlock Full Platform Access"
        description="Subscribe to a plan for analyses, reports and full platform capabilities."
      />
      <PremiumModalBody>
        <PremiumModalSectionLabel>What's included</PremiumModalSectionLabel>
        <PremiumModalFeatureGrid items={features} />
        <PremiumModalPrimaryButton
          size="lg"
          onClick={() => {
            onOpenChange(false);
            navigate("/pricing");
          }}
        >
          View Plans →
        </PremiumModalPrimaryButton>
        <PremiumModalFooterNote>Secure payment via Revolut</PremiumModalFooterNote>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
