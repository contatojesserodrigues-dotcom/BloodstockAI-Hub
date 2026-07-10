import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ListingStatus, MarketplaceListing } from "@/types/marketplace";
import { X, Upload } from "lucide-react";

type FormState = Partial<MarketplaceListing> & {
  pedigree_json: Record<string, string>;
  photos: string[];
};

const emptyForm = (init?: Partial<MarketplaceListing>): FormState => {
  const base: FormState = {
    horse_name: "",
    reference_code: "",
    date_of_birth: "",
    sex: "",
    breed: "",
    sire: "",
    dam: "",
    dam_sire: "",
    consignor_name: "",
    country: "",
    colour: "",
    cob: "",
    bonus_schemes: "",
    x_rays_available: false,
    scoping_video_available: false,
    repository_url: "",
    sire_notes_html: "",
    first_dam_notes_html: "",
    second_dam_notes_html: "",
    third_dam_notes_html: "",
    buyer_name: "",
    sold_price: 0,
    auction_sale_name: "",
    sale_stage: "pre_sale",
    guide_price: 0,
    offers_close_at: "",
    status: "draft",
    description_html: "",
    video_url: "",
    report_pdf_url: "",
    internal_notes: "",
    photos: [],
    pedigree_json: {},
  };
  if (!init) return base;
  return {
    ...base,
    ...init,
    pedigree_json: (init.pedigree_json as Record<string, string>) ?? {},
    photos: init.photos ?? [],
  };
};

const pedigreeFields = [
  "sire", "sire_sire", "sire_sire_sire", "sire_sire_dam", "sire_dam", "sire_dam_sire", "sire_dam_dam",
  "dam", "dam_sire", "dam_sire_sire", "dam_sire_dam", "dam_dam", "dam_dam_sire", "dam_dam_dam",
];

