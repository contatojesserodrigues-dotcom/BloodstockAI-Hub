import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Dna, Activity, Heart, Upload, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface SingleAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SingleAnalysisModal = ({ open, onOpenChange }: SingleAnalysisModalProps) => {
  const navigate = useNavigate();

  const features = [
    { icon: Search, title: "Horse Search & Performance", desc: "Full career overview, race record, ratings and performance analysis" },
    { icon: Dna, title: "Mating Analysis", desc: "Nick rating, inbreeding coefficient, compatibility score and breeding recommendations" },
    { icon: Activity, title: "Performance Analysis", desc: "Detailed performance breakdown by distance, going, class and career progression charts" },
    { icon: Heart, title: "Broodmare Plans", desc: "AI breeding strategies and stallion recommendations for your mares" },
    { icon: Upload, title: "PDF Upload", desc: "Upload single PDFs for AI-powered analysis and recommendations" },
    { icon: Download, title: "PDF Reports", desc: "Download professional PDF reports for all your analyses" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-y-auto max-h-[90vh] border-0" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="BloodstockAI" className="h-10 sm:h-12 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>
              Unlock Full Platform Access
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: '#CFCFCF' }}>
              Subscribe to a plan for analyses, reports and full platform capabilities.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }} />

          {/* Features grid */}
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3" style={{ color: '#D4AF37' }}>
              What's included:
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-lg p-2.5 sm:p-3 space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <f.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#D4AF37' }} />
                  <p className="text-[10px] sm:text-xs font-semibold" style={{ color: '#FFFFFF' }}>{f.title}</p>
                  <p className="text-[9px] sm:text-[10px] leading-tight" style={{ color: '#999' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }} />

          <div className="space-y-2.5">
            <Button
              className="w-full text-xs sm:text-sm uppercase tracking-wider py-3 border-0"
              size="lg"
              onClick={() => { onOpenChange(false); navigate("/pricing"); }}
              style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 'bold' }}
            >
              View Plans →
            </Button>
          </div>

          <p className="text-center text-[9px] sm:text-[10px]" style={{ color: '#666' }}>
            Secure payment via Revolut
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};