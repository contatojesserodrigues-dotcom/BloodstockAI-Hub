// Horse Sale Inspection Analysis — append-only multi-upload module.
// Replaces the legacy Visual Analysis flow.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Upload, FileDown, Trash2, FileText, Sparkles, ChevronDown, ChevronUp, Eye, EyeOff, ListFilter, Activity } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { extractVideoFrames, fileToCompressedDataUrl } from "@/utils/extractVideoFrames";
import { generateInspectionReportPDF } from "@/utils/visualAnalysisPdfReport";
import { VideoPoseViewer } from "@/components/dashboard/VideoPoseViewer";
import type { PoseFrame } from "@/utils/poseAngles";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import {
  FlagSelector, FlagBadge, FlagFilterBar, type InspectionFlag,
} from "@/components/dashboard/inspection/FlagSelector";
import { PedigreePdfViewer } from "@/components/dashboard/inspection/PedigreePdfViewer";
import {
  PedigreeIntelligencePanel, type PedigreeResearch,
} from "@/components/dashboard/inspection/PedigreeIntelligencePanel";
import { MarketRoiPanel } from "@/components/dashboard/inspection/MarketRoiPanel";
import { buildMarketRoiFromScore } from "@/utils/inspectionMarketRoi";
import { InspectionScoreDashboard } from "@/components/dashboard/inspection/InspectionScoreDashboard";

const HORSE_CATEGORIES = [
  { value: "FOAL", label: "Foal (0–12 months)" },
  { value: "YEARLING", label: "Yearling (12–24 months, pre-sale)" },
  { value: "FLAT_IN_TRAINING", label: "Flat horse — in training" },
  { value: "NH_STORE_YOUNG", label: "National Hunt — store/young (unraced)" },
  { value: "NH_IN_TRAINING", label: "National Hunt — in training" },
  { value: "BROODMARE_STALLION", label: "Broodmare / Stallion" },
];

const MEDIA_PURPOSES = [
  { value: "STATIC_CONFORMATION", label: "Static Conformation (photos)" },
  { value: "GAIT_WALK", label: "Gait — Walk (video)" },
  { value: "GAIT_TROT", label: "Gait — Trot (video)" },
  { value: "BREEZE_UP", label: "Breeze-Up (2YO breeze video)" },
  { value: "HOOF_DETAIL", label: "Hoof Detail (photos of 4 hooves)" },
  { value: "MUSCULATURE", label: "Musculature & Condition (photos)" },
  { value: "FULL_BODY_VIDEO", label: "Full Body Video" },
];

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "—";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Acceptable — attention points";
  if (score >= 40) return "Significant deviations";
  return "Major structural concerns";
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

type Analysis = {
  id: string; horse_name: string; lot_ref: string | null; sale_context: string | null;
  horse_category: string; consolidated_score: number | null; created_at: string;
  pedigree_pdf_url?: string | null;
  pedigree_pdf_name?: string | null;
  pedigree_insight?: string | null;
  pedigree_generated_at?: string | null;
  flag?: InspectionFlag | null;
  pedigree_meta?: any;
  pedigree_research?: PedigreeResearch | null;
  pedigree_annotations?: Record<string, string> | null;
  market_estimate?: any;
  roi_projection?: any;
  buyer_notes?: string | null;
};
type Block = {
  id: string; analysis_id: string; media_purpose: string; block_score: number | null;
  score_breakdown: any; measurements_json: any; attention_points: string[] | null;
  observations: string | null; bloodstock_insight: string | null; created_at: string;
  file_urls: string[] | null;
  biomechanics_image_url?: string | null;
};

