import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Mail, CreditCard, Calendar, Crown, AlertTriangle } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useSubscription } from "@/integrations/supabase/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const DashboardSettings = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { subscription_end } = useSubscription(user?.id);
  const { isPaidPlan } = useCredits();
  const { isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const [closeAccountOpen, setCloseAccountOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const plan = profile?.plan ?? "free";

  const planLabel: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.full_name || "—";

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase font-medium" style={{ color: '#6B7280' }}>Full Name</p>
              <p className="text-sm font-semibold mt-1" style={{ color: '#111827' }}>{fullName}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-medium" style={{ color: '#6B7280' }}>Email</p>
              <p className="text-sm font-semibold mt-1 flex items-center gap-1.5" style={{ color: '#111827' }}>
                <Mail className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                {profile?.email || user?.email || "—"}
              </p>
            </div>
            {profile?.company_name && (
              <div>
                <p className="text-xs uppercase font-medium" style={{ color: '#6B7280' }}>Company</p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#111827' }}>{profile.company_name}</p>
              </div>
            )}
            {profile?.country && (
              <div>
                <p className="text-xs uppercase font-medium" style={{ color: '#6B7280' }}>Country</p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#111827' }}>{profile.country}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Plan & Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="w-5 h-5" style={{ color: '#C58A2B' }} />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#6B7280' }}>Plan</span>
            <Badge style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              {planLabel[plan] ?? "Free"}
            </Badge>
          </div>

          {(isPaidPlan || isSuperAdmin) && (
            <div className="p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20">
              <p className="text-sm font-medium" style={{ color: '#C58A2B' }}>
                ✓ Full Platform Access
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All features and analyses are unlocked.
              </p>
            </div>
          )}

          {isSuperAdmin && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#6B7280' }}>Role</span>
              <Badge style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}>Super Admin</Badge>
            </div>
          )}

          {/* Billing dates */}
          <div className="border-t pt-4 space-y-3" style={{ borderColor: '#E5E7EB' }}>
            {profile?.plan_started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Plan Started
                </span>
                <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                  {new Date(profile.plan_started_at).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscription_end && (
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                  <CreditCard className="w-3.5 h-3.5" />
                  Next Invoice
                </span>
                <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                  {new Date(subscription_end).toLocaleDateString()}
                </span>
              </div>
            )}

            {!subscription_end && plan === 'free' && (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Free plan — no billing. Upgrade for full access.
              </p>
            )}
          </div>

          {/* Upgrade button for free users */}
          {!isPaidPlan && !isSuperAdmin && (
            <Button
              onClick={() => navigate("/pricing")}
              variant="premium"
              className="w-full text-xs sm:text-sm"
            >
              View Plans →
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Close Account */}
      <Card className="border" style={{ borderColor: '#E53E3E40' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: '#E53E3E' }}>
            <AlertTriangle className="w-5 h-5" />
            Close Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Permanently delete your account and all associated data. If you have an active subscription, it will be cancelled immediately. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            onClick={() => setCloseAccountOpen(true)}
            className="border font-semibold"
            style={{ borderColor: '#E53E3E', color: '#E53E3E' }}
          >
            Close My Account
          </Button>
        </CardContent>
      </Card>

      {/* Close Account Confirmation Modal */}
      <Dialog open={closeAccountOpen} onOpenChange={setCloseAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#E53E3E' }}>
              <AlertTriangle className="w-5 h-5" />
              Are you sure?
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: '#6B7280' }}>
              This will permanently delete your BloodstockAI account, cancel any active subscription, and remove all your data including analysis history, reports, and saved horses. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setCloseAccountOpen(false)}
              className="flex-1"
            >
              Keep My Account
            </Button>
            <Button
              disabled={closing}
              onClick={async () => {
                setClosing(true);
                try {
                  await signOut();
                  toast({
                    title: "Account closure requested",
                    description: "Your account closure has been initiated. You will receive a confirmation email shortly.",
                  });
                  navigate("/");
                } catch (err) {
                  toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
                } finally {
                  setClosing(false);
                }
              }}
              className="flex-1 font-semibold"
              style={{ backgroundColor: '#E53E3E', color: '#FFFFFF' }}
            >
              {closing ? "Closing…" : "Yes, Close My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
