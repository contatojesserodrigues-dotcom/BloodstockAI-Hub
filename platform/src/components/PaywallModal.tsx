import { useNavigate } from "react-router-dom";
import { Search, Dna, Activity, Heart, Upload, Download } from "lucide-react";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalFeatureGrid,
  PremiumModalFooterNote,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSectionLabel,
} from "@/components/ui/premium-modal";

export type PaywallType = "analysis" | "catalogue" | "breezeup" | "broodmare" | "mating" | "visual" | "search" | "performance" | "stallion" | "market" | "reports";

const PAYWALL_TITLES: Record<PaywallType, string> = {
  analysis: "Unlock This Analysis",
  catalogue: "Unlock Catalogue Analysis",
  breezeup: "Unlock Breeze-Up Analysis",
  broodmare: "Unlock Broodmare Plan",
  mating: "Unlock Mating Analysis",
  visual: "Unlock Visual Analysis",
  search: "Unlock Horse Search",
  performance: "Unlock Performance Analysis",
  stallion: "Unlock Stallion Finder",
  market: "Unlock Market Update",
  reports: "Unlock Weekly Report",
};

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaywallType;
}

const features = [
  { icon: Search, title: "Horse Search & Performance", desc: "Full career overview, race record, ratings and performance analysis" },
  { icon: Dna, title: "Mating Analysis", desc: "Nick rating, inbreeding coefficient, compatibility score and breeding recommendations" },
  { icon: Activity, title: "Performance Analysis", desc: "Detailed performance breakdown by distance, going, class and career progression" },
  { icon: Heart, title: "Broodmare Plans", desc: "AI breeding strategies and stallion recommendations for your mares" },
  { icon: Upload, title: "PDF & Catalog Upload", desc: "Upload PDFs and auction catalogs for AI-powered analysis" },
  { icon: Activity, title: "Training Analysis", desc: "Video biomechanics, GPS data, longitudinal charts and performance reports per horse" },
  { icon: Download, title: "PDF Reports", desc: "Download professional PDF reports for all your analyses" },
];

export const PaywallModal = ({ open, onOpenChange, type }: PaywallModalProps) => {
  const navigate = useNavigate();

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Upgrade"
        title={PAYWALL_TITLES[type]}
        description="Subscribe to a plan for unlimited analyses, reports and full platform capabilities."
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
        <PremiumModalDismiss onClick={() => onOpenChange(false)} />
        <PremiumModalFooterNote>Secure payment via Revolut</PremiumModalFooterNote>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
