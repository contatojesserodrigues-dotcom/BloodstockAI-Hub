import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Video, Search, GitMerge, BarChart2, Bell, ArrowRight, ClipboardCheck, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

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
    { icon: FileText, title: "Auction Catalogue Analysis", desc: "Full catalogue intelligence — every lot ranked and evaluated" },
    { icon: Video, title: "Breeze-Up & Video Analysis", desc: "Frame-by-frame biomechanical and conformation reports" },
    { icon: ClipboardCheck, title: "Sale Inspection Analysis", desc: "Photo, video and pedigree cross-insights for sale-day conformation" },
    { icon: LineChart, title: "Training Analysis", desc: "Longitudinal performance, vitals and AI nutrition & training insights" },
    { icon: Search, title: "Stallion Finder", desc: "Find the right stallion starting with your mare" },
    { icon: GitMerge, title: "Mating & Broodmare Plans", desc: "AI-supported breeding strategy and nick analysis" },
    { icon: BarChart2, title: "Pedigree & Performance", desc: "Deep pedigree research across global bloodlines" },
    { icon: Bell, title: "Market Reports & Sales Catalogs", desc: "Curated market intelligence and analysed sales catalogues" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="BloodstockAI®" className="h-10 sm:h-12 w-auto object-contain" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Cinzel', Georgia, serif" }}>
              Welcome to BloodstockAI®
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#CFCFCF' }}>
              The most complete AI analysis platform built for bloodstock professionals — from catalogue to conformation, pedigree to valuation.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }} />

          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium" style={{ color: '#D4AF37', fontFamily: "'Cinzel', Georgia, serif" }}>
              Explore What BloodstockAI® Offers:
            </p>
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="flex items-start gap-3 text-xs sm:text-sm" style={{ color: '#CFCFCF' }}>
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
                  <div>
                    <span className="font-semibold" style={{ color: '#FFFFFF' }}>{cap.title}</span>
                    <span className="mx-1">—</span>
                    <span>{cap.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }} />

          <div className="space-y-2.5">
            <Button
              size="lg"
              className="w-full border-0 text-xs sm:text-sm"
              onClick={() => setOpen(false)}
              style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontWeight: 'bold', fontFamily: "'Cinzel', Georgia, serif" }}
            >
              Explore the Platform
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              className="w-full h-10 text-xs sm:text-sm border-0"
              onClick={() => { setOpen(false); navigate("/pricing"); }}
              style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid #D4AF37' }}
            >
              View Plans
            </Button>
          </div>

          <p className="text-center text-[10px]" style={{ color: '#666' }}>
            Built for bloodstock, by bloodstock.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
