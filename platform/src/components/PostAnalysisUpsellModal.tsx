import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PostAnalysisUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostAnalysisUpsellModal = ({ open, onOpenChange }: PostAnalysisUpsellModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-4 sm:p-6 border-0" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="text-center space-y-2 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>Analysis Complete</h2>
          <p className="text-xs sm:text-sm" style={{ color: '#CFCFCF' }}>Continue exploring the platform or upgrade for unlimited analyses.</p>
        </div>

        <div className="rounded-xl p-4 sm:p-5 space-y-3" style={{ border: '2px solid #D4AF37', backgroundColor: 'rgba(212,175,55,0.08)' }}>
          <h3 className="font-bold" style={{ color: '#FFFFFF' }}>Upgrade to a Monthly Plan</h3>
          <p className="text-xs" style={{ color: '#CFCFCF' }}>Full platform access with monthly analyses, priority support, and more.</p>
          <Button
            className="w-full text-xs border-0"
            onClick={() => { onOpenChange(false); navigate("/pricing"); }}
            style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontWeight: 'bold' }}
          >
            View Plans →
          </Button>
        </div>

        <p className="text-center text-[10px] mt-4" style={{ color: '#666' }}>
          Questions? Contact us at office@agentbloodstockai.com
        </p>
      </DialogContent>
    </Dialog>
  );
};