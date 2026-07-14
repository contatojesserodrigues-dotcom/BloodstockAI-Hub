import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface FeatureLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  planName: string;
}

// Redesigned: no lock icon, no "locked" language — uses action-based paywall UX
export const FeatureLockModal = ({ open, onOpenChange, featureName, planName }: FeatureLockModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-6 space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="BloodstockAI" className="h-10 w-auto object-contain" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>
              Unlock {featureName}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#CFCFCF' }}>
              This feature is available with a paid plan. Explore our options to get full access.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full border-0 font-bold"
              onClick={() => { onOpenChange(false); navigate("/pricing"); }}
              style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif" }}
            >
              See Monthly Plans
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full text-center text-sm cursor-pointer bg-transparent border-none py-2"
              style={{ color: '#666' }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
