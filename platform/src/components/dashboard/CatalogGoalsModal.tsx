import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-secondary" />
            Catalog Analysis Goals
          </DialogTitle>
          <DialogDescription>
            Tell the AI exactly what you're looking for. It will filter and score every horse in the catalog against your criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClear} className="sm:mr-auto">
            Clear Goals
          </Button>
          <Button variant="premium" onClick={handleSave}>
            Save Goals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
