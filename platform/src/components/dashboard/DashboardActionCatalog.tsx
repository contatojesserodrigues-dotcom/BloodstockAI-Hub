import { useState, useCallback, useEffect } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PremiumCard } from "@/components/ui/premium-card";
import { Upload, FileText, Zap, Download, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { FeatureLockModal } from "@/components/FeatureLockModal";
import { ExtraCatalogueModal } from "@/components/ExtraCatalogueModal";
import * as pdfjsLib from "pdfjs-dist";
import { generateCatalogFullReport } from "@/utils/catalogAnalysisFullReport";
import { generateCatalogShortlistPdf } from "@/utils/catalogShortlistReport";
import { DashboardCommandCenter } from "@/components/dashboard/DashboardCommandCenter";
import { DashboardFreeChat } from "@/components/dashboard/DashboardFreeChat";
import { AnalysisProcessingPanel } from "@/components/dashboard/AnalysisProcessingPanel";
import { type JulySale, getLiveJulySales } from "@/data/julySales";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface MissionSetup {
  racingObjective: string;
  targetMarket: string;
  distancePreference: string;
  maxBudget: string;
  minBudget: string;
  preferredBloodlines: string;
  avoidBloodlines: string;
  additionalNotes: string;
  auctionHouse: string;
  saleName: string;
  saleDate: string;
  saleLocation: string;
  breedType: "Flat" | "NH";
  foalingYear: string;
}

interface ShortlistRow {
  lot_number: string | number;
  sire: string | null;
  dam: string | null;
  sex: string | null;
  score: number;
  consignor: string | null;
  classification: string;
  sales_hook: string;
}

interface AnalysisResult {
  scoredLots: any[];
  sections: any;
  shortlist: ShortlistRow[];
  totalLots: number;
  marketResearch: any;
  completeness: {
    expected: number;
    extracted: number;
    missing: (string | number)[];
    confirmed: boolean;
  };
}

const AUCTION_CURRENCY: Record<string, { symbol: string; code: string }> = {
  Keeneland: { symbol: "$", code: "USD" },
  "Fasig-Tipton": { symbol: "$", code: "USD" },
  Tattersalls: { symbol: "£", code: "GBP" },
  Goffs: { symbol: "€", code: "EUR" },
  "Magic Millions": { symbol: "A$", code: "AUD" },
  Arqana: { symbol: "€", code: "EUR" },
  Other: { symbol: "$", code: "USD" },
};

const MARKET_CURRENCY: Record<string, { symbol: string; code: string }> = {
  Europe: { symbol: "€", code: "EUR" },
  UK: { symbol: "£", code: "GBP" },
  USA: { symbol: "$", code: "USD" },
  Australia: { symbol: "A$", code: "AUD" },
  "Middle East": { symbol: "$", code: "USD" },
  Global: { symbol: "$", code: "USD" },
};

export function DashboardActionCatalog() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canUploadCatalogue, uploadCatalogueRequiredPlan, isSuperAdmin, plan } = useFeatureAccess();
  const isEnterprise = plan === "enterprise";
  const { gate, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const [mission, setMission] = useState<MissionSetup>({
    racingObjective: "Flat Racing",
    targetMarket: "Global",
    distancePreference: "Any",
    maxBudget: "500,000",
    minBudget: "0",
    preferredBloodlines: "",
    avoidBloodlines: "",
    additionalNotes: "",
    auctionHouse: "Other",
    saleName: "JRHA Select Sale – Yearlings 2026",
    saleDate: "2026-07-13",
    saleLocation: "Hokkaido, Japan",
    breedType: "Flat",
    foalingYear: String(new Date().getFullYear() - 2),
  });
  const [selectedSaleSlug, setSelectedSaleSlug] = useState(
    () => getLiveJulySales().find((s) => s.status !== "Ended")?.slug ?? "jrha-select-sale-yearlings",
  );

  // Catalogue upload limit state
  const [monthlyUploads, setMonthlyUploads] = useState(0);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [extraCatalogueModalOpen, setExtraCatalogueModalOpen] = useState(false);
  const MONTHLY_LIMIT = 2;

  // Check monthly catalogue usage
  useEffect(() => {
    if (!user?.id || isSuperAdmin || isEnterprise) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    supabase
      .from("catalogue_uploads_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth)
      .then(({ count }) => setMonthlyUploads(count ?? 0));
  }, [user?.id, isSuperAdmin, isEnterprise]);

  const hasReachedLimit = !isSuperAdmin && !isEnterprise && monthlyUploads >= MONTHLY_LIMIT;

  // Auction house takes priority, then target market, then default USD
  const currency = mission.auctionHouse
    ? (AUCTION_CURRENCY[mission.auctionHouse] || { symbol: "$", code: "USD" })
    : (MARKET_CURRENCY[mission.targetMarket] || { symbol: "$", code: "USD" });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [analysisStageIndex, setAnalysisStageIndex] = useState(0);

  const analysisStages = [
    { id: "index", label: "Building lot index" },
    { id: "extract", label: "Extracting catalogue lots" },
    { id: "research", label: "Researching market & pedigrees" },
    { id: "score", label: "Scoring & generating report" },
    { id: "finalize", label: "Finalising shortlist & PDFs" },
  ];
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const downloadFullReport = () => {
    if (!result) return;
    if (!result.completeness.confirmed) {
      toast({
        title: "PDF locked",
        description: `Completeness not confirmed (${result.completeness.extracted}/${result.completeness.expected} lots). Re-run analysis before downloading.`,
        variant: "destructive",
      });
      return;
    }
    generateCatalogFullReport({
      saleName: mission.saleName || mission.auctionHouse || "Auction Catalogue",
      saleDate: mission.saleDate,
      saleLocation: mission.saleLocation,
      breedType: mission.breedType,
      foalingYear: mission.foalingYear ? Number(mission.foalingYear) : undefined,
      currency: currency.code,
      scoredLots: result.scoredLots as any,
      sections: result.sections,
      marketResearch: result.marketResearch,
    });
    toast({ title: "Full Report downloaded", description: "Catalogue Analysis Report PDF generated." });
  };

  const downloadShortlist = () => {
    if (!result) return;
    if (!result.completeness.confirmed) {
      toast({
        title: "PDF locked",
        description: `Completeness not confirmed (${result.completeness.extracted}/${result.completeness.expected} lots). Re-run analysis before downloading.`,
        variant: "destructive",
      });
      return;
    }
    generateCatalogShortlistPdf({
      saleName: mission.saleName || mission.auctionHouse || "Auction Catalogue",
      saleDate: mission.saleDate,
      lots: result.shortlist,
    });
    toast({ title: "Shortlist downloaded", description: "Selected Lots Shortlist PDF generated." });
  };

  const applySaleContext = (sale: JulySale) => {
    setSelectedSaleSlug(sale.slug);
    setMission((prev) => ({
      ...prev,
      auctionHouse: sale.auctionHouse,
      saleName: `${sale.name} 2026`,
      saleDate: sale.saleDateIso,
      saleLocation: sale.location,
      targetMarket:
        sale.country === "United Kingdom"
          ? "UK"
          : sale.country === "United States"
          ? "USA"
          : sale.country === "Ireland" || sale.country === "France"
          ? "Europe"
          : sale.country === "Japan"
          ? "Global"
          : prev.targetMarket,
    }));
  };

  const scrollToUpload = () => {
    document.getElementById("dashboard-quick-upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      await loadPdf(file);
    } else {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
    }
  }, [toast]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === "application/pdf") {
      await loadPdf(file);
    }
  };

  const loadPdf = async (file: File) => {
    setPdfFile(file);
    setResult(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
    } catch {
      setPageCount(0);
    }
  };

  const extractPdfText = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(" ");
      pages.push(text);
    }
    return pages;
  };

  type PageEntry = { pageNumber: number; text: string };
  type AnalysisChunk = { text: string; startPage: number; endPage: number; approxTokens: number };

  // STAGE 0 — Master lot index: scan every page for "Lot N" / "Hip N" tokens
  // to know how many lots exist and on which pages, before any extraction.
  const buildMasterIndex = (pages: PageEntry[]): Map<string, number[]> => {
    const index = new Map<string, number[]>();
    const re = /\b(?:lot|hip)\s*0*([0-9]{1,5}[A-Za-z]?)\b/gi;
    for (const p of pages) {
      const seen = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(p.text)) !== null) {
        const key = m[1].toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const arr = index.get(key) ?? [];
        arr.push(p.pageNumber);
        index.set(key, arr);
      }
    }
    return index;
  };

  const normaliseLotKey = (v: any): string =>
    String(v ?? "").trim().toUpperCase().replace(/^0+/, "") || String(v ?? "").trim().toUpperCase();

  const buildAnalysisChunks = (pages: PageEntry[]): AnalysisChunk[] => {
    const MAX_CHARS_PER_CHUNK = 18000; // ~4,500 tokens
    const MAX_PAGES_PER_CHUNK = 8;

    const chunks: AnalysisChunk[] = [];
    let buffer: PageEntry[] = [];
    let currentChars = 0;

    const flush = () => {
      if (!buffer.length) return;
      const text = buffer.map((p) => p.text).join("\n\n--- PAGE BREAK ---\n\n");
      chunks.push({
        text,
        startPage: buffer[0].pageNumber,
        endPage: buffer[buffer.length - 1].pageNumber,
        approxTokens: Math.ceil(text.length / 4),
      });
      buffer = [];
      currentChars = 0;
    };

    for (const page of pages) {
      const nextChars = page.text.length + 32;
      const overflowByChars = currentChars + nextChars > MAX_CHARS_PER_CHUNK;
      const overflowByCount = buffer.length >= MAX_PAGES_PER_CHUNK;

      if (buffer.length > 0 && (overflowByChars || overflowByCount)) {
        flush();
      }

      buffer.push(page);
      currentChars += nextChars;
    }

    flush();
    return chunks;
  };

  const isRateLimitError = (error: any) => {
    const message = `${error?.message || ""} ${error?.context || ""}`.toLowerCase();
    return message.includes("429") || message.includes("rate limit") || message.includes("too many requests");
  };

  const parseRetryAfterMs = (error: any): number => {
    const contexts = [error?.context, error?.message];

    for (const raw of contexts) {
      if (!raw) continue;

      if (typeof raw === "object" && typeof raw.retryAfterMs === "number") {
        return raw.retryAfterMs;
      }

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.retryAfterMs === "number") {
            return parsed.retryAfterMs;
          }
        } catch {
          const match = raw.match(/retryAfterMs[^0-9]*(\d+)/i);
          if (match) return Number(match[1]);
        }
      }
    }

    return 0;
  };

  const validateMission = (): boolean => {
    if (!mission.racingObjective || !mission.targetMarket || !mission.distancePreference || !mission.auctionHouse || !mission.saleName) {
      toast({ title: "Missing fields", description: "Please fill in all required mission fields (including Sale Name).", variant: "destructive" });
      return false;
    }
    if (!pdfFile) {
      toast({ title: "No PDF", description: "Please upload an auction catalog PDF.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const runAnalysis = async () => {
    // Paywall gate first
    if (gate("catalogue")) return;
    // Feature gate: PRO+ only
    if (!canUploadCatalogue) {
      setLockModalOpen(true);
      return;
    }
    // Monthly limit check (Pro = 2/month, Enterprise/SuperAdmin = unlimited)
    if (hasReachedLimit) {
      setExtraCatalogueModalOpen(true);
      return;
    }
    if (!validateMission() || !pdfFile) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to run catalogue analysis.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setProgress(5);
    setStatusMessage("Stage 1/4 — extracting text from PDF...");
    setResult(null);

    try {
      const pages = await extractPdfText(pdfFile);
      const pageEntries: PageEntry[] = pages
        .map((text, idx) => ({ pageNumber: idx + 1, text: text.trim() }))
        .filter((p) => p.text.length > 0);

      if (!pageEntries.length) {
        throw new Error("No readable text was found in this PDF.");
      }

      const lotPageEntries = pageEntries.filter((p) => /\b(?:lot|hip)\s*\d{1,5}\b/i.test(p.text));
      const pagesForAnalysis = lotPageEntries.length >= 3 ? lotPageEntries : pageEntries;

      // STAGE 0 — Build master lot index
      setAnalysisStageIndex(0);
      setProgress(10);
      setStatusMessage("Stage 0/4 — building master lot index...");
      const masterIndex = buildMasterIndex(pagesForAnalysis);
      const expectedLots = Array.from(masterIndex.keys());
      const expectedCount = expectedLots.length;

      const chunks = buildAnalysisChunks(pagesForAnalysis);

      // STAGE 1 — Extraction
      setAnalysisStageIndex(1);
      setProgress(15);
      setStatusMessage(`Stage 1/4 — extracting lots from ${chunks.length} chunk(s)...`);
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const MIN_INTERVAL_MS = 8000;
      let lastRequestAt = 0;
      const allExtracted: any[] = [];
      const extractChunk = async (chunk: AnalysisChunk, idx: number, total: number) => {
        const elapsed = Date.now() - lastRequestAt;
        if (elapsed < MIN_INTERVAL_MS) await delay(MIN_INTERVAL_MS - elapsed);
        lastRequestAt = Date.now();
        try {
          const data = await invokeEdgeFunction<{ lots?: unknown[] }>("catalog-extract", {
            body: {
              chunkText: chunk.text,
              pageRange: `${chunk.startPage}-${chunk.endPage}`,
              chunkIndex: idx,
              totalChunks: total,
            },
          });
          return Array.isArray(data?.lots) ? data.lots : [];
        } catch (error: any) {
          const msg = error?.message || "Extract failed";
          if (/401|403|unauthorized|sign in/i.test(msg)) {
            throw new Error("Analysis service unavailable — please sign in again and retry.");
          }
          throw new Error(`Catalog extraction failed (pages ${chunk.startPage}–${chunk.endPage}): ${msg}`);
        }
      };

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setProgress(15 + Math.round((i / chunks.length) * 35));
        setStatusMessage(
          `Stage 1/4 — extracting pages ${chunk.startPage}–${chunk.endPage} (chunk ${i + 1}/${chunks.length}) · ${allExtracted.length}/${expectedCount} lots so far`
        );
        const lots = await extractChunk(chunk, i + 1, chunks.length);
        allExtracted.push(...lots);
      }

      if (!allExtracted.length) throw new Error("Stage 1 returned no lots. The PDF may not be a structured catalogue.");

      // STAGE 1b — Completeness gate: reprocess chunks containing missing lots
      const extractedKeys = () => new Set(allExtracted.map((l: any) => normaliseLotKey(l.lot_number)));
      let missingKeys = expectedLots.filter((k) => !extractedKeys().has(normaliseLotKey(k)));

      for (let attempt = 0; attempt < 2 && missingKeys.length > 0; attempt++) {
        // collect pages containing any missing lot
        const missingPages = new Set<number>();
        for (const key of missingKeys) {
          for (const p of masterIndex.get(key) ?? []) missingPages.add(p);
        }
        const reprocessChunks = chunks
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => {
            for (let p = c.startPage; p <= c.endPage; p++) if (missingPages.has(p)) return true;
            return false;
          });
        if (!reprocessChunks.length) break;
        setStatusMessage(
          `Stage 1/4 — reprocessing ${reprocessChunks.length} chunk(s) for ${missingKeys.length} missing lot(s) (attempt ${attempt + 1}/2)`
        );
        for (let j = 0; j < reprocessChunks.length; j++) {
          const { c, i } = reprocessChunks[j];
          const lots = await extractChunk(c, i + 1, chunks.length);
          // dedupe by lot_number
          const existing = extractedKeys();
          for (const lot of lots) {
            if (!existing.has(normaliseLotKey(lot.lot_number))) allExtracted.push(lot);
          }
        }
        missingKeys = expectedLots.filter((k) => !extractedKeys().has(normaliseLotKey(k)));
      }

      const completeness = {
        expected: expectedCount,
        extracted: extractedKeys().size,
        missing: missingKeys,
        confirmed: missingKeys.length === 0 && expectedCount > 0,
      };

      if (!completeness.confirmed && expectedCount > 0) {
        toast({
          title: "Partial extraction",
          description: `${completeness.extracted}/${completeness.expected} lots extracted. ${missingKeys.length} lot(s) could not be parsed — PDF downloads will be locked until completeness is confirmed.`,
          variant: "destructive",
        });
      }

      // STAGE 2 — Tavily research
      setAnalysisStageIndex(2);
      setProgress(55);
      setStatusMessage("Stage 2/4 — researching sires, dams & prior-year market intelligence...");
      const sireSet = Array.from(new Set(allExtracted.map((l: any) => l.sire).filter(Boolean))).slice(0, 25);
      const damSet = Array.from(new Set(
        allExtracted
          .filter((l: any) => l.group_listed_dam || l.black_type_sibling)
          .map((l: any) => l.dam)
          .filter(Boolean)
      )).slice(0, 15);
      const previousYear = new Date().getFullYear() - 1;

      const research = await invokeEdgeFunction("catalog-research", {
        body: {
          sires: sireSet,
          dams: damSet,
          saleName: mission.saleName,
          previousYear,
        },
      }).catch((err) => {
        console.warn("research stage error", err);
        return {};
      });

      // STAGE 3 — Analysis (scoring + narrative)
      setAnalysisStageIndex(3);
      setProgress(80);
      setStatusMessage("Stage 3/4 — scoring lots and generating analysis...");
      const analysis = await invokeEdgeFunction("catalog-analyze", {
        body: {
          extraction: allExtracted,
          research: research ?? {},
          saleMetadata: {
            saleName: mission.saleName,
            saleDate: mission.saleDate || null,
            saleLocation: mission.saleLocation || null,
            breedType: mission.breedType,
            foalingYear: mission.foalingYear ? Number(mission.foalingYear) : null,
            currency: currency.code,
          },
          userId: user?.id ?? null,
        },
      });

      // STAGE 4 — Finalise
      setAnalysisStageIndex(4);
      setProgress(100);
      setStatusMessage("Stage 4/4 — finalising shortlist & PDF templates...");

      setResult({
        scoredLots: analysis?.scored_lots ?? [],
        sections: analysis?.analysis_sections ?? {},
        shortlist: analysis?.shortlist ?? [],
        totalLots: allExtracted.length,
        marketResearch: research?.market ?? null,
        completeness,
      });

      // Log catalogue upload for monthly limit tracking
      if (user?.id) {
        await supabase.from("catalogue_uploads_log").insert({
          user_id: user.id,
          catalogue_name: pdfFile.name,
        });
        setMonthlyUploads((prev) => prev + 1);
      }

      toast({ title: "Analysis Complete", description: `${(analysis?.shortlist ?? []).length} lots shortlisted from ${allExtracted.length} catalogued.` });
    } catch (err: any) {
      console.error("Analysis failed:", err);
      toast({ title: "Analysis Failed", description: err.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const classBadgeColor = (c: string) => {
    if (c === "Elite / Black-type") return "bg-green-600 text-white";
    if (c === "Commercial") return "bg-yellow-500 text-black";
    return "bg-orange-500 text-white";
  };

  return (
    <div className="space-y-6">
      <FeatureLockModal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        featureName="Upload Auction Catalogue"
        planName={uploadCatalogueRequiredPlan}
      />
      <ExtraCatalogueModal
        open={extraCatalogueModalOpen}
        onOpenChange={setExtraCatalogueModalOpen}
      />

      <DashboardCommandCenter
        selectedSaleSlug={selectedSaleSlug}
        onSelectSale={applySaleContext}
        onCheckPotential={scrollToUpload}
      />

      {canUploadCatalogue && !isSuperAdmin && !isEnterprise && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span>Catalogue uploads this month: <strong className="text-foreground">{monthlyUploads}/{MONTHLY_LIMIT}</strong></span>
        </div>
      )}

      <div id="dashboard-quick-upload">
        <PremiumCard variant="elevated">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-secondary" />
              <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">Upload PDF pedigree</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Drop an auction catalogue or pedigree PDF for AI analysis · mission context auto-filled from selected July sale
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-border/70 rounded-xl p-6 sm:p-8 text-center hover:border-secondary/50 hover:bg-muted/20 transition-all cursor-pointer"
              onClick={() => document.getElementById("action-catalog-input")?.click()}
            >
              <input
                id="action-catalog-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="w-9 h-9 mx-auto mb-2.5 text-secondary/70" />
              <p className="text-sm font-medium text-foreground mb-1">Drop PDF here</p>
              <p className="text-xs text-muted-foreground">Up to 1500 pages · PDF only</p>
            </div>

            {pdfFile && (
              <div className="mt-4 flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/60">
                <FileText className="w-5 h-5 text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">{pageCount} pages · {(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button
                  variant="premium"
                  size="sm"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="flex-shrink-0"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                </Button>
              </div>
            )}

            {isAnalyzing && (
              <div className="mt-4">
                <AnalysisProcessingPanel
                  stages={analysisStages.map((s, i) => ({
                    ...s,
                    detail: i === analysisStageIndex ? statusMessage : undefined,
                  }))}
                  activeIndex={analysisStageIndex}
                  progress={progress}
                  statusMessage={statusMessage}
                />
              </div>
            )}
          </div>
        </PremiumCard>
      </div>

      {/* Results Panel */}
      {result && (
        <PremiumCard variant="elevated">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Selected Lots Shortlist
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-secondary font-bold">{result.shortlist.length}</span> lots shortlisted from{" "}
                  <span className="font-bold">{result.totalLots}</span> catalogued · full report available as PDF
                </p>
                {result.completeness.expected > 0 && (
                  <p className={`text-xs mt-1 ${result.completeness.confirmed ? "text-green-600" : "text-destructive"}`}>
                    {result.completeness.confirmed
                      ? `✓ Completeness confirmed: ${result.completeness.extracted}/${result.completeness.expected} lots`
                      : `⚠ Partial: ${result.completeness.extracted}/${result.completeness.expected} lots — ${result.completeness.missing.length} missing. PDFs locked.`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadShortlist} disabled={!result.completeness.confirmed}>
                  <Download className="w-4 h-4 mr-1" /> Shortlist (PDF)
                </Button>
                <Button variant="premium" size="sm" onClick={downloadFullReport} disabled={!result.completeness.confirmed}>
                  <Download className="w-4 h-4 mr-1" /> Full Report (PDF)
                </Button>
              </div>
            </div>

            {result.shortlist.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No lots scored above the shortlist threshold (70). The full report PDF still includes every catalogued lot.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.shortlist.map((lot, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 sm:p-4 bg-card flex items-start gap-3 flex-wrap">
                    <span className="text-lg font-bold text-secondary min-w-[64px]">LOT {lot.lot_number}</span>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{lot.sire ?? "?"} × {lot.dam ?? "?"}</span>
                        <Badge className={`${classBadgeColor(lot.classification)} text-[10px] px-2 py-0`}>{lot.classification}</Badge>
                        {lot.sex && <span className="text-xs text-muted-foreground uppercase">{lot.sex}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{lot.sales_hook}</p>
                      {lot.consignor && <p className="text-[11px] text-muted-foreground mt-0.5">Consignor: {lot.consignor}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
                      <p className="text-lg font-bold text-secondary">{lot.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PremiumCard>
      )}

      <DashboardFreeChat />

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
}
