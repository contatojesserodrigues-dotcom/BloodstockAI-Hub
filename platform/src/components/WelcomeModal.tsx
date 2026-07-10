import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Video,
  Search,
  GitMerge,
  BarChart2,
  Bell,
  ArrowRight,
  ClipboardCheck,
  LineChart,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
} from "@/components/ui/premium-modal";

interface WelcomeModalProps {
  userId: string | undefined;
}

export const WelcomeModal = ({ userId }: WelcomeModalProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const key = `welcome_shown_${userId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, "true");
    }
  }, [userId]);

  const capabilities = [
    { icon: FileText, title: "Auction Catalogue Analysis", desc: "Every lot ranked and evaluated" },
    { icon: Video, title: "Breeze-Up & Video Analysis", desc: "Frame-by-frame biomechanical reports" },
    { icon: ClipboardCheck, title: "Sale Inspection Analysis", desc: "Photo, video and pedigree cross-insights" },
    { icon: LineChart, title: "Training Analysis", desc: "Performance, vitals and AI insights" },
    { icon: Search, title: "Stallion Finder", desc: "Find the right stallion for your mare" },
    { icon: GitMerge, title: "Mating & Broodmare Plans", desc: "Breeding strategy and nick analysis" },
    { icon: BarChart2, title: "Pedigree & Performance", desc: "Deep pedigree research globally" },
    { icon: Bell, title: "Market Reports & Catalogs", desc: "Curated intelligence and analysed catalogues" },
  ];

  return (
    <PremiumDialog open={open} onOpenChange={setOpen} size="lg">
      <PremiumModalHeader
        eyebrow="Welcome"
        title="BloodstockAI® Intelligence"
        description="The complete analysis platform for bloodstock professionals — catalogue to conformation, pedigree to valuation."
        showLogo
      />
      <PremiumModalBody>
        <div className="flex items-center justify-center mb-1">
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/10">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Professional platform
          </Badge>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Platform modules
          </p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-white px-3 py-2.5"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0F172A]/5">
                    <Icon className="w-3.5 h-3.5 text-[#C58A2B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug">{cap.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{cap.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <PremiumModalPrimaryButton size="lg" onClick={() => setOpen(false)}>
          Explore the Platform
          <ArrowRight className="ml-2 w-4 h-4" />
        </PremiumModalPrimaryButton>
        <PremiumModalSecondaryButton
          onClick={() => {
            setOpen(false);
            navigate("/pricing");
          }}
        >
          View Plans
        </PremiumModalSecondaryButton>

        <p className="text-center text-[11px] text-muted-foreground">
          Built for bloodstock, by bloodstock.
        </p>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
