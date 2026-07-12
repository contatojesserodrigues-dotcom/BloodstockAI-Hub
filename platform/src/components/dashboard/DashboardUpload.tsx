import { useState, useCallback } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { PDFDownloadGuard } from "@/components/PDFDownloadGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Loader2, CheckCircle, XCircle, Download, Trash2, ChevronDown, ChevronUp, Image, X, Search, Star, Filter, SortAsc, Plus, BookmarkPlus, BookmarkCheck, FileDown, Baby, Rabbit, Sparkles, Flag, Trophy, Activity, Mountain, Wheat, Heart, FileIcon, Video, Gauge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { downloadCatalogLotPDF } from "@/utils/catalogPdfReport";
import { usePDFUpload, usePDFUploads, useFileUrl, useDeleteUpload } from "@/integrations/supabase/hooks/usePDFUpload";
import * as pdfjsLib from "pdfjs-dist";
import { extractVideoFrames, fileToCompressedDataUrl } from "@/utils/extractVideoFrames";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
import { useQueryClient } from "@tanstack/react-query";
import { CatalogAnalysisView } from "./CatalogAnalysisView";
import { AnalysisProcessingPanel } from "./AnalysisProcessingPanel";
import { HorsePDFComparisonView } from "./HorsePDFComparisonView";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ExtraCatalogueModal } from "@/components/ExtraCatalogueModal";

import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";



/* ── Constants ── */
const OBJECTIVES = [
  { id: "racing", label: "Racing", desc: "Looking for future racehorse" },
  { id: "breeding", label: "Breeding", desc: "Broodmare or stallion prospect" },
  { id: "investment", label: "Investment", desc: "Resale value and appreciation" },
  { id: "allrounder", label: "All-rounder", desc: "Open to any potential" },
];

const BUDGETS = [
  { id: "under50k", label: "Under $50,000" },
  { id: "50k-150k", label: "$50,000 — $150,000" },
  { id: "150k-500k", label: "$150,000 — $500,000" },
  { id: "500k+", label: "$500,000+" },
  { id: "nolimit", label: "No budget limit" },
];

const AGE_GROUPS = [
  { id: "foals", label: "Foals" },
  { id: "yearlings", label: "Yearlings" },
  { id: "2yo", label: "2-year-olds" },
  { id: "training", label: "Horses in training" },
  { id: "broodmares", label: "Broodmares" },
  { id: "any", label: "Any age" },
];

// Mandatory horse-type selector — passed to the analysis backend.
const HORSE_TYPES: Array<{ id: string; icon?: LucideIcon; label: string }> = [
  { id: "foal",           label: "Foal" },
  { id: "weanling",       label: "Weanling" },
  { id: "yearling",       label: "Yearling" },
  { id: "2yo_breeze",     label: "2YO / Breeze-Up" },
  { id: "3yo_flat",       label: "3YO (National Hunt)" },
  { id: "hit",            label: "Horse in Training" },
  { id: "national_hunt",  label: "National Hunt" },
  { id: "point_to_point", label: "Point to Point" },
  { id: "broodmare",      label: "Broodmare" },
];

const SALE_CONTEXTS: Array<{ id: string; label: string }> = [
  { id: "at_auction",      label: "At Auction" },
  { id: "pre_sale",        label: "Pre-Sale" },
  { id: "post_sale",       label: "Post-Sale" },
  { id: "private_treaty",  label: "Private Treaty" },
];

// Analysis-mode selector — controls which Claude pipelines run.
type AnalysisMode = "pdf_only" | "pdf_biomech" | "pdf_breeze";
const ANALYSIS_MODES: Array<{ id: AnalysisMode; icon: LucideIcon; label: string; desc: string }> = [
  { id: "pdf_only",     icon: FileIcon, label: "PDF Only",                 desc: "Pedigree & market analysis only" },
  { id: "pdf_biomech",  icon: Video,    label: "PDF + Biomech & Conformation", desc: "Upload photos or video for a full conformation score" },
  { id: "pdf_breeze",   icon: Gauge,    label: "PDF + Breeze-Up Analysis", desc: "Upload breeze video or time data for complete BU assessment" },
];
const BREEZE_GOINGS = ["Firm", "Good to Firm", "Good", "Good to Soft", "Soft", "Heavy"];
const BREEZE_DISTANCES = ["2f", "3f", "4f"];

