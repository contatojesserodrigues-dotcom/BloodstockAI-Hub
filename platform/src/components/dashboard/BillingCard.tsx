import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          Subscription & Billing
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Manage your plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Current Plan */}
        <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Current Plan</span>
            <Badge style={{ backgroundColor: planColor[plan] ?? planColor.free, color: "white" }}>
              {planLabel[plan] ?? "Free"}
            </Badge>
          </div>

          {subscription_end && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Renews on {new Date(subscription_end).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Plan Status */}
        {isPaidPlan || isSuperAdmin ? (
          <div className="p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20">
            <p className="text-sm font-medium" style={{ color: '#C58A2B' }}>
              ✓ Full Platform Access
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All features and analyses are unlocked.
            </p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 rounded-lg border border-border">
            <p className="text-xs sm:text-sm font-semibold mb-2">Upgrade to unlock all features</p>
            <p className="text-xs text-muted-foreground mb-3">
              Get full access to Horse Search, Mating Analysis, Catalogue Upload, Broodmare Plans, and more.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!isPaidPlan && !isSuperAdmin ? (
            <Button
              onClick={() => navigate("/pricing")}
              variant="premium"
              className="w-full text-xs sm:text-sm"
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
