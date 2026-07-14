import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface ExtraCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExtraCreditsModal = ({ open, onOpenChange }: ExtraCreditsModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 overflow-hidden" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-5 text-center" style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
          <img src={logo} alt="BloodstockAI" className="h-10 w-auto mx-auto mb-2 object-contain" />
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg sm:text-[22px] font-bold" style={{ color: '#D4AF37', fontFamily: "'Cinzel', Georgia, serif" }}>
              Unlock More Analyses
            </h3>
            <p className="text-xs sm:text-sm mt-1" style={{ color: '#CFCFCF' }}>
              Upgrade to a monthly plan for unlimited analyses and full platform access.
            </p>
          </div>

          <Button
            onClick={() => { onOpenChange(false); navigate("/pricing"); }}
            className="w-full font-bold py-4 border-0"
            style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            View Plans →
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm cursor-pointer bg-transparent border-none"
            style={{ color: '#666' }}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};