import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ShieldCheck } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useSubscription } from "@/integrations/supabase/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { useCredits } from "@/hooks/useCredits";
import { PlanInquiryModal } from "@/components/PlanInquiryModal";
import { useNavigate } from "react-router-dom";

export const BillingCard = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { subscription_end, openCustomerPortal } = useSubscription(user?.id);
  const { isSuperAdmin } = useUserRole();
  const { isPaidPlan } = useCredits();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const navigate = useNavigate();

  const plan = profile?.plan ?? "free";

  const planLabel: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const planColor: Record<string, string> = {
    free: "hsl(220 9% 46%)",
    starter: "hsl(36 64% 47%)",
    pro: "hsl(222 47% 11%)",
    enterprise: "hsl(222 47% 11%)",
  };

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-[#0F172A] to-[#111827] text-white">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-white">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#C58A2B]" />
          Subscription & Billing
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-white/55">Manage your plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5 pt-5">
        <div className="p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Current Plan</span>
            <Badge style={{ backgroundColor: planColor[plan] ?? planColor.free, color: "white" }}>
              {planLabel[plan] ?? "Free"}
            </Badge>
          </div>

          {subscription_end && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Renews on {new Date(subscription_end).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {isPaidPlan || isSuperAdmin ? (
          <div className="p-3 sm:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Full Platform Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All features and analyses are unlocked.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 rounded-xl border border-border/60 bg-white">
            <p className="text-xs sm:text-sm font-semibold mb-2 text-foreground">Upgrade to unlock all features</p>
            <p className="text-xs text-muted-foreground mb-3">
              Get full access to Horse Search, Mating Analysis, Catalogue Upload, Broodmare Plans, and more.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {!isPaidPlan && !isSuperAdmin ? (
            <Button
              onClick={() => navigate("/pricing")}
              className="w-full text-xs sm:text-sm bg-[#0F172A] hover:bg-[#111827] text-white"
            >
              Upgrade Plan
            </Button>
          ) : (
            <Button
              onClick={openCustomerPortal}
              variant="outline"
              className="w-full text-xs sm:text-sm"
            >
              Manage Subscription
            </Button>
          )}
        </div>
      </CardContent>

      <PlanInquiryModal
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        planName="Pro Plan"
      />
    </Card>
  );
};