export const AdminListingForm = ({ existing }: { existing?: MarketplaceListing }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm(existing));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const uploadFiles = async (files: FileList | null, bucket: "marketplace-photos" | "marketplace-reports") => {
    if (!files?.length) return [] as string[];
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) { toast({ variant: "destructive", title: "Upload failed", description: error.message }); continue; }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const onPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files, "marketplace-photos");
    if (urls.length) set("photos", [...(form.photos || []), ...urls]);
    e.target.value = "";
  };

  const onPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const urls = await uploadFiles(e.target.files, "marketplace-reports");
    if (urls[0]) set("report_pdf_url", urls[0]);
    e.target.value = "";
  };

  const save = async (status: ListingStatus) => {
    if (!form.horse_name) { toast({ variant: "destructive", title: "Horse name is required" }); return; }
    setSaving(true);
    const payload = {
      horse_name: form.horse_name,
      reference_code: form.reference_code || null,
      date_of_birth: form.date_of_birth || null,
      sex: form.sex || null,
      breed: form.breed || null,
      sire: form.sire || null,
      dam: form.dam || null,
      dam_sire: form.dam_sire || null,
      consignor_name: form.consignor_name || null,
      country: form.country || null,
      colour: form.colour || null,
      cob: form.cob || null,
      bonus_schemes: form.bonus_schemes || null,
      x_rays_available: Boolean(form.x_rays_available),
      scoping_video_available: Boolean(form.scoping_video_available),
      repository_url: form.repository_url || null,
      sire_notes_html: form.sire_notes_html || null,
      first_dam_notes_html: form.first_dam_notes_html || null,
      second_dam_notes_html: form.second_dam_notes_html || null,
      third_dam_notes_html: form.third_dam_notes_html || null,
      buyer_name: form.buyer_name || null,
      sold_price: Number(form.sold_price) || null,
      auction_sale_name: form.auction_sale_name || null,
      sale_stage: form.sale_stage || "pre_sale",
      guide_price: Number(form.guide_price) || 0,
      offers_close_at: form.offers_close_at || null,
      status,
      description_html: form.description_html || null,
      pedigree_json: form.pedigree_json || {},
      report_pdf_url: form.report_pdf_url || null,
      video_url: form.video_url || null,
      photos: form.photos || [],
      internal_notes: form.internal_notes || null,
    };
    const { error } = existing
      ? await supabase.from("marketplace_listings").update(payload as any).eq("id", existing.id)
      : await supabase.from("marketplace_listings").insert(payload as any);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Save failed", description: error.message }); return; }
    toast({ title: status === "active" ? "Listing published" : "Listing saved" });
    navigate("/admin/horses-for-sale");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Horse name *" value={form.horse_name || ""} onChange={(e) => set("horse_name", e.target.value)} />
          <Input placeholder="Reference code" value={form.reference_code || ""} onChange={(e) => set("reference_code", e.target.value)} />
          <Input type="date" placeholder="Date of birth" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value)} />
          <Select value={form.sex || ""} onValueChange={(v) => set("sex", v)}>
            <SelectTrigger><SelectValue placeholder="Sex" /></SelectTrigger>
            <SelectContent>
              {["Colt", "Filly", "Gelding", "Mare", "Stallion"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.breed || ""} onValueChange={(v) => set("breed", v)}>
            <SelectTrigger><SelectValue placeholder="Breed" /></SelectTrigger>
            <SelectContent>
              {["Thoroughbred", "Arabian", "Warmblood"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Country" value={form.country || ""} onChange={(e) => set("country", e.target.value)} />
          <Input placeholder="Colour (Bay, Chestnut, Grey...)" value={form.colour || ""} onChange={(e) => set("colour", e.target.value)} />
          <Input placeholder="COB (Country of Birth)" value={form.cob || ""} onChange={(e) => set("cob", e.target.value)} />
          <Input placeholder="Bonus Schemes" value={form.bonus_schemes || ""} onChange={(e) => set("bonus_schemes", e.target.value)} />
          <Input placeholder="Consignor name" value={form.consignor_name || ""} onChange={(e) => set("consignor_name", e.target.value)} />
          <Input placeholder="Sire" value={form.sire || ""} onChange={(e) => set("sire", e.target.value)} />
          <Input placeholder="Dam" value={form.dam || ""} onChange={(e) => set("dam", e.target.value)} />
          <Input placeholder="Dam sire" value={form.dam_sire || ""} onChange={(e) => set("dam_sire", e.target.value)} />
        </div>
      </Card>

      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Commercial</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="number" placeholder="Guide price (£)" value={form.guide_price ?? 0} onChange={(e) => set("guide_price", Number(e.target.value))} />
          <Input type="number" placeholder="Sold price (£)" value={form.sold_price ?? 0} onChange={(e) => set("sold_price", Number(e.target.value))} />
          <Input placeholder="Buyer name" value={form.buyer_name || ""} onChange={(e) => set("buyer_name", e.target.value)} />
          <Input type="datetime-local" value={form.offers_close_at ? new Date(form.offers_close_at).toISOString().slice(0, 16) : ""} onChange={(e) => set("offers_close_at", e.target.value ? new Date(e.target.value).toISOString() : "")} />
          <Select value={form.status || "draft"} onValueChange={(v) => set("status", v as ListingStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["draft", "active", "sold", "withdrawn"] as ListingStatus[]).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Sale name" value={form.auction_sale_name || ""} onChange={(e) => set("auction_sale_name", e.target.value)} />
          <Select value={form.sale_stage || "pre_sale"} onValueChange={(v) => set("sale_stage", v)}>
            <SelectTrigger><SelectValue placeholder="Sale stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pre_sale">Pre-sale</SelectItem>
              <SelectItem value="post_sale">Post-sale</SelectItem>
              <SelectItem value="private_treaty">Private treaty</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Pedigree (3 generations)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pedigreeFields.map((f) => (
            <Input
              key={f}
              placeholder={f.replace(/_/g, " ")}
              value={form.pedigree_json[f] || ""}
              onChange={(e) => set("pedigree_json", { ...form.pedigree_json, [f]: e.target.value })}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Media</h2>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Photos</label>
          <div className="flex flex-wrap gap-3 mt-2">
            {(form.photos || []).map((url, i) => (
              <div key={url} className="relative w-24 h-24 rounded overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("photos", form.photos!.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-secondary">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">PDF report</label>
            <input type="file" accept="application/pdf" onChange={onPdf} className="block mt-2 text-sm text-foreground" />
            {form.report_pdf_url && <a href={form.report_pdf_url} target="_blank" rel="noopener noreferrer" className="text-secondary text-xs mt-1 inline-block">View current PDF</a>}
          </div>
          <Input placeholder="Video URL (YouTube or MP4)" value={form.video_url || ""} onChange={(e) => set("video_url", e.target.value)} />
          <Input placeholder="Repository link" value={form.repository_url || ""} onChange={(e) => set("repository_url", e.target.value)} />
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={Boolean(form.x_rays_available)} onCheckedChange={(v) => set("x_rays_available", v === true)} />
              X-Rays available
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={Boolean(form.scoping_video_available)} onCheckedChange={(v) => set("scoping_video_available", v === true)} />
              Scoping video available
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Catalogue Notes (HTML allowed)</h2>
        <Textarea rows={5} placeholder="Sire notes" value={form.sire_notes_html || ""} onChange={(e) => set("sire_notes_html", e.target.value)} />
        <Textarea rows={5} placeholder="1st dam notes" value={form.first_dam_notes_html || ""} onChange={(e) => set("first_dam_notes_html", e.target.value)} />
        <Textarea rows={5} placeholder="2nd dam notes" value={form.second_dam_notes_html || ""} onChange={(e) => set("second_dam_notes_html", e.target.value)} />
        <Textarea rows={5} placeholder="3rd dam notes" value={form.third_dam_notes_html || ""} onChange={(e) => set("third_dam_notes_html", e.target.value)} />
        <Textarea rows={5} placeholder="Additional family / performance notes" value={form.description_html || ""} onChange={(e) => set("description_html", e.target.value)} />
      </Card>

      <Card className="p-5 space-y-4 bg-card">
        <h2 className="text-secondary uppercase tracking-wider text-xs">Internal Notes (not public)</h2>
        <Textarea rows={3} value={form.internal_notes || ""} onChange={(e) => set("internal_notes", e.target.value)} />
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" disabled={saving || uploading} onClick={() => save("draft")}>Save as Draft</Button>
        <Button variant="premium" disabled={saving || uploading} onClick={() => save("active")}>Publish</Button>
      </div>
    </div>
  );
};

export default AdminListingForm;