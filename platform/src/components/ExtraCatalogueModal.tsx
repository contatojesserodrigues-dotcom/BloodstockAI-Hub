import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface ExtraCatalogueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExtraCatalogueModal = ({ open, onOpenChange }: ExtraCatalogueModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { planId: "extra_catalogue", billingCycle: "one_time" },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message || "Could not start checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 overflow-hidden" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-5 text-center" style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
          <img src={logo} alt="BloodstockAI®" className="h-10 w-auto mx-auto mb-2 object-contain" />
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg sm:text-[22px] font-bold" style={{ color: '#D4AF37', fontFamily: "'Cinzel', Georgia, serif" }}>
              Monthly Catalogue Limit Reached
            </h3>
            <p className="text-xs sm:text-sm mt-1" style={{ color: '#CFCFCF' }}>
              You've used your 2 catalogue uploads this month. Choose an option below to continue.
            </p>
          </div>

          {/* Option 1: Extra catalogue $97 */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(212,175,55,0.08)', border: '1px solid #D4AF37' }}>
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
              <div>
                <p className="font-semibold" style={{ color: '#FFFFFF' }}>Extra Catalogue Upload</p>
                <p className="text-xl font-bold mt-1" style={{ color: '#D4AF37' }}>$97.00</p>
                <p className="text-xs mt-1" style={{ color: '#999' }}>One-time payment via Revolut</p>
                <p className="text-xs" style={{ color: '#999' }}>Upload and analyse one additional catalogue</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full font-bold py-4 border-0"
            style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Processing…" : "Buy Extra Catalogue — $97"}
          </Button>

          {/* Option 2: Enterprise upgrade */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="flex items-start gap-3">
              <ArrowUpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
              <div>
                <p className="font-semibold" style={{ color: '#FFFFFF' }}>Need Unlimited Catalogues?</p>
                <p className="text-xs mt-1" style={{ color: '#999' }}>Enterprise plan — unlimited uploads, custom pricing</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => window.location.href = "mailto:office@bloodstockai.com?subject=Enterprise Plan Inquiry"}
            className="w-full font-bold py-3 border-0"
            style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid #D4AF37' }}
          >
            Contact Us for Enterprise →
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm cursor-pointer bg-transparent border-none"
            style={{ color: '#666' }}
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
