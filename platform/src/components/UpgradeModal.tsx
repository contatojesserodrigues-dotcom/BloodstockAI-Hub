import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle } from "lucide-react";
import logo from "@/assets/logo.png";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-0 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        {/* Header */}
        <div className="px-5 sm:px-6 py-6 sm:py-7 text-center" style={{ backgroundColor: '#0B0B0D', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
          <img src={logo} alt="BloodstockAI" className="h-10 sm:h-12 w-auto mx-auto mb-3 object-contain" />
          <h2 className="text-base sm:text-lg font-bold tracking-wide" style={{ color: '#D4AF37', fontFamily: "'Cinzel', Georgia, serif" }}>
            Unlock Full Access
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 sm:py-7 space-y-5" style={{ backgroundColor: '#0B0B0D' }}>
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>
              You've used all your analysis credits
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#CFCFCF' }}>
              Upgrade to a monthly plan to continue using the platform with full access.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', margin: '0' }} />

          {/* Upgrade Plan */}
          <div className="rounded-lg p-4 sm:p-5" style={{ backgroundColor: 'rgba(212,175,55,0.08)', border: '2px solid #D4AF37' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm sm:text-base flex items-center gap-1.5" style={{ color: '#FFFFFF' }}>
                <ArrowUpCircle className="w-4 h-4" style={{ color: '#D4AF37' }} />
                Upgrade to a Monthly Plan
              </span>
            </div>
            <p className="text-xs sm:text-[13px] leading-relaxed mb-4" style={{ color: '#CFCFCF' }}>
              Get monthly analyses, priority support, and full platform access with Starter or Professional plans.
            </p>
            <Button
              onClick={() => { navigate('/pricing'); onOpenChange(false); }}
              className="w-full font-bold text-sm sm:text-[15px] py-3 sm:py-3.5 border-0"
              style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif" }}
            >
              View Plans →
            </Button>
          </div>

          {/* Maybe Later */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-xs sm:text-[13px] py-2 bg-transparent border-none cursor-pointer transition-colors"
            style={{ color: '#666' }}
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};