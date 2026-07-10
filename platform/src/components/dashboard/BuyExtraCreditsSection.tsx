import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUpCircle } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

export const BuyExtraCreditsSection = () => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5" style={{ color: '#C58A2B' }} />
            Need More Credits?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setUpgradeOpen(true)}
            className="w-full font-semibold"
            style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Get More Credits or Upgrade
          </Button>
        </CardContent>
      </Card>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
