import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface FreemiumUpgradeWallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURES = [
  "Unlimited AI-powered horse searches",
  "Full pedigree & nick analysis",
  "Broodmare planning & sire recommendations",
  "Sale catalog upload & purchase recommendations",
  "Real-time market intelligence",
  "Weekly auction reports from Keeneland, Tattersalls, Goffs & more",
];

export const FreemiumUpgradeWall = ({ open, onOpenChange }: FreemiumUpgradeWallProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto border-0" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex justify-center mb-2">
          <img src={logo} alt="BloodstockAI" className="h-10 w-auto object-contain" />
        </div>

        <div className="text-center space-y-1.5 sm:space-y-2">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>
            Unlock Full Access
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#CFCFCF' }}>
            Subscribe to a plan to continue using the platform with full capabilities.
          </p>
        </div>

        {/* Feature list */}
        <div className="py-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-1.5 text-xs" style={{ color: '#CFCFCF' }}>
              <span className="mt-0.5 shrink-0" style={{ color: '#D4AF37' }}>✦</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <Button
            className="w-full h-9 text-sm border-0"
            onClick={() => { onOpenChange(false); navigate("/pricing"); }}
            style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontWeight: 'bold', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            View Plans →
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs pt-1" style={{ color: '#666' }}>
          <span>✓ No contract</span>
          <span>✓ Cancel anytime</span>
          <span>✓ Used at Keeneland & Tattersalls</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};