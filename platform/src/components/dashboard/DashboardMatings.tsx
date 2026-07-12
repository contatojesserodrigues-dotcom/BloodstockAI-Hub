import { useState } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dna, Download, Loader2, TrendingUp, Plus, X, Award, DollarSign, Sparkles, Star, MapPin, Target, Shield, AlertTriangle, CheckCircle, Flame, Upload, Info } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { UpgradeModal } from "@/components/UpgradeModal";
import { generateMatingReportPDF, downloadPdf } from "@/utils/professionalPdfReport";
import { DataConfidenceBadge } from "./DataConfidenceBadge";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

type AnalysisMode = "compare" | "suggest" | "single";

const BREEDING_OBJECTIVES = [
  "Commercial Yearling", "Breeze-Up Horse", "Early 2YO", "Sprint", "Miler",
  "Classic", "Derby", "Stayer", "National Hunt", "Owner-Breeder",
  "Future Stallion Prospect", "Future Broodmare Prospect", "Racing Performance", "Commercial ROI",
];

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-green-500 dark:text-green-400";
  if (score >= 55) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
};

const getScoreBg = (s: number) =>
  s >= 70 ? "bg-green-500/10 border-green-500/20" :
  s >= 55 ? "bg-yellow-500/10 border-yellow-500/20" :
  "bg-red-500/10 border-red-500/20";

const getNickColor = (r: string) => {
  if (r?.startsWith("A")) return "text-green-500 bg-green-500/10";
  if (r?.startsWith("B")) return "text-yellow-500 bg-yellow-500/10";
  return "text-red-500 bg-red-500/10";
};

const getRiskColor = (risk: string) => {
  if (risk === "LOW") return "text-green-500 bg-green-500/10 border-green-500/20";
  if (risk === "MEDIUM") return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  return "text-red-500 bg-red-500/10 border-red-500/20";
};

const getProgressColor = (score: number) => {
  if (score >= 70) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  return "bg-red-500";
};

