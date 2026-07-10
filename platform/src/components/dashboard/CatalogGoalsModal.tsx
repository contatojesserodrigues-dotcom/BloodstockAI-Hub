import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
} from "@/components/ui/premium-modal";

export interface ClientGoals {
  horse_type: string;
  desired_sire: string;
  analysis_requested: string;
}

interface CatalogGoalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: ClientGoals;
  onSave: (goals: ClientGoals) => void;
}

const HORSE_TYPES = [
  "Sprinter",
  "Miler",
  "Middle Distance",
  "Long Distance (Stayer)",
  "Broodmare Prospect",
  "Colt",
  "Filly",
  "National Hunt / Jumper",
  "Two-Year-Old Prospect",
];

export const CatalogGoalsModal = ({ open, onOpenChange, goals, onSave }: CatalogGoalsModalProps) => {
  const [localGoals, setLocalGoals] = useState<ClientGoals>(goals);

  const handleSave = () => {
    onSave(localGoals);
    onOpenChange(false);
  };

  const handleClear = () => {
    const empty: ClientGoals = { horse_type: "", desired_sire: "", analysis_requested: "" };
    setLocalGoals(empty);
    onSave(empty);
    onOpenChange(false);
  };

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Catalog Analysis"
        title="Analysis Goals"
        description="Tell the AI exactly what you're looking for. It will filter and score every horse in the catalog against your criteria."
        showLogo
      />
      <PremiumModalBody>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <Target className="w-4 h-4 text-secondary shrink-0" />
          <p className="text-xs text-muted-foreground leading-snug">
            Goals apply to your next catalog analysis run.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="horse_type">Horse Type / Goal</Label>
            <Select
              value={localGoals.horse_type}
              onValueChange={(v) => setLocalGoals((prev) => ({ ...prev, horse_type: v }))}
            >
              <SelectTrigger id="horse_type">
                <SelectValue placeholder="Select a type..." />
              </SelectTrigger>
              <SelectContent>
                {HORSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desired_sire">Desired Sire (Garanhão)</Label>
            <Input
              id="desired_sire"
              placeholder="e.g. Frankel, Dubawi, I Am Invincible..."
              value={localGoals.desired_sire}
              onChange={(e) => setLocalGoals((prev) => ({ ...prev, desired_sire: e.target.value }))}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis_requested">Specific Analysis Requests</Label>
            <Textarea
              id="analysis_requested"
              placeholder={"e.g.\n• Pedigree quality and black-type depth\n• Racing performance at 1200m-1400m\n• Auction price vs sibling market value\n• Broodmare sire influence"}
              value={localGoals.analysis_requested}
              onChange={(e) => setLocalGoals((prev) => ({ ...prev, analysis_requested: e.target.value }))}
              rows={5}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <PremiumModalSecondaryButton onClick={handleClear} className="sm:mr-auto sm:w-auto">
            Clear Goals
          </PremiumModalSecondaryButton>
          <PremiumModalPrimaryButton onClick={handleSave} className="sm:w-auto sm:min-w-[140px]">
            Save Goals
          </PremiumModalPrimaryButton>
        </div>
      </PremiumModalBody>
    </PremiumDialog>
  );
};