export const DashboardUpload = () => {
  const [activeMode, setActiveMode] = useState<"catalog" | "comparison">("catalog");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showExtraCatalogue, setShowExtraCatalogue] = useState(false);

  // ── Catalog mode state ──
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [ageGroup, setAgeGroup] = useState<string[]>([]);
  const [expandedUploads, setExpandedUploads] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [catalogUploadBusy, setCatalogUploadBusy] = useState(false);
  const [horseType, setHorseType] = useState<string>("");
  const [saleContext, setSaleContext] = useState<string>("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("pdf_only");
  const [visionImages, setVisionImages] = useState<File[]>([]);
  const [visionVideo, setVisionVideo] = useState<File | null>(null);
  const [breezeForm, setBreezeForm] = useState<{ furlong_time: string; distance: string; going: string; track: string }>({
    furlong_time: "", distance: "2f", going: "Good", track: "",
  });
  const [visionStage, setVisionStage] = useState<string | null>(null);

  // ── Comparison mode state ──
  const [comparisonFiles, setComparisonFiles] = useState<Array<{ file: File; name: string }>>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparingPDFs, setComparingPDFs] = useState(false);
  const [compProgress, setCompProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [pdfGuardOpen, setPdfGuardOpen] = useState(false);

  const { user } = useAuth();
  const { uploadPDF } = usePDFUpload();
  const { data: uploads, isLoading } = usePDFUploads(user?.id);
  const { getFileUrl } = useFileUrl();
  const { deleteUpload } = useDeleteUpload();
  const { isPaidPlan } = useCredits();
  const access = useFeatureAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { gate, paywallOpen, setPaywallOpen, paywallType } = usePaywall();
  // ── Catalog upload handlers ──
  const handleCatalogDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setCatalogFile(e.dataTransfer.files[0]);
  };

  // Size threshold: files above this go through chunked processing
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
  const PAGES_PER_BATCH = 20; // 20 pages per batch

  const PRO_CATALOGUE_LIMIT_MONTHLY = 2;

  const handleCatalogUpload = async () => {
    if (!catalogFile) return;
    if (gate("catalogue")) return;

    if (!horseType) {
      toast({
        title: "Select horse type",
        description: "Please tell us what you are analysing before submitting the PDF.",
        variant: "destructive",
      });
      return;
    }

    if (analysisMode === "pdf_biomech" && visionImages.length === 0 && !visionVideo) {
      toast({ title: "Add photos or video", description: "Biomechanics analysis needs at least one image or a movement video.", variant: "destructive" });
      return;
    }
    if (analysisMode === "pdf_breeze" && !visionVideo && !breezeForm.furlong_time) {
      toast({ title: "Add breeze video or time", description: "Provide a breeze video or a furlong time so we can assess the run.", variant: "destructive" });
      return;
    }

    // Block non-PRO users from uploading auction catalogs
    if (!access.canUploadCatalogue) {
      toast({
        title: "Upload Not Available",
        description: "PDF Upload & Analysis is available on the Pro Plan ($399/mo). Your plan supports limited uploads only.",
        variant: "destructive",
      });
      setShowUpgrade(true);
      return;
    }

    // Pro plan: limit to 2 catalogue uploads per month
    if (access.plan === "pro" && user?.id) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count, error } = await supabase
        .from("user_catalog_access")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("accessed_at", monthStart);

      if (!error && (count ?? 0) >= PRO_CATALOGUE_LIMIT_MONTHLY) {
        setShowExtraCatalogue(true);
        return;
      }
    }


    // Route large files through chunked pipeline
    if (catalogFile.size > LARGE_FILE_THRESHOLD) {
      await handleLargeCatalogUpload();
      return;
    }

    // Small files: existing flow
    setCatalogUploadBusy(true);
    setUploadProgress({ stage: "📄 Uploading catalog...", percent: 10 });
    try {
      const objectiveStr = objectives.join(", ") || "general";
      const budgetStr = BUDGETS.find(b => b.id === budget)?.label || "";
      const ageStr = ageGroup.map(a => AGE_GROUPS.find(g => g.id === a)?.label).filter(Boolean).join(", ");

      setUploadProgress({ stage: "📄 Extracting lots from catalog...", percent: 25 });

      // Build vision payload (client-side frame extraction so we never send raw video).
      let visionPayload: string[] = [];
      if (analysisMode !== "pdf_only") {
        setVisionStage("Preparing visual inputs...");
        try {
          if (visionImages.length > 0) {
            setUploadProgress({ stage: "🖼️ Compressing images...", percent: 30 });
            for (const f of visionImages.slice(0, 8)) {
              visionPayload.push(await fileToCompressedDataUrl(f));
            }
          }
          if (visionVideo) {
            setUploadProgress({ stage: "🎞️ Extracting key frames from video...", percent: 40 });
            const percents = analysisMode === "pdf_breeze"
              ? [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95]
              : [0, 0.15, 0.3, 0.5, 0.7, 0.9];
            const frames = await extractVideoFrames(visionVideo, percents);
            visionPayload.push(...frames);
          }
        } catch (e: any) {
          console.warn("Vision frame extraction failed:", e?.message);
          toast({ title: "Vision input issue", description: "Could not process visuals — continuing with PDF only.", variant: "destructive" });
          visionPayload = [];
        }
        setVisionStage(null);
      }

      await uploadPDF.mutateAsync({
        file: catalogFile,
        objective: objectiveStr,
        budget: budgetStr || undefined,
        goals: ageStr ? { horse_type: ageStr, desired_sire: "", analysis_requested: objectives.join(", ") } : undefined,
        horseType,
        saleContext: saleContext || undefined,
        mode: analysisMode,
        visionImages: visionPayload.length ? visionPayload : undefined,
        breezeData: analysisMode === "pdf_breeze" ? breezeForm : undefined,
      });

      setUploadProgress({ stage: "✅ Analysis complete!", percent: 100 });
      setCatalogFile(null);
      setVisionImages([]); setVisionVideo(null);
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error: any) {
      console.error("Upload error:", error?.message);
      toast({ title: "Upload Failed", description: error?.message || "Failed to process catalog", variant: "destructive" });
      setUploadProgress(null);
    } finally {
      setCatalogUploadBusy(false);
    }
  };

  /**
   * Extract text from PDF pages using pdf.js (client-side).
   */
  const extractTextFromPDF = useCallback(async (file: File, startPage: number, endPage: number): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const actualEnd = Math.min(endPage, pdf.numPages);
    const pages: string[] = [];

    for (let p = startPage; p <= actualEnd; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      // Preserve line breaks using Y-position changes and hasEOL
      let lastY: number | null = null;
      const lines: string[] = [];
      let currentLine = "";
      
      for (const item of content.items as any[]) {
        if (!item.str) continue;
        const y = Math.round(item.transform?.[5] || 0);
        
        if (lastY !== null && Math.abs(y - lastY) > 3) {
          // Y position changed = new line
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? " " : "") + item.str;
        }
        lastY = y;
        
        if (item.hasEOL) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = "";
          lastY = null;
        }
      }
      if (currentLine.trim()) lines.push(currentLine.trim());
      
      const pageText = lines.join("\n");
      pages.push(`--- PAGE ${p} ---\n${pageText}`);
      console.log(`[CATALOGUE] Page ${p}: ${lines.length} lines, ${pageText.length} chars`);
    }

    const fullText = pages.join("\n\n");
    console.log(`[CATALOGUE] Batch ${startPage}-${endPage}: ${fullText.length} total chars`);
    return fullText;
  }, []);

  /**
   * Get total page count from PDF without loading all pages
   */
  const getPDFPageCount = useCallback(async (file: File): Promise<number> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  }, []);

  /**
   * Scan PDF to find the first page containing an actual lot entry.
   * Skips intro, maps, stallion notes etc.
   */
  const findFirstLotPage = useCallback(async (file: File): Promise<number> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxScan = Math.min(250, pdf.numPages);

    for (let pageNum = 1; pageNum <= maxScan; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(" ");

      // Detect LOT or HIP markers
      const hasLotMarker = /\bLOT\s+\d+/i.test(text) || /\bHip\s+(?:No\.?\s*)?\d+/i.test(text);
      // Lot pattern: number appears twice (e.g. "1210 1210")
      const hasDuplicateNum = /\b(\d{3,4})\b.*\b\1\b/.test(text) &&
        (text.includes("WITH VAT") || text.includes("NON VAT") || text.includes("Will Stand"));

      if (hasLotMarker || hasDuplicateNum) {
        console.log(`[CATALOGUE] First lot found on page ${pageNum}`);
        return pageNum;
      }
    }
    return 1; // fallback
  }, []);

  /**
   * Split extracted text into LOT blocks using LOT markers.
   * Each block corresponds to one horse entry.
   */
  const splitTextByLotMarkers = useCallback((fullText: string): string[] => {
    // Match LOT/HIP markers: "LOT 1", "LOT 45", "Hip 123", "HIP No. 45", or duplicate lot numbers like "1210 1210"
    const lotPattern = /(?:^|\n)(?:LOT\s+(\d+)|Hip\s+(?:No\.?\s*)?(\d+)|(\d{1,4})\s+(?:the Property of.*?\s+)?(\3)\b)/gim;
    
    const markers: { index: number; lotNum: string }[] = [];
    let match;
    
    while ((match = lotPattern.exec(fullText)) !== null) {
      const lotNum = match[1] || match[2] || match[3];
      markers.push({ index: match.index, lotNum });
    }
    
    // Also detect lot patterns from the system prompt format: number appears twice
    if (markers.length === 0) {
      const altPattern = /(?:^|\n)\s*(\d{1,4})\s+.*?\1\s/gm;
      while ((match = altPattern.exec(fullText)) !== null) {
        markers.push({ index: match.index, lotNum: match[1] });
      }
    }
    
    if (markers.length === 0) {
      console.log("[CATALOGUE] No LOT/HIP markers detected, sending as single block");
      return [fullText];
    }
    
    console.log(`[CATALOGUE] Detected ${markers.length} LOT/HIP markers`);
    
    // Split text into blocks between markers
    const blocks: string[] = [];
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index;
      const end = i + 1 < markers.length ? markers[i + 1].index : fullText.length;
      const block = fullText.slice(start, end).trim();
      if (block.length > 20) blocks.push(block);
    }
    
    return blocks;
  }, []);

  /**
   * Group LOT blocks into batches of ~20 lots each for API calls.
   */
  const batchLotBlocks = useCallback((blocks: string[], batchSize: number = 20): string[] => {
    const batches: string[] = [];
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batchBlocks = blocks.slice(i, i + batchSize);
      batches.push(batchBlocks.join("\n\n---\n\n"));
    }
    return batches;
  }, []);

  /**
   * Build a horse display object from a catalogue lot record
   */
  const buildHorseFromLot = (lot: any, topPick: any, undervalued: any, shouldAvoid: boolean, score: number, verdict: string) => ({
    name: lot.horse_name || `${lot.sire} x ${lot.dam}`,
    lot_number: lot.lot_number,
    pedigree: { sire: lot.sire, dam: lot.dam, dam_sire: lot.dam_sire },
    sex: lot.sex,
    color: lot.color,
    breeder: lot.breeder,
    consignor: lot.consignor,
    scores: { overall_score: score },
    agent_verdict: verdict,
    verdict_reason: topPick?.insight || topPick?.why_fits_goal || undervalued?.reason || lot.potential_summary || "",
    key_strengths: topPick ? [topPick.pedigree_summary, topPick.commercial_value, topPick.athletic_potential].filter(Boolean) : [],
    key_risks: topPick?.risk_factors || [],
    goal_match: !!topPick,
    goal_match_reason: topPick?.why_fits_goal || "",
    potential_summary: lot.potential_summary || "",
    potential_flags: lot.potential_flags || [],
  });

  /**
   * Generate SHA-256 hash of file content for deduplication
   */
  const generateFileHash = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const handleLargeCatalogUpload = async () => {
    if (!catalogFile) return;
    setCatalogUploadBusy(true);

    try {
      const fileSizeMB = Math.round(catalogFile.size / 1024 / 1024);

      // Step 0: Generate hash and check for duplicates
      setUploadProgress({ stage: `🔍 Checking if this catalog already exists...`, percent: 1 });
      const catalogHash = await generateFileHash(catalogFile);
      console.log(`[CATALOGUE] File hash: ${catalogHash}`);

      let hashCheck: any = null;
      try {
        hashCheck = await invokeEdgeFunction("process-catalogue", {
          body: { action: "check_catalog_hash", catalogHash },
          requireSession: true,
        });
      } catch (hashError) {
        console.warn("Hash check failed, proceeding with upload:", hashError);
      }

      if (hashCheck?.exists) {
        // Catalog already exists — reuse it
        const existingCatalogue = hashCheck.catalogue;
        const existingLots = hashCheck.lots || [];

        toast({
          title: "Catalog already processed!",
          description: `"${existingCatalogue.sale_name}" was previously analyzed with ${existingLots.length} lots. Loading existing results.`,
        });

        // Build summary for display using existing data
        const objectiveStr = objectives.join(", ") || "general";
        const budgetStr = BUDGETS.find(b => b.id === budget)?.label || "";
        const ageStr = ageGroup.map(a => AGE_GROUPS.find(x => x.id === a)?.label).filter(Boolean).join(", ");
        const clientGoal = [
          objectives.length > 0 ? `Objectives: ${objectives.map(o => OBJECTIVES.find(x => x.id === o)?.label).filter(Boolean).join(", ")}` : "",
          budgetStr ? `Budget: ${budgetStr}` : "",
          ageStr ? `Age: ${ageStr}` : "",
        ].filter(Boolean).join(". ");

        // Run analyst if user has goals
        let analystResult: any = null;
        if (clientGoal && existingLots.length > 0) {
          setUploadProgress({ stage: "🧠 Running analyst for your goals...", percent: 50 });
          try {
            const analystData = await invokeEdgeFunction("process-catalogue", {
              body: { action: "analyze_for_client", catalogueId: existingCatalogue.id, clientGoal },
              requireSession: true,
            });
            if (analystData?.top_picks) analystResult = analystData;
          } catch (e) {
            console.warn("Analyst pass failed:", e);
          }
        }

        // Build horses array from existing lots
        const analystTopPicks = new Map<string, any>();
        const analystUndervalued = new Map<string, any>();
        const analystAvoid = new Set<string>();
        if (analystResult?.top_picks) for (const p of analystResult.top_picks) analystTopPicks.set(String(p.lot_number), p);
        if (analystResult?.undervalued_lots) for (const u of analystResult.undervalued_lots) analystUndervalued.set(String(u.lot_number), u);
        if (analystResult?.avoid_list) for (const a of analystResult.avoid_list) analystAvoid.add(String(a.lot_number));

        const horses = existingLots.map((lot: any) => {
          const lotNum = String(lot.lot_number);
          const topPick = analystTopPicks.get(lotNum);
          const undervalued = analystUndervalued.get(lotNum);
          const shouldAvoid = analystAvoid.has(lotNum);
          const score = topPick?.score || lot.potential_score || lot.overall_score || 0;
          let verdict = topPick ? "BUY" : undervalued ? "WATCH" : shouldAvoid ? "AVOID" : score >= 70 ? "BUY" : score >= 40 ? "WATCH" : "AVOID";
          return buildHorseFromLot(lot, topPick, undervalued, shouldAvoid, score, verdict);
        });

        // Create pdf_uploads record so it appears in history
        await supabase.from("pdf_uploads").insert({
          user_id: user!.id,
          file_name: catalogFile.name,
          file_path: `reuse-${existingCatalogue.id}`,
          file_size: catalogFile.size,
          status: "completed" as any,
          extracted_data: {
            catalog_summary: {
              sale_name: existingCatalogue.sale_name,
              auction_house: existingCatalogue.auction_house,
              total_lots: existingLots.length,
              reused_from: existingCatalogue.id,
            },
            horses,
            top_recommendations: analystResult?.top_picks || [],
            market_insights: analystResult?.market_overview ? { market_commentary: analystResult.market_overview } : undefined,
          },
          processed_at: new Date().toISOString(),
        });

        queryClient.invalidateQueries({ queryKey: ["pdf-uploads"] });
        setUploadProgress({ stage: "✅ Loaded from existing analysis!", percent: 100 });
        setCatalogFile(null);
        setTimeout(() => setUploadProgress(null), 2000);
        return;
      }

      setUploadProgress({ stage: `📄 Scanning PDF structure (${fileSizeMB}MB)...`, percent: 2 });

      // Step 1: Get page count and detect where lots start
      const totalPages = await getPDFPageCount(catalogFile);

      setUploadProgress({ stage: `📄 Found ${totalPages} pages. Detecting first lot...`, percent: 4 });
      const firstLotPage = await findFirstLotPage(catalogFile);
      console.log(`[CATALOGUE] Starting from page ${firstLotPage} of ${totalPages}`);

      setUploadProgress({ stage: `📄 Extracting full text from pages ${firstLotPage}–${totalPages}...`, percent: 6 });

      // Step 2a: Extract ALL text from lot pages client-side
      const fullText = await extractTextFromPDF(catalogFile, firstLotPage, totalPages);
      console.log(`[CATALOGUE] Full text extracted: ${fullText.length} chars`);

      // Step 2b: Split text by LOT markers
      setUploadProgress({ stage: "🔍 Detecting LOT markers in catalogue...", percent: 8 });
      const lotBlocks = splitTextByLotMarkers(fullText);
      console.log(`[CATALOGUE] Split into ${lotBlocks.length} LOT blocks`);

      // Step 2c: Group LOT blocks into batches of ~20 lots each
      const LOTS_PER_BATCH = 20;
      const lotBatches = batchLotBlocks(lotBlocks, LOTS_PER_BATCH);
      const totalBatches = lotBatches.length;
      console.log(`[CATALOGUE] ${lotBlocks.length} lots → ${totalBatches} batches`);

      // Step 2: Upload to Supabase Storage (for archival)
      setUploadProgress({ stage: `📄 ${lotBlocks.length} LOTs detected. Uploading to storage...`, percent: 9 });
      const storagePath = `${user!.id}/${Date.now()}-${catalogFile.name.replace(/\s/g, "_")}`;
      const { error: storageError } = await supabase.storage
        .from("catalogues")
        .upload(storagePath, catalogFile, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

      setUploadProgress({ stage: "✅ Upload complete. Creating catalogue record...", percent: 10 });

      // Step 3: Create catalogue record WITH hash
      const { data: catalogue, error: catError } = await (supabase as any)
        .from("catalogues")
        .insert({
          auction_house: "PDF Upload",
          sale_name: catalogFile.name.replace(/\.pdf$/i, ""),
          sale_year: new Date().getFullYear(),
          storage_path: storagePath,
          file_size_mb: fileSizeMB,
          total_chunks: totalBatches,
          processed_chunks: 0,
          processed_lots: 0,
          total_lots: lotBlocks.length,
          status: "processing",
          pdf_processed: false,
          catalog_hash: catalogHash,
        })
        .select()
        .single();

      if (catError) throw catError;

      // Link user to this new catalogue
      await supabase.from("user_catalog_access").insert({
        user_id: user!.id,
        catalog_id: catalogue.id,
      });


      // Also create a pdf_uploads record so it appears in history
      const { data: uploadRecord } = await supabase
        .from("pdf_uploads")
        .insert({
          user_id: user!.id,
          file_name: catalogFile.name,
          file_path: storagePath,
          file_size: catalogFile.size,
          status: "processing" as any,
        })
        .select()
        .single();

      // Step 4: Send LOT-based batches to edge function
      let totalLotsFound = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchText = lotBatches[batch];
        const lotsInBatch = Math.min(LOTS_PER_BATCH, lotBlocks.length - batch * LOTS_PER_BATCH);
        const pct = 12 + Math.round((batch / totalBatches) * 68);

        setUploadProgress({
          stage: `🔍 Processing LOTs batch ${batch + 1}/${totalBatches} (${lotsInBatch} lots)...${totalLotsFound > 0 ? ` (${totalLotsFound} lots saved)` : ''}`,
          percent: pct,
        });

        try {
          if (batchText.trim().length < 50) continue;

          const data = await invokeEdgeFunction("process-catalogue", {
            body: {
              action: "extract_batch",
              catalogueId: catalogue.id,
              pageText: batchText,
              pageRange: `LOTs batch ${batch + 1}/${totalBatches}`,
              saleName: catalogue.sale_name || catalogue.auction_house || "Unknown Sale",
            },
            requireSession: true,
          });

          totalLotsFound += data?.lotsSaved || 0;
          console.log(`Batch ${batch + 1}/${totalBatches}: ${data?.lotsSaved || 0} lots saved`);
        } catch (e: any) {
          console.warn(`Batch ${batch + 1} exception:`, e?.message || e);
          if (/sign in|401|unauthorized/i.test(String(e?.message))) {
            throw e;
          }
          continue;
        }
      }

      // Step 5: Enrich top lots
      setUploadProgress({
        stage: `✨ Extracted ${totalLotsFound} lots. Enriching with web research...`,
        percent: 82,
      });

      await (supabase as any)
        .from("catalogues")
        .update({ status: "enriching", total_lots: totalLotsFound })
        .eq("id", catalogue.id);

      const { data: topLots } = await (supabase as any)
        .from("catalogue_lots")
        .select("id, horse_name, sire, dam")
        .eq("catalogue_id", catalogue.id)
        .eq("lot_status", "extracted")
        .not("sire", "in", '("","Not printed")')
        .not("dam", "in", '("","Not printed")')
        .limit(30);

      if (topLots?.length) {
        for (let i = 0; i < topLots.length; i++) {
          const lot = topLots[i];
          const pct = 82 + Math.round((i / topLots.length) * 13);
          setUploadProgress({
            stage: `✨ Enriching: ${lot.horse_name || `${lot.sire} x ${lot.dam}`} (${i + 1}/${topLots.length})`,
            percent: pct,
          });

          try {
            await invokeEdgeFunction("process-catalogue", {
              body: {
                action: "enrich_lot",
                lotId: lot.id,
                horseName: lot.horse_name,
                sire: lot.sire,
                dam: lot.dam,
              },
              requireSession: true,
            });
          } catch (e) {
            console.warn(`Enrich failed for lot ${lot.id}:`, e);
          }
        }
      }

      // Step 6: Mark complete
      await (supabase as any)
        .from("catalogues")
        .update({ status: "complete", pdf_processed: true, total_lots: totalLotsFound, updated_at: new Date().toISOString() })
        .eq("id", catalogue.id);

      // Build summary for pdf_uploads record
      const { data: extractedLots } = await (supabase as any)
        .from("catalogue_lots")
        .select("*")
        .eq("catalogue_id", catalogue.id)
        .order("lot_number", { ascending: true });

      // Step 7: Run Elite Analyst if client has goals
      const clientGoal = [
        objectives.length > 0 ? `Objectives: ${objectives.map(o => OBJECTIVES.find(x => x.id === o)?.label).filter(Boolean).join(", ")}` : "",
        budget ? `Budget: ${BUDGETS.find(b => b.id === budget)?.label}` : "",
        ageGroup.length > 0 ? `Age: ${ageGroup.map(a => AGE_GROUPS.find(x => x.id === a)?.label).filter(Boolean).join(", ")}` : "",
      ].filter(Boolean).join(". ");

      let analystResult: any = null;
      if (clientGoal && (extractedLots || []).length > 0) {
        setUploadProgress({ stage: "🧠 Elite Analyst ranking lots for your goals...", percent: 90 });
        try {
          const analystData = await invokeEdgeFunction("process-catalogue", {
            body: { action: "analyze_for_client", catalogueId: catalogue.id, clientGoal },
            requireSession: true,
          });
          if (analystData?.top_picks) {
            analystResult = analystData;
            console.log(`[ANALYST] Got ${analystData.top_picks?.length} top picks, ${analystData.undervalued_lots?.length} undervalued`);
          }
        } catch (e: any) {
          console.warn("[ANALYST] Analyst pass failed (non-critical):", e.message);
        }
      }

      // Build horses array, merging analyst rankings if available
      const analystTopPicks = new Map<string, any>();
      const analystUndervalued = new Map<string, any>();
      if (analystResult?.top_picks) {
        for (const pick of analystResult.top_picks) {
          analystTopPicks.set(String(pick.lot_number), pick);
        }
      }
      if (analystResult?.undervalued_lots) {
        for (const uv of analystResult.undervalued_lots) {
          analystUndervalued.set(String(uv.lot_number), uv);
        }
      }
      const analystAvoid = new Set<string>();
      if (analystResult?.avoid_list) {
        for (const av of analystResult.avoid_list) {
          analystAvoid.add(String(av.lot_number));
        }
      }

      const horses = (extractedLots || []).map((lot: any) => {
        const lotNum = String(lot.lot_number);
        const topPick = analystTopPicks.get(lotNum);
        const undervalued = analystUndervalued.get(lotNum);
        const shouldAvoid = analystAvoid.has(lotNum);
        const score = topPick?.score || lot.potential_score || lot.overall_score || 0;
        const verdict = topPick ? "BUY" : undervalued ? "WATCH" : shouldAvoid ? "AVOID"
          : score >= 70 ? "BUY" : score >= 40 ? "WATCH" : "AVOID";
        return buildHorseFromLot(lot, topPick, undervalued, shouldAvoid, score, verdict);
      });

      const summaryData: any = {
        catalog_summary: {
          sale_name: catalogFile.name.replace(/\.pdf$/i, ""),
          auction_house: "PDF Upload",
          total_lots: totalLotsFound,
          quality_assessment: analystResult?.analysis_summary ||
            `${totalLotsFound} lots extracted from ${fileSizeMB}MB catalogue (${totalPages} pages)`,
          market_temperature: analystResult?.sire_trends?.length > 3 ? "Warm" : undefined,
        },
        horses,
        top_recommendations: (analystResult?.top_picks || horses.filter((h: any) => h.scores?.overall_score >= 60))
          .sort((a: any, b: any) => (b.score || b.scores?.overall_score || 0) - (a.score || a.scores?.overall_score || 0))
          .slice(0, 15)
          .map((h: any, i: number) => ({
            rank: i + 1,
            lot_number: h.lot_number,
            horse_name: h.horse_name || h.name,
            overall_score: h.score || h.scores?.overall_score,
            reason: h.insight || h.why_fits_goal || h.potential_summary || h.verdict_reason,
            verdict: h.score >= 80 ? "BUY" : h.score >= 60 ? "WATCH" : "AVOID",
            investment_thesis: h.commercial_value || "",
            pedigree_highlights: h.pedigree_summary || "",
            risk_level: (h.risk_factors?.length || 0) > 2 ? "High" : (h.risk_factors?.length || 0) > 0 ? "Medium" : "Low",
          })),
        market_insights: analystResult ? {
          trending_sires: analystResult.sire_trends?.map((s: any) => `${s.sire_name} (${s.lots_in_catalogue} lots)`) || [],
          value_picks: analystResult.undervalued_lots?.map((u: any) => `Lot ${u.lot_number} — ${u.horse_name}`) || [],
          premium_lots: analystResult.top_picks?.slice(0, 5).map((p: any) => `Lot ${p.lot_number} — ${p.horse_name}`) || [],
          ones_to_avoid: analystResult.avoid_list?.map((a: any) => `Lot ${a.lot_number} — ${a.reason}`) || [],
          overall_catalog_quality: analystResult.analysis_summary || "",
          market_commentary: analystResult.market_overview || "",
        } : undefined,
        chart_data: {
          score_distribution: horses
            .filter((h: any) => h.scores?.overall_score > 0)
            .sort((a: any, b: any) => (b.scores?.overall_score || 0) - (a.scores?.overall_score || 0))
            .slice(0, 15)
            .map((h: any) => ({
              name: `#${h.lot_number}`,
              overall: h.scores?.overall_score || 0,
              pedigree: h.scores?.overall_score || 0,
              performance: 0,
              commercial: 0,
            })),
          sire_representation: [],
          verdict_breakdown: {
            BUY: horses.filter((h: any) => h.agent_verdict === "BUY").length,
            WATCH: horses.filter((h: any) => h.agent_verdict === "WATCH").length,
            AVOID: horses.filter((h: any) => h.agent_verdict === "AVOID").length,
          },
        },
      };

      if (uploadRecord) {
        await supabase
          .from("pdf_uploads")
          .update({ status: "completed" as any, extracted_data: summaryData, processed_at: new Date().toISOString() })
          .eq("id", uploadRecord.id);
      }

      setUploadProgress({ stage: `✅ Complete! ${totalLotsFound} horses extracted from ${totalPages} pages.`, percent: 100 });
      setCatalogFile(null);

      toast({
        title: "Large Catalogue Processed!",
        description: `Extracted ${totalLotsFound} horses from ${totalPages} pages (${fileSizeMB}MB).`,
      });

      setTimeout(() => {
        setUploadProgress(null);
        queryClient.invalidateQueries({ queryKey: ["pdf-uploads"] });
      }, 3000);
    } catch (error: any) {
      console.error("Large catalog upload error:", error);
      toast({
        title: "Upload Failed",
        description: error?.message || "Failed to process large catalogue",
        variant: "destructive",
      });
      setUploadProgress(null);
    } finally {
      setCatalogUploadBusy(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getFileUrl(filePath);
    if (url) {
      const link = document.createElement("a");
      link.href = url; link.download = fileName; link.target = "_blank";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const handleDelete = async (uploadId: string, filePath: string) => {
    await deleteUpload.mutateAsync({ uploadId, filePath });
  };

  const toggleExpand = (id: string) => {
    setExpandedUploads(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleObjective = (id: string) => {
    setObjectives(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAge = (id: string) => {
    setAgeGroup(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Comparison mode handlers ──
  const addComparisonFile = (file: File) => {
    if (comparisonFiles.length >= 10) return;
    setComparisonFiles(prev => [...prev, { file, name: file.name.replace(/\.pdf$/i, "") }]);
  };

  const removeComparisonFile = (idx: number) => {
    setComparisonFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleComparePDFs = async () => {
    if (comparisonFiles.length < 2) return;

    setComparingPDFs(true);
    setComparisonResult(null);
    setCompProgress({ stage: "📄 Uploading PDFs...", percent: 10 });

    try {
      // Upload each PDF
      const uploadIds: string[] = [];
      for (let i = 0; i < comparisonFiles.length; i++) {
        setCompProgress({ stage: `🔍 Analyzing horse ${i + 1} of ${comparisonFiles.length}...`, percent: 15 + (i / comparisonFiles.length) * 50 });
        const result = await uploadPDF.mutateAsync({
          file: comparisonFiles[i].file,
          objective: "comparison",
        });
        if (result?.upload_id) uploadIds.push(result.upload_id);
      }

      setCompProgress({ stage: "🧠 Comparing horses side by side...", percent: 75 });

      // Call compare function with all upload IDs
      const data = await invokeEdgeFunction("compare-uploads", {
        requireSession: true,
        body: { upload_ids: uploadIds, mode: "multi_horse" },
      });

      setCompProgress({ stage: "✅ Comparison complete!", percent: 100 });
      setComparisonResult(data);
      setTimeout(() => setCompProgress(null), 2000);

      toast({ title: "Comparison Complete!", description: `Analyzed and compared ${comparisonFiles.length} horses.` });
    } catch (err: any) {
      toast({ title: "Comparison Failed", description: err.message || "Error", variant: "destructive" });
      setCompProgress(null);
    } finally {
      setComparingPDFs(false);
    }
  };

  const isImageFile = (fileName: string) =>
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].some(ext => fileName.toLowerCase().endsWith(ext));


  return (
    <div className="space-y-6">
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      <ExtraCatalogueModal open={showExtraCatalogue} onOpenChange={setShowExtraCatalogue} />
      <PDFDownloadGuard open={pdfGuardOpen} onOpenChange={setPdfGuardOpen} />

      {/* ── Mode Tabs ── */}
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "catalog" | "comparison")} className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-muted h-12">
          <TabsTrigger value="catalog" className="text-sm gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <FileText className="w-4 h-4" /> Single PDF Analysis
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-sm gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <Search className="w-4 h-4" /> Horse PDF Comparison
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════ */}
        {/* MODE 1 — AUCTION CATALOG ANALYSIS           */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="catalog" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg">Upload a Single PDF</CardTitle>
                   <CardDescription>Upload a horse PDF or catalogue page — our AI extracts and analyses the data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  isDragging ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
                }`}
                onDrop={handleCatalogDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => document.getElementById("catalogInput")?.click()}
              >
                <input id="catalogInput" type="file" accept=".pdf,image/*" onChange={(e) => e.target.files?.[0] && setCatalogFile(e.target.files[0])} className="hidden" />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {catalogFile ? (
                  <div>
                    <p className="text-sm font-medium mb-1">{catalogFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(catalogFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                     <p className="text-sm text-muted-foreground mb-1">Drop your PDF here or click to browse</p>
                     <p className="text-xs text-muted-foreground">Accepts PDF up to 500MB — data extracted and analysed by AI</p>
                  </div>
                )}
              </div>

              {/* Buyer Objective Form — appears after file selected */}
              {catalogFile && (
                <div className="space-y-5 border border-border/50 rounded-xl p-5 bg-card/50">
                  {/* Mandatory horse-type selector */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">What are you analysing? <span className="text-red-400">*</span></h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Pick one — required before analysis.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {HORSE_TYPES.map((t) => {
                        const selected = horseType === t.id;
                        return (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => setHorseType(t.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors ${
                              selected
                                ? "border-secondary bg-secondary/15 text-foreground"
                                : "border-border hover:border-secondary/40 text-muted-foreground"
                            }`}
                          >
                            {t.icon ? <t.icon className="h-6 w-6 text-secondary" strokeWidth={1.75} /> : null}
                            <span className="font-medium">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Sale context <span className="text-muted-foreground font-normal">(optional)</span></h4>
                    <div className="flex flex-wrap gap-2">
                      {SALE_CONTEXTS.map((s) => {
                        const selected = saleContext === s.id;
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => setSaleContext(selected ? "" : s.id)}
                            className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                              selected
                                ? "border-secondary bg-secondary/15 text-foreground"
                                : "border-border hover:border-secondary/40 text-muted-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Analysis-mode selector (mandatory) */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">What would you like to include in this analysis? <span className="text-red-400">*</span></h4>
                    <p className="text-[11px] text-muted-foreground mb-3">Pick one — PDF only, or combine PDF with conformation or breeze-up.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {ANALYSIS_MODES.map((m) => {
                        const selected = analysisMode === m.id;
                        return (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => setAnalysisMode(m.id)}
                            className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left text-xs transition-colors ${
                              selected ? "border-secondary bg-secondary/15 text-foreground" : "border-border hover:border-secondary/40 text-muted-foreground"
                            }`}
                          >
                            <m.icon className="h-5 w-5 text-secondary" strokeWidth={1.75} />
                            <span className="font-semibold">{m.label}</span>
                            <span className="text-[11px] text-muted-foreground">{m.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Biomech / Breeze upload zone */}
                  {analysisMode !== "pdf_only" && (
                    <div className="space-y-3 border border-dashed border-secondary/40 rounded-lg p-4 bg-secondary/5">
                      <div>
                        <h5 className="text-sm font-semibold text-foreground">
                          {analysisMode === "pdf_biomech" ? "Upload conformation photos and/or movement video" : "Upload breeze video and/or enter time data"}
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          {analysisMode === "pdf_biomech"
                            ? "Ideal: front view, side profile, hindquarters view, walk-up video. Up to 8 photos and 1 video (≤ 2 min)."
                            : "Upload the breeze/gallop video. Optional: time, distance, going, track."}
                        </p>
                      </div>

                      {analysisMode === "pdf_biomech" && (
                        <div>
                          <input id="visionImagesInput" type="file" accept="image/jpeg,image/png,image/webp" multiple
                            onChange={(e) => {
                              const list = Array.from(e.target.files || []).slice(0, 8);
                              setVisionImages(list);
                            }}
                            className="hidden" />
                          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("visionImagesInput")?.click()}>
                            <Image className="w-3.5 h-3.5 mr-1.5" /> Choose photos
                          </Button>
                          {visionImages.length > 0 && (
                            <p className="mt-2 text-[11px] text-muted-foreground">{visionImages.length} photo(s) selected</p>
                          )}
                        </div>
                      )}

                      <div>
                        <input id="visionVideoInput" type="file" accept="video/mp4,video/quicktime,video/mov,video/*"
                          onChange={(e) => setVisionVideo(e.target.files?.[0] || null)}
                          className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("visionVideoInput")?.click()}>
                          <Upload className="w-3.5 h-3.5 mr-1.5" /> {visionVideo ? "Replace video" : "Choose video"}
                        </Button>
                        {visionVideo && (
                          <p className="mt-2 text-[11px] text-muted-foreground">{visionVideo.name} ({(visionVideo.size / 1024 / 1024).toFixed(1)} MB)</p>
                        )}
                      </div>

                      {analysisMode === "pdf_breeze" && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/30">
                          <div>
                            <Label className="text-[11px]">Furlong time (s)</Label>
                            <Input type="number" step="0.1" value={breezeForm.furlong_time} onChange={(e) => setBreezeForm({ ...breezeForm, furlong_time: e.target.value })} placeholder="22.4" />
                          </div>
                          <div>
                            <Label className="text-[11px]">Distance</Label>
                            <select className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                              value={breezeForm.distance}
                              onChange={(e) => setBreezeForm({ ...breezeForm, distance: e.target.value })}>
                              {BREEZE_DISTANCES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[11px]">Going</Label>
                            <select className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                              value={breezeForm.going}
                              onChange={(e) => setBreezeForm({ ...breezeForm, going: e.target.value })}>
                              {BREEZE_GOINGS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[11px]">Track</Label>
                            <Input value={breezeForm.track} onChange={(e) => setBreezeForm({ ...breezeForm, track: e.target.value })} placeholder="e.g. Newmarket" />
                          </div>
                        </div>
                      )}

                      {visionStage && <p className="text-[11px] text-secondary">{visionStage}</p>}
                    </div>
                  )}

                  <h4 className="text-sm font-semibold text-foreground">What is your objective for this purchase?</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {OBJECTIVES.map(o => (
                      <label key={o.id} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        objectives.includes(o.id) ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"
                      }`}>
                        <Checkbox checked={objectives.includes(o.id)} onCheckedChange={() => toggleObjective(o.id)} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">{o.label}</p>
                          <p className="text-[10px] text-muted-foreground">{o.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">What is your budget range?</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {BUDGETS.map(b => (
                        <label key={b.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                          budget === b.id ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"
                        }`}>
                          <Checkbox checked={budget === b.id} onCheckedChange={() => setBudget(budget === b.id ? "" : b.id)} />
                          <span>{b.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleCatalogUpload} disabled={!catalogFile || !horseType || uploadPDF.isPending || catalogUploadBusy} variant="premium" className="w-full" size="lg">
                    {(uploadPDF.isPending || catalogUploadBusy) ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing PDF...</>
                    ) : "Analyse PDF →"}
                  </Button>
                </div>
              )}

              {/* Upload progress */}
              {uploadProgress && (
                <AnalysisProcessingPanel
                  stages={[
                    { id: "upload", label: "Uploading catalogue" },
                    { id: "extract", label: "Extracting lots & pedigrees" },
                    { id: "research", label: "Market & pedigree research" },
                    { id: "analyze", label: "Scoring & recommendations" },
                  ]}
                  activeIndex={Math.min(3, Math.floor((uploadProgress.percent / 100) * 4))}
                  progress={uploadProgress.percent}
                  statusMessage={uploadProgress.stage}
                />
              )}
            </CardContent>
          </Card>

          {/* ── Upload History ── */}
          <Card className="w-full max-w-full min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Previous catalog analyses — click to expand results</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-6 min-w-0 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : uploads && uploads.length > 0 ? (
                <div className="space-y-3">
                  {uploads.map((upload) => {
                    const extractedData = upload.extracted_data as any;
                    const horses = extractedData?.horses || [];
                    const hasAnalysis = horses.length > 0 || extractedData?.top_recommendations?.length > 0;
                    const isExpanded = expandedUploads.has(upload.id);
                    const isImage = isImageFile(upload.file_name);
                    const isCompleted = upload.status === "completed";

                    return (
                      <Collapsible key={upload.id} open={isExpanded} onOpenChange={() => toggleExpand(upload.id)}>
                        <div className="border rounded-lg overflow-hidden border-border w-full max-w-full min-w-0">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-accent/5 transition-colors gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              {isImage ? <Image className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" /> : <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium truncate">{upload.file_name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {new Date(upload.created_at!).toLocaleDateString("en-GB")} • {horses.length} lots analysed
                                </p>
                              </div>
                            </div>
                             <div className="flex w-full sm:w-auto min-w-0 items-center gap-1 sm:gap-2 flex-wrap justify-start sm:justify-end">
                              {isCompleted && <Badge variant="outline" className="text-[9px] sm:text-[10px] border-secondary/30 text-secondary">✦ AI</Badge>}
                              <Badge className="text-[9px] sm:text-[10px]" variant={isCompleted ? "default" : upload.status === "failed" ? "destructive" : "secondary"}>
                                {isCompleted && <CheckCircle className="w-3 h-3 mr-1" />}
                                {upload.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                                {upload.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                {upload.status}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handleDownload(upload.file_path, upload.file_name); }}><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                              {hasAnalysis && (
                                <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 border-secondary/30 text-secondary hover:bg-secondary/10 max-w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!access.canDownloadPDF) { setPdfGuardOpen(true); return; }
                                    const horses = extractedData?.horses;
                                    if (horses && horses.length > 0) {
                                      horses.forEach((horse: any) => downloadCatalogLotPDF(horse));
                                    }
                                  }}>
                                  <FileDown className="w-3.5 h-3.5" /> Download Analysis PDF
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => e.stopPropagation()}><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                    <AlertDialogDescription>Delete "{upload.file_name}"? This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(upload.id, upload.file_path)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      {deleteUpload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {hasAnalysis && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </div>
                          </div>
                          <CollapsibleContent>
                            {hasAnalysis && (
                               <div className="border-t border-border bg-accent/5 p-2 sm:p-4 w-full max-w-full min-w-0 overflow-hidden">
                                <CatalogAnalysisView data={extractedData as any} fileName={upload.file_name} />
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No analyses yet. Upload a catalog to get started.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════ */}
        {/* MODE 2 — HORSE PDF COMPARISON               */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="comparison" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Upload Horse PDFs to Compare</CardTitle>
                  <CardDescription>
                    Perfect for foals, yearlings and unraced horses without a race record.
                    Upload up to 10 pedigree PDFs to compare side by side.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {comparisonFiles.map((cf, idx) => (
                  <div key={idx} className="border border-secondary/30 bg-secondary/5 rounded-xl p-4 text-center relative">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <p className="text-xs font-medium truncate">{cf.name}</p>
                    <p className="text-[10px] text-emerald-400 mt-1">PDF uploaded ✅</p>
                    <button
                      onClick={() => removeComparisonFile(idx)}
                      className="absolute top-1 right-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {comparisonFiles.length < 10 && (
                  <label className="border-2 border-dashed border-border hover:border-secondary/50 rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[120px]">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && addComparisonFile(e.target.files[0])}
                    />
                    <Plus className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Add Horse PDF</p>
                    <p className="text-[10px] text-muted-foreground">Click or drop</p>
                  </label>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {comparisonFiles.length}/10 PDFs added • Minimum 2 required to compare
              </p>

              {comparisonFiles.length >= 2 && (
                <Button onClick={handleComparePDFs} disabled={comparingPDFs} variant="premium" className="w-full" size="lg">
                  {comparingPDFs ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing & Comparing...</>
                  ) : `Compare ${comparisonFiles.length} Horses →`}
                </Button>
              )}

              {compProgress && (
                <div className="space-y-2 bg-accent/10 rounded-lg p-4">
                  <p className="text-sm font-medium">{compProgress.stage}</p>
                  <Progress value={compProgress.percent} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparisonResult && (
            <HorsePDFComparisonView data={comparisonResult} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