export const DashboardMatings = () => {
  const [mode, setMode] = useState<AnalysisMode>("suggest");
  const [mareName, setMareName] = useState("");
  const [stallionNames, setStallionNames] = useState<string[]>([""]);
  const [breedingGoal, setBreedingGoal] = useState("");
  const [preferredSurface, setPreferredSurface] = useState("any");
  const [preferredDistance, setPreferredDistance] = useState("any");
  const [budgetMax, setBudgetMax] = useState("");
  const [countryPreference, setCountryPreference] = useState("");
  const [objective, setObjective] = useState<string>("Commercial Yearling");
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState<string>("");

  const [isPending, setIsPending] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [pedigreeData, setPedigreeData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { toast } = useToast();
  const { isPaidPlan } = useCredits();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const addStallion = () => {
    const cap = mode === "compare" ? 5 : 10;
    if (stallionNames.length < cap) {
      setStallionNames([...stallionNames, ""]);
    } else {
      toast({ title: "Maximum Reached", description: `You can compare up to ${cap} stallions at once.`, variant: "destructive" });
    }
  };

  const removeStallion = (index: number) => {
    if (stallionNames.length > 1) {
      setStallionNames(stallionNames.filter((_, i) => i !== index));
    }
  };

  const updateStallion = (index: number, value: string) => {
    const updated = [...stallionNames];
    updated[index] = value;
    setStallionNames(updated);
  };

  const handlePedigreeUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF pedigree page.", variant: "destructive" });
      return;
    }
    setExtractingPdf(true);
    setExtractedSummary("");
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const base64 = btoa(binary);
      const data = await invokeEdgeFunction("broodmare-planning", {
        requireSession: true,
        body: { extract_only: true, pedigree_pdf_base64: base64, pedigree_pdf_name: file.name },
      });
      const ped = data?.pedigree;
      if (ped?.mare_name) {
        setMareName(ped.mare_name);
        setExtractedSummary(
          `Extracted: ${ped.mare_name}${ped.year_of_birth ? ` (${ped.year_of_birth})` : ""}` +
          `${ped.sire?.name ? ` • Sire: ${ped.sire.name}` : ""}` +
          `${ped.dam?.name ? ` • Dam: ${ped.dam.name}` : ""}`
        );
        toast({ title: "Pedigree parsed", description: "Mare details auto-filled from your PDF." });
      } else {
        toast({ title: "Could not parse pedigree", description: "Please enter the mare name manually.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Upload failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setExtractingPdf(false);
    }
  };

  const handleAnalyze = async () => {
    if (gate("mating")) return;
    if (!mareName.trim()) {
      toast({ title: "Missing Information", description: "Please enter a mare name", variant: "destructive" });
      return;
    }

    if (mode === "compare" || mode === "single") {
      const validStallions = stallionNames.filter(name => name.trim() !== "");
      if (validStallions.length === 0) {
        toast({ title: "Missing Information", description: mode === "single" ? "Please enter a stallion name" : "Please enter at least one stallion name", variant: "destructive" });
        return;
      }
    }

    setIsPending(true);
    setAnalysisResult(null);
    setPedigreeData(null);

    try {
      // ═══ STEP 1: Pedigree Lookup via Perplexity ═══
      setProgressStep("Searching pedigree databases...");
      const validStallionsForLookup = stallionNames.filter(name => name.trim() !== "");
      const pedigreeResult = await invokeEdgeFunction("pedigree-lookup", {
        requireSession: true,
        body: {
          mareName: mareName.trim(),
          stallionNames: (mode === "compare" || mode === "single") ? validStallionsForLookup : undefined,
        },
      });

      if (!pedigreeResult?.found) {
        toast({
          title: "Mare Not Found",
          description: pedigreeResult?.notes || "Could not find this mare in pedigree databases. Check the spelling.",
          variant: "destructive",
        });
        setIsPending(false);
        return;
      }

      setPedigreeData(pedigreeResult);

      // ═══ STEP 2: Bloodstock Analysis via Claude Opus ═══
      setProgressStep("Running genetic compatibility analysis...");

      const validStallions = stallionNames.filter(name => name.trim() !== "");
      const backendMode: "compare" | "suggest" = mode === "suggest" ? "suggest" : "compare";
      const analysisBody: any = {
        mode: backendMode,
        pedigree: pedigreeResult,
        stallionPedigrees: pedigreeResult.stallion_pedigrees || [],
        objective,
        maxStudFee: budgetMax || undefined,
        surface: preferredSurface !== "any" ? preferredSurface : undefined,
        distance: preferredDistance !== "any" ? preferredDistance : undefined,
        country: countryPreference || undefined,
        breedingGoal: breedingGoal || undefined,
      };

      if (backendMode === "compare") {
        analysisBody.stallionsToCompare = validStallions;
      } else {
        analysisBody.stallionsConsidered = validStallions.length > 0 ? validStallions : undefined;
      }

      const analysisRes = await invokeEdgeFunction("bloodstock-analysis", {
        requireSession: true,
        body: analysisBody,
      });

      if (!analysisRes?.analysis) throw new Error("Invalid analysis response");

      setAnalysisResult(analysisRes.analysis);

      toast({
        title: "Analysis Complete!",
        description: `${mode === "suggest" ? "Stallion suggestions" : "Comparison"} ready for ${pedigreeResult.name}`,
      });
    } catch (error: any) {
      console.error("Mating Analysis Error:", error?.message);
      grantRetry("mating");
      toast({
        title: "Analysis Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
      setProgressStep("");
    }
  };

  // ═══ STALLION CARD — shared renderer for both modes ═══
  const renderStallionCard = (stallion: any, idx: number) => {
    const score = stallion.total_score || 0;
    const bd = stallion.score_breakdown || {};
    const foal = stallion.projected_foal || {};

    return (
      <div key={idx} className={`p-4 md:p-5 rounded-xl border-2 ${getScoreBg(score)} transition-shadow hover:shadow-md`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getScoreBg(score)} ${getScoreColor(score)}`}>
              #{stallion.rank || idx + 1}
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                {stallion.name}
                {stallion.hype_flag && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <Flame className="w-3 h-3" /> HYPE
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {stallion.origin && <span>{stallion.origin}</span>}
                {stallion.farm && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{stallion.farm}</span>}
                {stallion.fee > 0 && <span>• Fee: ${stallion.fee.toLocaleString()}</span>}
              </div>
            </div>
          </div>
          <div className={`text-right p-3 rounded-lg border ${getScoreBg(score)}`}>
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</div>
            <div className="text-[10px] text-muted-foreground">Score</div>
          </div>
        </div>

        {/* Maiden discount flag */}
        {stallion.maiden_discount_applied && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Maiden mare — yearling estimate discounted 20%
          </div>
        )}

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className={`p-2 rounded-lg border text-center ${getNickColor(bd.nick_rating || "")}`}>
            <p className="text-[10px] font-medium opacity-70">Nick Rating</p>
            <p className="font-bold text-lg">{bd.nick_rating || "—"}</p>
          </div>
          <div className="p-2 rounded-lg border bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">COI</p>
            <p className="font-bold text-sm">{bd.coi_percent ? `${bd.coi_percent}%` : "—"}</p>
          </div>
          <div className="p-2 rounded-lg border bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">Dosage Index</p>
            <p className="font-bold text-sm">{bd.dosage_index_projected || "—"}</p>
          </div>
          <div className={`p-2 rounded-lg border text-center ${getRiskColor(stallion.risk_level || "")}`}>
            <p className="text-[10px] font-medium opacity-70">Risk</p>
            <p className="font-bold text-sm">{stallion.risk_level || "—"}</p>
          </div>
        </div>

        {/* Speed/Stamina bars */}
        {(bd.speed_index > 0 || bd.stamina_index > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium">Speed</span>
                <span className="text-xs font-bold">{bd.speed_index}/100</span>
              </div>
              <div className="relative">
                <Progress value={bd.speed_index} className="h-2" />
                <div className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(bd.speed_index)}`}
                  style={{ width: `${bd.speed_index}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium">Stamina</span>
                <span className="text-xs font-bold">{bd.stamina_index}/100</span>
              </div>
              <div className="relative">
                <Progress value={bd.stamina_index} className="h-2" />
                <div className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(bd.stamina_index)}`}
                  style={{ width: `${bd.stamina_index}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Projected Foal */}
        {foal.best_distance && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Best Distance</p>
              <p className="font-bold text-sm truncate">{foal.best_distance}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Surface</p>
              <p className="font-bold text-sm">{foal.surface || "—"}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Runner Type</p>
              <p className="font-bold text-sm truncate">{foal.runner_type || "—"}</p>
            </div>
          </div>
        )}

        {/* Nick Analysis */}
        {stallion.nick_analysis && (
          <div className="p-2 rounded-lg bg-muted/30 mb-3">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Dna className="w-3 h-3" /> Nick Analysis</p>
            <p className="text-xs text-muted-foreground">{stallion.nick_analysis}</p>
          </div>
        )}

        {/* COI Note */}
        {bd.coi_ancestor_note && (
          <div className={`p-2 rounded-lg border mb-3 ${
            (bd.coi_percent || 0) > 8 ? "bg-red-500/5 border-red-500/20" :
            (bd.coi_percent || 0) > 5 ? "bg-yellow-500/5 border-yellow-500/20" :
            "bg-green-500/5 border-green-500/20"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {(bd.coi_percent || 0) <= 5 ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (bd.coi_percent || 0) > 8 ? (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              ) : (
                <Shield className="w-3 h-3 text-yellow-500" />
              )}
              <p className="text-xs font-semibold">
                Inbreeding: COI {bd.coi_percent}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{bd.coi_ancestor_note}</p>
          </div>
        )}

        {/* Hype explanation */}
        {stallion.hype_flag && stallion.hype_explanation && (
          <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20 mb-3">
            <p className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3" /> Hype Alert
            </p>
            <p className="text-xs text-muted-foreground">{stallion.hype_explanation}</p>
          </div>
        )}

        {/* Risk explanation */}
        {stallion.risk_explanation && (
          <div className="p-2 rounded-lg bg-muted/30 mb-3">
            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Risk Assessment
            </p>
            <p className="text-xs text-muted-foreground">{stallion.risk_explanation}</p>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 mb-3">
          {[
            { label: "Nick", value: bd.nick_points },
            { label: "COI", value: bd.coi_points },
            { label: "Dosage", value: bd.dosage_points },
            { label: "Perf.", value: bd.performance_points },
            { label: "Comm.", value: bd.commercial_points },
            { label: "Risk", value: bd.risk_penalty, isNeg: true },
          ].map((item) => (
            <div key={item.label} className="p-1.5 rounded bg-muted/30 text-center">
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <p className={`font-bold text-xs ${item.isNeg && (item.value || 0) < 0 ? "text-red-500" : ""}`}>
                {item.value != null ? (item.isNeg && (item.value || 0) < 0 ? item.value : `+${item.value}`) : "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Commercial row */}
        {stallion.est_yearling_value > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-background">
              <DollarSign className="w-4 h-4 text-secondary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Est. Yearling</p>
                <p className="font-bold text-sm">${stallion.est_yearling_value.toLocaleString()}</p>
              </div>
            </div>
            {stallion.target_auction && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-background">
                <Award className="w-4 h-4 text-secondary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Target Auction</p>
                  <p className="font-bold text-sm truncate">{stallion.target_auction}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {stallion.summary && (
          <p className="text-xs text-muted-foreground mt-2 italic">{stallion.summary}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Dna className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <CardTitle>AI Mating Plan</CardTitle>
              <CardDescription>
                Institution-grade stallion selection — pedigree science, commercial intelligence, performance projection and AI reasoning in one workflow.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quality hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/5 border border-secondary/20 text-xs">
            <Info className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              The more information you provide (pedigree PDF, produce record, racing record, target market, budget), the deeper and more accurate your Mating Plan will be.
            </p>
          </div>

          {/* Mode Toggle — 3 options */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setMode("suggest")}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "suggest" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Auto Select
            </button>
            <button
              onClick={() => { setMode("single"); setStallionNames([stallionNames[0] || ""]); }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="w-4 h-4" /> Single Stallion
            </button>
            <button
              onClick={() => setMode("compare")}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "compare" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Dna className="w-4 h-4" /> Compare (up to 5)
            </button>
          </div>

          {/* PDF Pedigree Upload */}
          <div className="space-y-2">
            <Label>Step 1 — Broodmare Pedigree (Optional PDF Upload)</Label>
            <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-secondary/50 cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {extractingPdf ? "Extracting pedigree…" : "Upload pedigree PDF (Weatherbys, Equineline, Tattersalls, Goffs, Arqana, Keeneland, OBS, Fasig-Tipton, Magic Millions, Inglis)"}
                </p>
                {extractedSummary && <p className="text-xs text-secondary mt-1">{extractedSummary}</p>}
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={extractingPdf}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePedigreeUpload(f);
                }}
              />
              {extractingPdf && <Loader2 className="w-4 h-4 animate-spin text-secondary" />}
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mare">Mare Name {extractedSummary && <span className="text-xs text-secondary">(auto-filled)</span>}</Label>
            <Input
              id="mare"
              placeholder="Enter mare name (e.g., Enable, Zenyatta, any broodmare or maiden)"
              value={mareName}
              onChange={(e) => setMareName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Or type the mare name — AI will search globally across pedigree databases.
            </p>
          </div>

          {(mode === "compare" || mode === "single") && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{mode === "single" ? "Stallion" : "Stallions (up to 5)"}</Label>
                  {mode === "compare" && (
                    <Button type="button" variant="outline" size="sm" onClick={addStallion} disabled={stallionNames.length >= 5}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stallion
                    </Button>
                  )}
                </div>
                {(mode === "single" ? stallionNames.slice(0, 1) : stallionNames).map((name, index) => (
                  <div key={index} className="flex gap-2">
                    <Input placeholder={mode === "single" ? "e.g. Frankel, Dubawi, Too Darn Hot" : `Stallion ${index + 1} name`} value={name}
                      onChange={(e) => updateStallion(index, e.target.value)} />
                    {mode === "compare" && stallionNames.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStallion(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <Separator />

          {/* Breeding Goals & Filters */}
          <div className="space-y-4">
            <Label>Step 2 — Breeding Objective & Filters</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Breeding Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BREEDING_OBJECTIVES.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Surface</Label>
                <Select value={preferredSurface} onValueChange={setPreferredSurface}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="Turf">Turf</SelectItem>
                    <SelectItem value="Dirt">Dirt</SelectItem>
                    <SelectItem value="Synthetic">Synthetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Distance</Label>
                <Select value={preferredDistance} onValueChange={setPreferredDistance}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="Sprint">Sprint (5-7f)</SelectItem>
                    <SelectItem value="Middle">Middle (8-10f)</SelectItem>
                    <SelectItem value="Classic">Classic (10-12f)</SelectItem>
                    <SelectItem value="Staying">Staying (12f+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Stud Fee ($)</Label>
                <Input type="number" placeholder="No limit" value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Country Preference</Label>
                <Input placeholder="Any (e.g. USA, IRE, FR, GB, BRZ)" value={countryPreference}
                  onChange={(e) => setCountryPreference(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Breeding Goal (Optional)</Label>
                <Input placeholder="e.g. Speed + stamina, commercial yearling, turf classic type..."
                  value={breedingGoal} onChange={(e) => setBreedingGoal(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={isPending || !mareName.trim()}
            className="w-full" size="lg" variant={mode === "suggest" ? "premium" : "default"}>
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <div className="text-left">
                  <div>{progressStep || "Processing..."}</div>
                  <div className="text-xs opacity-75 flex items-center gap-1"><Dna className="w-3 h-3" /> BloodstockAI genetic analysis in progress...</div>
                </div>
              </>
            ) : (
              <>
                {mode === "suggest" ? null : <Dna className="w-5 h-5 mr-2" />}
                {mode === "suggest" ? "Generate AI Mating Plan" : mode === "single" ? "Analyze Single Stallion" : "Compare Stallions"}
              </>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center italic">
            All monetary figures are evidence-based projections from historical market trends — not guaranteed sale prices.
          </p>

          {isPending && <Progress value={progressStep.includes("genetic") ? 65 : 30} className="w-full" />}

          {/* PDF Download Button */}
          {analysisResult && (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const doc = await generateMatingReportPDF(analysisResult);
                  downloadPdf(doc, mareName, "Mating_Analysis");
                  toast({ title: "PDF Downloaded", description: "Your mating analysis report has been saved." });
                } catch (err) {
                  toast({ title: "PDF Generation Failed", description: "Could not generate report. Please try again.", variant: "destructive" });
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Full Report (PDF)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ═══ PEDIGREE FOUND — MARE PROFILE ═══ */}
      {analysisResult?.mare_profile && (
        <Card className="border-secondary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dna className="w-5 h-5 text-secondary" />
              Mare Profile: {analysisResult.mare_profile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataConfidenceBadge confidence={(analysisResult.mare_profile.confidence_score || 85) / 100} />

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Sire</p>
                <p className="font-semibold">{analysisResult.mare_profile.sire || "—"}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Dam</p>
                <p className="font-semibold">{analysisResult.mare_profile.dam || "—"}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Dam Sire</p>
                <p className="font-semibold">{analysisResult.mare_profile.dam_sire || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {analysisResult.mare_profile.dosage_profile && (
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Dosage Profile</p>
                  <p className="font-semibold text-xs">{analysisResult.mare_profile.dosage_profile}</p>
                </div>
              )}
              {analysisResult.mare_profile.dosage_index > 0 && (
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Dosage Index</p>
                  <p className="font-semibold">{analysisResult.mare_profile.dosage_index}</p>
                </div>
              )}
              {analysisResult.mare_profile.distance_tendency && (
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-semibold text-xs">{analysisResult.mare_profile.distance_tendency}</p>
                </div>
              )}
              {analysisResult.mare_profile.surface_tendency && (
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Surface</p>
                  <p className="font-semibold text-xs">{analysisResult.mare_profile.surface_tendency}</p>
                </div>
              )}
            </div>

            {analysisResult.mare_profile.is_maiden && (
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Maiden Mare — all yearling estimates discounted, conservative stallion selection applied
              </div>
            )}

            {analysisResult.mare_profile.racing_record && (
              <p className="text-sm text-muted-foreground">{analysisResult.mare_profile.racing_record}</p>
            )}

            {analysisResult.mare_profile.pedigree_traits?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysisResult.mare_profile.pedigree_traits.map((s: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}

            {analysisResult.mare_profile.ideal_stallion_traits?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Ideal Stallion Traits
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.mare_profile.ideal_stallion_traits.map((t: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ SUGGEST RESULTS ═══ */}
      {analysisResult?.analysis_mode === "suggest" && analysisResult.stallion_suggestions?.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-secondary" />
                Top Stallion Suggestions
              </CardTitle>
              <CardDescription>
                Ranked by weighted score — Nick, COI, Dosage, Speed/Stamina & Commercial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisResult.stallion_suggestions.map((stallion: any, idx: number) =>
                renderStallionCard(stallion, idx)
              )}
            </CardContent>
          </Card>

          {/* Breeding Strategy */}
          {analysisResult.breeding_strategy && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" /> Breeding Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysisResult.breeding_strategy.primary_recommendation && (
                  <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                    <p className="text-xs font-semibold text-secondary mb-1">Primary Recommendation</p>
                    <p className="text-sm">{analysisResult.breeding_strategy.primary_recommendation}</p>
                  </div>
                )}
                {analysisResult.breeding_strategy.alternative_approach && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold mb-1">Alternative Approach</p>
                    <p className="text-sm text-muted-foreground">{analysisResult.breeding_strategy.alternative_approach}</p>
                  </div>
                )}
                {analysisResult.breeding_strategy.hype_alert && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Hype Alert
                    </p>
                    <p className="text-sm text-muted-foreground">{analysisResult.breeding_strategy.hype_alert}</p>
                  </div>
                )}
                {analysisResult.breeding_strategy.timing_note && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold mb-1">Timing</p>
                    <p className="text-sm text-muted-foreground">{analysisResult.breeding_strategy.timing_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══ COMPARE RESULTS ═══ */}
      {analysisResult?.analysis_mode === "compare" && analysisResult.comparison_results?.length > 0 && (
        <>
          {/* Rankings Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Stallion Rankings</CardTitle>
              <CardDescription>Ranked by weighted compatibility score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult.comparison_results.map((stallion: any) => {
                  const score = stallion.total_score || 0;
                  return (
                    <div key={stallion.rank} className={`flex items-center gap-4 p-4 border-2 rounded-lg ${getScoreBg(score)}`}>
                      <div className={`w-12 h-12 rounded-full font-bold text-lg flex items-center justify-center ${getScoreBg(score)} ${getScoreColor(score)}`}>
                        #{stallion.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{stallion.name}</span>
                          <Badge variant="outline" className={`${getScoreColor(score)} border-current`}>
                            Score: {score}
                          </Badge>
                          {stallion.hype_flag && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Flame className="w-3 h-3" /> HYPE
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{stallion.summary}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Individual Stallion Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-secondary" />
                Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisResult.comparison_results.map((stallion: any, idx: number) =>
                renderStallionCard(stallion, idx)
              )}
            </CardContent>
          </Card>

          {/* Comparative Analysis */}
          {analysisResult.comparative_analysis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-secondary" /> Comparative Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "best_nick_match", label: "Best Nick Match", icon: <Dna className="w-4 h-4 text-green-500" /> },
                  { key: "best_value", label: "Best Value", icon: <DollarSign className="w-4 h-4 text-secondary" /> },
                  { key: "safest_pick", label: "Safest Pick", icon: <Shield className="w-4 h-4 text-blue-500" /> },
                  { key: "best_for_performance", label: "Best for Performance", icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
                  { key: "best_for_commercial", label: "Best for Commercial", icon: <Star className="w-4 h-4 text-yellow-500" /> },
                ].map(({ key, label, icon }) => {
                  const item = analysisResult.comparative_analysis[key];
                  if (!item?.stallion) return null;
                  return (
                    <div key={key} className="p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2 mb-1">
                        {icon}
                        <p className="text-xs font-semibold">{label}: <span className="text-foreground">{item.stallion}</span></p>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  );
                })}

                {/* Hype Traps */}
                {analysisResult.comparative_analysis.hype_traps?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1 text-red-500">
                      <Flame className="w-3 h-3" /> Hype Traps
                    </p>
                    {analysisResult.comparative_analysis.hype_traps.map((trap: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <p className="text-xs font-semibold text-red-500">{trap.stallion}</p>
                        <p className="text-xs text-muted-foreground">{trap.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Breeding Strategy for compare */}
          {analysisResult.breeding_strategy && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" /> Breeding Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysisResult.breeding_strategy.primary_recommendation && (
                  <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                    <p className="text-xs font-semibold text-secondary mb-1">Primary Recommendation</p>
                    <p className="text-sm">{analysisResult.breeding_strategy.primary_recommendation}</p>
                  </div>
                )}
                {analysisResult.breeding_strategy.alternative_approach && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold mb-1">Alternative Approach</p>
                    <p className="text-sm text-muted-foreground">{analysisResult.breeding_strategy.alternative_approach}</p>
                  </div>
                )}
                {analysisResult.breeding_strategy.timing_note && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold mb-1">Timing</p>
                    <p className="text-sm text-muted-foreground">{analysisResult.breeding_strategy.timing_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};
