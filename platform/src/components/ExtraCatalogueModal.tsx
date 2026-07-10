import { useState } from "react";
import { Upload, Loader2, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalDismiss,
  PremiumModalHeader,
  PremiumModalHighlight,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
} from "@/components/ui/premium-modal";

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
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Catalogue limit"
        title="Monthly Catalogue Limit Reached"
        description="You've used your 2 catalogue uploads this month. Choose an option below to continue."
      />
      <PremiumModalBody className="space-y-4">
        <PremiumModalHighlight>
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 mt-0.5 flex-shrink-0 text-secondary" />
            <div>
              <p className="font-semibold text-foreground">Extra Catalogue Upload</p>
              <p className="text-xl font-bold mt-1 text-secondary">$97.00</p>
              <p className="text-xs mt-1 text-muted-foreground">One-time payment via Revolut</p>
              <p className="text-xs text-muted-foreground">Upload and analyse one additional catalogue</p>
            </div>
          </div>
        </PremiumModalHighlight>

        <PremiumModalPrimaryButton onClick={handlePurchase} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {loading ? "Processing…" : "Buy Extra Catalogue — $97"}
        </PremiumModalPrimaryButton>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <ArrowUpCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-secondary" />
            <div>
              <p className="font-semibold text-foreground">Need Unlimited Catalogues?</p>
              <p className="text-xs mt-1 text-muted-foreground">Enterprise plan — unlimited uploads, custom pricing</p>
            </div>
          </div>
        </div>

        <PremiumModalSecondaryButton
          onClick={() => window.location.href = "mailto:office@bloodstockai.com?subject=Enterprise Plan Inquiry"}
        >
          Contact Us for Enterprise →
        </PremiumModalSecondaryButton>

        <PremiumModalDismiss onClick={() => onOpenChange(false)} />
      </PremiumModalBody>
    </PremiumDialog>
  );
};