export const DashboardVisualAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const access = useFeatureAccess();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [horseName, setHorseName] = useState("");
  const [lotRef, setLotRef] = useState("");
  const [saleContext, setSaleContext] = useState("");
  const [category, setCategory] = useState<string>("");

  const [mediaPurpose, setMediaPurpose] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [pedigreeFile, setPedigreeFile] = useState<File | null>(null);
  const [pedigreeSubmitting, setPedigreeSubmitting] = useState(false);
  const [researchSubmitting, setResearchSubmitting] = useState(false);
  const [flagFilter, setFlagFilter] = useState<InspectionFlag | "all">("all");
  const [buyerNotesDraft, setBuyerNotesDraft] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Per-block interactive pose-viewer state (in-memory only)
  const [poseByBlock, setPoseByBlock] = useState<Record<string, PoseFrame[]>>({});
  const [poseLoadingBlock, setPoseLoadingBlock] = useState<string | null>(null);
  // Frames captured during the latest upload — auto-attached to the new block
  const lastUploadFramesRef = useRef<string[] | null>(null);

  // Per-block collapse state (hidden from view but kept in memory)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  // Mobile sidebar (analyses list) toggle
  const [showListMobile, setShowListMobile] = useState(false);
  // Collapse the active analysis detail (add material + pedigree + blocks)
  const [detailCollapsed, setDetailCollapsed] = useState(false);

  // Final consolidated bloodstock conclusion (in-memory)
  const [conclusionByAnalysis, setConclusionByAnalysis] = useState<Record<string, string>>({});
  const [conclusionLoading, setConclusionLoading] = useState(false);

  const toggleBlock = (id: string) =>
    setCollapsedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  const collapseAll = () =>
    setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])));
  const expandAll = () => setCollapsedBlocks({});

  const active = useMemo(() => analyses.find(a => a.id === activeId) || null, [analyses, activeId]);

  useEffect(() => { setBuyerNotesDraft(active?.buyer_notes || ""); }, [active?.id]);

  const filteredAnalyses = useMemo(() => {
    if (flagFilter === "all") return analyses;
    return analyses.filter(a => (a.flag || "none") === flagFilter);
  }, [analyses, flagFilter]);

  const flagCounts = useMemo(() => {
    const c: Record<string, number> = { all: analyses.length };
    for (const a of analyses) {
      const f = a.flag || "none";
      c[f] = (c[f] || 0) + 1;
    }
    return c;
  }, [analyses]);

  const marketRoi = useMemo(
    () => (active ? buildMarketRoiFromScore(
      active.consolidated_score,
      active.horse_category,
      typeof (active as any).pedigree_research?.pedigree_rating === "number"
        ? (active as any).pedigree_research.pedigree_rating
        : null,
      (active as any).pedigree_research || null,
      blocks,
    ) : null),
    [active?.id, active?.consolidated_score, active?.horse_category, (active as any)?.pedigree_research, blocks],
  );

  useEffect(() => {
    if (!user) return;
    void loadAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (activeId) void loadBlocks(activeId);
    else setBlocks([]);
  }, [activeId]);

  async function loadAnalyses() {
    const { data, error } = await (supabase as any)
      .from("inspection_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const list = (data || []) as Analysis[];
    setAnalyses(list);
    if (list.length && !activeId) setActiveId(list[0].id);
  }

  async function loadBlocks(id: string) {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("inspection_blocks")
      .select("*")
      .eq("analysis_id", id)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) { console.error(error); return; }
    setBlocks((data || []) as Block[]);
  }

  async function handleCreate() {
    if (!access.canVisualAnalysis) { setShowUpgrade(true); return; }
    if (!horseName.trim() || !category) {
      toast({ title: "Missing fields", description: "Horse name and category are required.", variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any).from("inspection_analyses").insert({
      user_id: user!.id,
      horse_name: horseName.trim(),
      lot_ref: lotRef.trim() || null,
      sale_context: saleContext.trim() || null,
      horse_category: category,
    }).select().single();
    if (error) { toast({ title: "Failed to create", description: error.message, variant: "destructive" }); return; }
    setAnalyses(prev => [data as Analysis, ...prev]);
    setActiveId(data.id);
    setCreating(false);
    setHorseName(""); setLotRef(""); setSaleContext(""); setCategory("");
  }

  async function handleAnalyze() {
    if (!active) return;
    if (!access.canVisualAnalysis) { setShowUpgrade(true); return; }
    if (!mediaPurpose) { toast({ title: "Select a Media Purpose", variant: "destructive" }); return; }
    if (files.length === 0) { toast({ title: "Add at least one file", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const images: string[] = [];
      let hadVideo = false;
      for (const f of files) {
        const isVideo = f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(f.name);
        if (isVideo) {
          hadVideo = true;
          const frames = await extractVideoFrames(f, [0, 0.15, 0.3, 0.5, 0.7, 0.9]);
          images.push(...frames);
        } else {
          images.push(await fileToCompressedDataUrl(f, 1280, 0.85));
        }
      }
      const capped = images.slice(0, 8);
      lastUploadFramesRef.current = hadVideo ? capped : null;

      const { data, error } = await supabase.functions.invoke("inspection-analysis", {
        body: {
          analysis_id: active.id,
          horse_name: active.horse_name,
          lot_ref: active.lot_ref,
          sale_context: active.sale_context,
          horse_category: active.horse_category,
          media_purpose: mediaPurpose,
          images: capped,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Analysis added", description: "New result block appended." });
      setFiles([]);
      setMediaPurpose("");
      await loadBlocks(active.id);
      await loadAnalyses();

      // Kick off motion mapping for the newest block, if a video was uploaded
      if (lastUploadFramesRef.current?.length) {
        // newest block = first sorted ascending → last in list
        const { data: fresh } = await (supabase as any)
          .from("inspection_blocks").select("id").eq("analysis_id", active.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const newId = (fresh as any)?.id;
        if (newId) void runMotionMapping(newId, lastUploadFramesRef.current);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function runMotionMapping(blockId: string, frames: string[]) {
    setPoseLoadingBlock(blockId);
    try {
      const { data, error } = await supabase.functions.invoke("video-pose-frames", {
        body: { frames, fps: 6 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const out = ((data as any).frames || []) as PoseFrame[];
      setPoseByBlock(prev => ({ ...prev, [blockId]: out }));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Motion mapping failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setPoseLoadingBlock(null);
    }
  }

  /** For retroactive use on existing video blocks: re-extracts frames from the
   *  stored file_urls (signed) and feeds them into video-pose-frames. */
  async function runMotionMappingFromUrls(blockId: string, urls: string[]) {
    setPoseLoadingBlock(blockId);
    try {
      // Convert each URL/blob to a data URL via canvas so we send compressed JPEGs.
      const frames: string[] = [];
      for (const url of urls.slice(0, 12)) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          if (blob.type.startsWith("video/")) {
            // Build a temporary <video> and pull frames
            const file = new File([blob], "clip.mp4", { type: blob.type });
            const got = await extractVideoFrames(file, [0, 0.15, 0.3, 0.5, 0.7, 0.9]);
            frames.push(...got);
          } else if (blob.type.startsWith("image/")) {
            const dataUrl: string = await new Promise((res2, rej) => {
              const r = new FileReader();
              r.onload = () => res2(String(r.result)); r.onerror = rej; r.readAsDataURL(blob);
            });
            frames.push(dataUrl);
          }
        } catch { /* skip broken url */ }
        if (frames.length >= 12) break;
      }
      if (frames.length === 0) throw new Error("No frames could be extracted from this block's media.");
      await runMotionMapping(blockId, frames);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Motion mapping failed", description: e?.message || "Unknown error", variant: "destructive" });
      setPoseLoadingBlock(null);
    }
  }

  async function handleDeleteAnalysis(id: string) {
    if (!confirm("Delete this analysis and all its result blocks?")) return;
    const { error } = await (supabase as any).from("inspection_analyses").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function updateActive(patch: Partial<Analysis>) {
    if (!active) return;
    const { error } = await (supabase as any)
      .from("inspection_analyses").update(patch).eq("id", active.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setAnalyses(prev => prev.map(a => a.id === active.id ? { ...a, ...patch } : a));
  }

  async function handleSetFlag(next: InspectionFlag) {
    await updateActive({ flag: next });
  }

  async function handleSaveAnnotations(next: Record<string, string>) {
    if (!active) throw new Error("No active inspection selected");
    const { error } = await (supabase as any)
      .from("inspection_analyses")
      .update({ pedigree_annotations: next })
      .eq("id", active.id);
    if (error) throw error;
    setAnalyses(prev => prev.map(a => a.id === active.id ? { ...a, pedigree_annotations: next } : a));
  }

  async function handleSaveBuyerNotes() {
    setSavingNotes(true);
    try {
      await updateActive({ buyer_notes: buyerNotesDraft });
      toast({ title: "Buyer notes saved" });
    } finally { setSavingNotes(false); }
  }

  function buildConclusion(): string {
    if (!active) return "";
    const lines: string[] = [];
    const horse = active.horse_name || "Subject";
    const cat = HORSE_CATEGORIES.find(c => c.value === active.horse_category)?.label || active.horse_category;
    lines.push(`BLOODSTOCK INSIGHT — CONCLUSION`);
    lines.push(`Horse: ${horse}${active.lot_ref ? ` · Lot ${active.lot_ref}` : ""}`);
    lines.push(`Category: ${cat}`);
    if (active.sale_context) lines.push(`Sale context: ${active.sale_context}`);
    lines.push("");
    // Inspection blocks summary
    if (blocks.length) {
      const avg = Math.round(
        blocks.reduce((s, b) => s + (b.block_score || 0), 0) / blocks.length
      );
      lines.push(`Inspection coverage: ${blocks.length} block(s) · average score ${avg}/100 (${scoreLabel(avg)})`);
      for (const b of blocks) {
        const label = MEDIA_PURPOSES.find(p => p.value === b.media_purpose)?.label || b.media_purpose;
        lines.push(`  • ${label}: ${b.block_score ?? "—"}/100`);
        if (b.attention_points?.length) lines.push(`     Attention: ${b.attention_points.slice(0, 3).join("; ")}`);
      }
    } else {
      lines.push(`Inspection coverage: no uploads yet.`);
    }
    lines.push("");
    // Pedigree
    const pr: any = active.pedigree_research || null;
    if (pr) {
      const rating = typeof pr.pedigree_rating === "number" ? `${pr.pedigree_rating}/10` : "—";
      lines.push(`Pedigree rating: ${rating}`);
      if (pr.sire?.name) lines.push(`  Sire: ${pr.sire.name}${pr.sire?.commercial?.fee?.value ? ` · fee ${pr.sire.commercial.fee.value}` : ""}`);
      if (pr.dam?.name) lines.push(`  Dam: ${pr.dam.name}${pr.dam?.produce_record?.black_type?.value ? ` · BT produce ${pr.dam.produce_record.black_type.value}` : ""}`);
      if (pr.summary) lines.push(`  ${pr.summary}`);
    } else if (active.pedigree_pdf_url) {
      lines.push(`Pedigree: PDF uploaded — run Pedigree Research to deepen the analysis.`);
    } else {
      lines.push(`Pedigree: not yet uploaded.`);
    }
    lines.push("");
    // Market / future
    if (marketRoi) {
      lines.push(`Market estimate: ${marketRoi.market.median.range} (base) — confidence ${marketRoi.market.confidence.toUpperCase()}`);
      if (marketRoi.future) {
        const f = marketRoi.future;
        lines.push(`Racing projection: G1 ${f.g1_pct.toFixed(1)}% · G2 ${f.g2_pct.toFixed(1)}% · G3 ${f.g3_pct.toFixed(1)}% · BT ${f.black_type_pct.toFixed(1)}% · Winner ${f.winner_pct.toFixed(1)}%`);
        lines.push(`Projected lifetime earnings: ${f.lifetime_low} – ${f.lifetime_high}`);
        lines.push(`Verdict: ${f.verdict}`);
      }
    }
    if (active.buyer_notes) {
      lines.push("");
      lines.push(`Buyer notes: ${active.buyer_notes}`);
    }
    return lines.join("\n");
  }

  async function handleGenerateConclusion() {
    if (!active) return;
    setConclusionLoading(true);
    try {
      const text = buildConclusion();
      setConclusionByAnalysis(prev => ({ ...prev, [active.id]: text }));
      toast({ title: "Bloodstock conclusion ready" });
    } finally {
      setConclusionLoading(false);
    }
  }

  async function handleRunPedigreeResearch() {
    if (!active) return;
    if (!access.canVisualAnalysis) { setShowUpgrade(true); return; }
    const meta = active.pedigree_meta || {};
    if (!meta.sire && !meta.dam && !meta.horse_name) {
      const sire = window.prompt("Sire name?", "");
      const dam = window.prompt("Dam name?", "");
      const damsire = window.prompt("Damsire (optional)?", "") || undefined;
      if (!sire && !dam) return;
      Object.assign(meta, { sire, dam, damsire, horse_name: active.horse_name });
    }
    setResearchSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("inspection-pedigree-research", {
        body: { analysis_id: active.id, meta },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Pedigree intelligence ready" });
      await loadAnalyses();
    } catch (e: any) {
      toast({ title: "Research failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally { setResearchSubmitting(false); }
  }

  async function handleDownloadPDF() {
    if (!active) return;
    if (!access.canDownloadPDF) { setShowUpgrade(true); return; }
    try {
      const pedigreeResearch = (active as any).pedigree_research || null;
      const pr = pedigreeResearch?.pedigree_rating;
      await generateInspectionReportPDF({
        analysis: active,
        blocks,
        pedigreeResearch,
        marketRoi: marketRoi || null,
        conclusion: conclusionByAnalysis[active.id] || null,
        bloodstockScore: active.consolidated_score ?? null,
        pedigreeRating: typeof pr === "number" ? pr.toFixed(1) : null,
      });
    } catch (e: any) {
      toast({ title: "PDF failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function handlePedigreeAnalyze() {
    if (!active) return;
    if (!access.canVisualAnalysis) { setShowUpgrade(true); return; }
    if (!pedigreeFile) { toast({ title: "Select a pedigree PDF first", variant: "destructive" }); return; }
    if (!/\.pdf$/i.test(pedigreeFile.name)) { toast({ title: "PDF only", variant: "destructive" }); return; }
    if (pedigreeFile.size > 15 * 1024 * 1024) { toast({ title: "PDF too large (max 15MB)", variant: "destructive" }); return; }
    setPedigreeSubmitting(true);
    try {
      const b64 = await fileToBase64(pedigreeFile);
      const { data, error } = await supabase.functions.invoke("inspection-pedigree-insight", {
        body: { analysis_id: active.id, pedigree_pdf_base64: b64, pedigree_pdf_name: pedigreeFile.name },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Pedigree cross-insight ready" });
      setPedigreeFile(null);
      await loadAnalyses();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Pedigree analysis failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setPedigreeSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Sale Inspection Analysis</CardTitle>
            <CardDescription>
              Multi-upload computer-vision assessment. Pick a horse category, add photos/videos by purpose, and stack result blocks over time.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(v => !v)} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> New analysis
          </Button>
        </CardHeader>
        {creating && (
          <CardContent className="space-y-3 border-t pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Horse name / Lot</Label>
                <Input value={horseName} onChange={e => setHorseName(e.target.value)} placeholder="e.g. Lot 145 — Frankel × Galileo filly" />
              </div>
              <div>
                <Label>Lot reference (optional)</Label>
                <Input value={lotRef} onChange={e => setLotRef(e.target.value)} placeholder="Sale catalogue lot #" />
              </div>
              <div className="sm:col-span-2">
                <Label>Sale / context (optional)</Label>
                <Input value={saleContext} onChange={e => setSaleContext(e.target.value)} placeholder="e.g. Goffs October Yearling 2026" />
              </div>
              <div className="sm:col-span-2">
                <Label>Horse category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category (locks the analysis context)" /></SelectTrigger>
                  <SelectContent>
                    {HORSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mobile: toggle for analyses list */}
      <div className="lg:hidden flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowListMobile(v => !v)} className="w-full">
          <ListFilter className="w-4 h-4 mr-2" />
          {showListMobile ? "Hide" : "Show"} your analyses ({analyses.length})
        </Button>
      </div>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
        <Card className={`h-fit ${showListMobile ? "block" : "hidden"} lg:block`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Your analyses</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-2 max-h-[60vh] lg:max-h-[70vh] overflow-auto">
            <FlagFilterBar value={flagFilter} counts={flagCounts as any} onChange={setFlagFilter} />
            {filteredAnalyses.length === 0 && <p className="text-xs text-muted-foreground p-2">No analyses match this filter.</p>}
            {filteredAnalyses.map(a => (
              <button
                key={a.id}
                onClick={() => { setActiveId(a.id); setShowListMobile(false); }}
                className={`w-full text-left p-2 rounded-md text-sm transition ${activeId === a.id ? "bg-secondary/15 border border-secondary/40" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-medium truncate flex-1">{a.horse_name}</div>
                  {a.flag && a.flag !== "none" && <FlagBadge flag={a.flag as InspectionFlag} />}
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>{HORSE_CATEGORIES.find(c => c.value === a.horse_category)?.label?.split(" ")[0] ?? "—"}</span>
                  <span className={scoreColor(a.consolidated_score)}>
                    {a.consolidated_score != null ? `${Math.round(a.consolidated_score)}/100` : "—"}
                  </span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4 min-w-0">
          {!active ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Select or create an analysis to begin.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{active.horse_name}</CardTitle>
                    <CardDescription>
                      {HORSE_CATEGORIES.find(c => c.value === active.horse_category)?.label}
                      {active.sale_context ? ` · ${active.sale_context}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <FlagSelector value={(active.flag || "none") as InspectionFlag} onChange={handleSetFlag} />
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={blocks.length === 0}>
                      <FileDown className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailCollapsed(v => !v)}
                      title={detailCollapsed ? "Expand analysis" : "Collapse analysis"}
                    >
                      {detailCollapsed
                        ? <><ChevronDown className="w-4 h-4 mr-1" /> Expand</>
                        : <><ChevronUp className="w-4 h-4 mr-1" /> Collapse</>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAnalysis(active.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                {!detailCollapsed && (
                <CardContent className="space-y-4">
                  <InspectionScoreDashboard
                    consolidatedScore={active.consolidated_score}
                    blocks={blocks as any}
                    pedigreeSummary={(active as any).pedigree_summary || null}
                    pedigreeResearch={active.pedigree_research || null}
                    marketEstimate={(active as any).market_estimate || null}
                    hasPedigreeInsight={!!active.pedigree_insight}
                  />
                  <div className="text-xs text-muted-foreground">
                    {blocks.length} result block{blocks.length === 1 ? "" : "s"} · Score & charts recalculate on every upload and update automatically when a pedigree PDF is cross-referenced.
                  </div>
                </CardContent>
                )}
              </Card>

              {!detailCollapsed && (
              <>
              {/* Pedigree PDF Viewer card with annotations */}
              {active.pedigree_pdf_url && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pedigree PDF</CardTitle>
                    <CardDescription>Open full screen to zoom, pinch and annotate (Apple Pencil supported).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-[280px]">
                      <PedigreePdfViewer
                        url={active.pedigree_pdf_url}
                        fileName={active.pedigree_pdf_name}
                        annotations={active.pedigree_annotations || {}}
                        onSaveAnnotations={handleSaveAnnotations}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Premium accordion — Pedigree Intelligence + Market & ROI + Buyer Notes */}
              <Card>
                <CardContent className="p-0">
                  <Accordion type="multiple" defaultValue={["intel", "market"]} className="w-full">
                    <AccordionItem value="intel" className="border-b">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          Pedigree Intelligence
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3">
                        <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <Label className="text-xs font-semibold">Step 1 — Upload Pedigree PDF</Label>
                              <p className="text-[11px] text-muted-foreground">Upload the official pedigree PDF first — it is cross-referenced with every inspection block.</p>
                            </div>
                            {active.pedigree_pdf_url && (
                              <a href={active.pedigree_pdf_url} target="_blank" rel="noreferrer" className="text-xs underline inline-flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {active.pedigree_pdf_name || "Current PDF"}
                              </a>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(e) => setPedigreeFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm border rounded-md p-2 bg-background"
                          />
                          {pedigreeFile && <p className="text-xs text-muted-foreground">{pedigreeFile.name}</p>}
                          <Button size="sm" onClick={handlePedigreeAnalyze} disabled={pedigreeSubmitting || !pedigreeFile} className="w-full">
                            {pedigreeSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cross-analyzing pedigree…</> : <>Upload & Generate Pedigree × Inspection Insight</>}
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Step 2 —</span> Deep sire, dam, damsire, sibling and black-type research from approved bloodstock sources.
                          </p>
                          <Button size="sm" variant="outline" onClick={handleRunPedigreeResearch} disabled={researchSubmitting || !active.pedigree_pdf_url}>
                            {researchSubmitting
                              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Researching…</>
                              : <>Run Pedigree Research</>}
                          </Button>
                        </div>
                        <div className="max-h-[60vh] overflow-auto pr-1">
                          <PedigreeIntelligencePanel data={active.pedigree_research} />
                        </div>
                        {active.pedigree_insight && (
                          <div className="border-t pt-3 space-y-2">
                            <div className="text-xs text-muted-foreground">
                              Cross-insight generated {active.pedigree_generated_at ? new Date(active.pedigree_generated_at).toLocaleString("en-GB") : ""}
                            </div>
                            <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3 leading-relaxed max-h-[420px] overflow-auto">
                              {active.pedigree_insight}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="market" className="border-b">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Activity className="w-4 h-4 text-secondary" /> Market Estimate & ROI Projection
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {blocks.length === 0 && !active.pedigree_research && !active.pedigree_pdf_url ? (
                          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground space-y-2">
                            <div className="font-semibold text-foreground">Market valuation locked</div>
                            <p>
                              Upload the pedigree PDF <span className="font-medium">or</span> at least one conformation / breeze upload to unlock the initial
                              market estimate. Add more material and the valuation refines automatically.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs pt-1">
                              <span className={`px-2 py-1 rounded-full border ${blocks.length > 0 ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-muted border-border"}`}>
                                {blocks.length > 0 ? "✓" : "•"} Inspection upload
                              </span>
                              <span className={`px-2 py-1 rounded-full border ${(active.pedigree_pdf_url || active.pedigree_research) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-muted border-border"}`}>
                                {(active.pedigree_pdf_url || active.pedigree_research) ? "✓" : "•"} Pedigree PDF
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(!blocks.length || !active.pedigree_research) && (
                              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-[11px] px-3 py-2">
                                Preliminary estimate — refines automatically as you add{" "}
                                {!blocks.length ? "inspection uploads" : null}
                                {!blocks.length && !active.pedigree_research ? " and " : null}
                                {!active.pedigree_research ? "pedigree research" : null}.
                              </div>
                            )}
                            <MarketRoiPanel data={marketRoi} />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="notes" className="border-b">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <FileText className="w-4 h-4 text-secondary" /> Buyer Notes
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-2">
                        <Textarea
                          value={buyerNotesDraft}
                          onChange={(e) => setBuyerNotesDraft(e.target.value)}
                          rows={5}
                          placeholder="Private buyer notes — temperament, walk, vet checks, target price…"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleSaveBuyerNotes} disabled={savingNotes}>
                            {savingNotes ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : "Save notes"}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">+ Add material</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Media purpose *</Label>
                    <Select value={mediaPurpose} onValueChange={setMediaPurpose}>
                      <SelectTrigger><SelectValue placeholder="What kind of media are you uploading?" /></SelectTrigger>
                      <SelectContent>
                        {MEDIA_PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Upload photo(s) or video</Label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      className="block w-full text-sm border rounded-md p-2 bg-background"
                    />
                    {files.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected.</p>
                    )}
                  </div>
                  <Button onClick={handleAnalyze} disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</> : <><Upload className="w-4 h-4 mr-2" />Analyze</>}
                  </Button>
                </CardContent>
              </Card>

              {loading && <Card><CardContent className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></CardContent></Card>}

              {!loading && blocks.length === 0 && (
                <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No result blocks yet. Add your first upload above.</CardContent></Card>
              )}
              {blocks.length > 1 && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="text-xs text-muted-foreground">
                    {blocks.length} analyses · {blocks.filter(b => collapsedBlocks[b.id]).length} hidden
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={collapseAll}>
                      <EyeOff className="w-3.5 h-3.5 mr-1" /> Collapse all
                    </Button>
                    <Button variant="ghost" size="sm" onClick={expandAll}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Expand all
                    </Button>
                  </div>
                </div>
              )}
              {blocks.map((b, idx) => {
                const isCollapsed = !!collapsedBlocks[b.id];
                return (
                <Card key={b.id} className="transition-shadow hover:shadow-sm">
                  <CardHeader
                    className="pb-2 cursor-pointer select-none"
                    onClick={() => toggleBlock(b.id)}
                  >
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="truncate">#{idx + 1} · {MEDIA_PURPOSES.find(p => p.value === b.media_purpose)?.label || b.media_purpose}</span>
                        </CardTitle>
                        <CardDescription className="text-[11px] sm:text-xs ml-6">
                          {new Date(b.created_at).toLocaleString("en-GB")}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`${scoreColor(b.block_score)} shrink-0`}>
                        {b.block_score ?? "—"}/100 · {scoreLabel(b.block_score)}
                      </Badge>
                    </div>
                  </CardHeader>
                  {!isCollapsed && (
                  <CardContent className="space-y-3 text-sm">
                    {b.biomechanics_image_url && (
                      <div>
                        <div className="font-semibold mb-2">Biomechanics map (AI-generated)</div>
                        <a href={b.biomechanics_image_url} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={b.biomechanics_image_url}
                            alt="Biomechanics overlay"
                            className="w-full rounded-lg border bg-black"
                            loading="lazy"
                          />
                        </a>
                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Excellent</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Good</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Needs attention</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Refer to vet/farrier</span>
                        </div>
                      </div>
                    )}
                    {Array.isArray(b.measurements_json) && b.measurements_json.length > 0 && (
                      <div>
                        <div className="font-semibold mb-1">Estimated measurements & angles</div>
                        <ul className="space-y-1">
                          {b.measurements_json.map((m: any, i: number) => (
                            <li key={i} className="text-xs flex justify-between gap-2 border-b py-1">
                              <span className="text-muted-foreground">{m.label}</span>
                              <span><strong>{m.value}</strong> <span className="text-muted-foreground">— {m.classification}</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(b.attention_points) && b.attention_points.length > 0 && (
                      <div>
                        <div className="font-semibold mb-1">Attention points</div>
                        <ul className="list-disc pl-5 space-y-1 text-xs max-h-56 overflow-auto pr-1 rounded-md bg-muted/30 p-2 border">
                          {b.attention_points.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {b.observations && (
                      <div>
                        <div className="font-semibold mb-1">Observations</div>
                        <div className="text-xs whitespace-pre-line max-h-56 overflow-auto pr-1 rounded-md bg-muted/30 p-2 border leading-relaxed">{b.observations}</div>
                      </div>
                    )}
                    {b.bloodstock_insight && (
                      <div className="border-l-2 border-secondary pl-3">
                        <div className="font-semibold mb-1">Bloodstock Insight</div>
                        <div className="text-xs whitespace-pre-line max-h-56 overflow-auto pr-1 leading-relaxed">{b.bloodstock_insight}</div>
                      </div>
                    )}

                    {/* Interactive video pose mapping */}
                    {poseByBlock[b.id]?.length ? (
                      <VideoPoseViewer frames={poseByBlock[b.id]} title="Interactive Motion Mapping" />
                    ) : (
                      <div className="border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={poseLoadingBlock === b.id || !(b.file_urls && b.file_urls.length > 0)}
                          onClick={() => runMotionMappingFromUrls(b.id, b.file_urls || [])}
                        >
                          {poseLoadingBlock === b.id
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mapping motion…</>
                            : <><Activity className="w-4 h-4 mr-2" />Generate interactive motion map</>}
                        </Button>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Builds a frame-by-frame skeleton, joint-angle charts and frame comparison from the existing BloodstockAI analysis — no calculations are re-run.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  )}
                </Card>
              );})}
              {active && (blocks.length > 0 || active.pedigree_research || active.pedigree_pdf_url) && (
                <Card className="border-secondary/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-secondary" /> Bloodstock Insight — Final Conclusion
                    </CardTitle>
                    <CardDescription>
                      Aggregates every inspection block, pedigree research and market estimate for this lot into one decision summary.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={handleGenerateConclusion} disabled={conclusionLoading} className="w-full sm:w-auto">
                      {conclusionLoading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building conclusion…</>
                        : <><FileText className="w-4 h-4 mr-2" />Generate Bloodstock Conclusion</>}
                    </Button>
                    {conclusionByAnalysis[active.id] && (
                      <div className="rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-line leading-relaxed max-h-[480px] overflow-auto">
                        {conclusionByAnalysis[active.id]}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardVisualAnalysis;