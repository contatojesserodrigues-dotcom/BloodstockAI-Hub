import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const INSPECTION_CATEGORIES = [
  { value: "FLAT_YEARLING", label: "Flat Yearling" },
  { value: "FOAL", label: "Flat Foal" },
  { value: "WEANLING", label: "Weanling" },
  { value: "BREEZE_UP", label: "Breeze Up" },
  { value: "NH_STORE_YOUNG", label: "National Hunt" },
  { value: "BROODMARE_STALLION", label: "Broodmare" },
  { value: "STALLION_PROSPECT", label: "Stallion Prospect" },
  { value: "FLAT_IN_TRAINING", label: "Flat In Training" },
  { value: "YEARLING", label: "Yearling" },
];

export const INSPECTION_REGIONS = [
  "Ireland", "UK", "USA", "Australia", "France", "Japan", "UAE", "Other",
] as const;

export type CreateInspectionForm = {
  horse_name: string;
  registration_number: string;
  birth_year: string;
  sex: string;
  breed: string;
  country: string;
  auction_name: string;
  lot_ref: string;
  horse_category: string;
  region: string;
};

const emptyForm = (): CreateInspectionForm => ({
  horse_name: "",
  registration_number: "",
  birth_year: "",
  sex: "",
  breed: "Thoroughbred",
  country: "",
  auction_name: "",
  lot_ref: "",
  horse_category: "",
  region: "",
});

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: CreateInspectionForm) => Promise<void>;
};

export function CreateInspectionWizard({ open, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(emptyForm);

  if (!open) return null;

  const set = (k: keyof CreateInspectionForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="border-[#C9A227]/40 shadow-lg">
      <CardHeader>
        <CardTitle>Create New Inspection</CardTitle>
        <CardDescription>
          BloodstockAI Equine Intelligence Inspection Engine™ — register the horse and sale context before uploading pedigree and video.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>Horse name *</Label>
            <Input value={form.horse_name} onChange={(e) => set("horse_name", e.target.value)} placeholder="Registered or catalogue name" />
          </div>
          <div>
            <Label>Registration</Label>
            <Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} placeholder="e.g. 12345678" />
          </div>
          <div>
            <Label>Year of birth</Label>
            <Input type="number" value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)} placeholder="2024" />
          </div>
          <div>
            <Label>Sex</Label>
            <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Colt", "Filly", "Gelding", "Horse", "Mare", "Stallion"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Breed</Label>
            <Input value={form.breed} onChange={(e) => set("breed", e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="IRE, GB, USA…" />
          </div>
          <div>
            <Label>Auction / Sale</Label>
            <Input value={form.auction_name} onChange={(e) => set("auction_name", e.target.value)} placeholder="Tattersalls July Sale" />
          </div>
          <div>
            <Label>Lot number</Label>
            <Input value={form.lot_ref} onChange={(e) => set("lot_ref", e.target.value)} placeholder="145" />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.horse_category} onValueChange={(v) => set("horse_category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {INSPECTION_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Region</Label>
            <Select value={form.region} onValueChange={(v) => set("region", v)}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {INSPECTION_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            className="bg-[#C9A227] hover:bg-[#b8921f] text-[#0A1628]"
            disabled={saving || !form.horse_name.trim() || !form.horse_category}
            onClick={() => void onSubmit(form).then(() => setForm(emptyForm()))}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Create Inspection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
