import { useState } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Activity, Download, Users, TrendingUp, BarChart3, Target, Gauge, GitCompareArrows, FileUp, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { AnalysisLoadingState } from "@/components/dashboard/AnalysisLoadingState";
import { usePerformanceAnalysis, PerformanceResult } from "@/integrations/supabase/hooks/usePerformanceAnalysis";
import { HorseComparisonPanel } from "./HorseComparisonPanel";
import { PerformanceProInsights } from "./PerformanceProInsights";
import { useCredits } from "@/hooks/useCredits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { generatePerformanceReportPDF, downloadPdf } from "@/utils/professionalPdfReport";
import { useToast } from "@/components/ui/use-toast";

export const DashboardPerformance = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pedigreePdf, setPedigreePdf] = useState<File | null>(null);
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState<{ title: string; subtitle: string } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const { analyzePerformance } = usePerformanceAnalysis();
  const { isPaidPlan } = useCredits();
  const { toast } = useToast();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const handleSearch = async () => {
    if (!searchQuery.trim() && !pedigreePdf) return;
    if (gate("performance")) return;

    setLoadingCopy(
      pedigreePdf
        ? {
            title: "Processing pedigree PDF",
            subtitle: "Building the master roster and researching every named horse across verified bloodstock sources.",
          }
        : {
            title: `Researching ${searchQuery.trim()}`,
            subtitle: "Cross-checking live performance data with verified bloodstock sources.",
          },
    );

    try {
      const payload: any = {};
      if (searchQuery.trim()) payload.horse_name = searchQuery.trim();
      if (pedigreePdf) {
        const buf = await pedigreePdf.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
        }
        payload.pedigree_pdf_base64 = btoa(binary);
        payload.pedigree_pdf_mime = pedigreePdf.type || "application/pdf";
      }
      const data = await analyzePerformance.mutateAsync(payload);
      if (data && !data.error) {
        setResult(data);
      } else {
        toast({ title: "Analysis Failed", description: "Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Performance API Error:', { message: error?.message });
      grantRetry("performance");
      toast({ title: "Analysis Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingCopy(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      const doc = await generatePerformanceReportPDF(result);
      downloadPdf(doc, result.horse_name || "Horse", "Performance");
    } catch (e) {
      toast({ title: "Error generating PDF", variant: "destructive" });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 50) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 70) return "secondary";
    return "destructive" as const;
  };

  const scores = result?.scores;

  return (
    <div className="space-y-6">
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-5 w-5 flex-shrink-0" />
                <span className="break-words">Performance Analysis</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Elite international performance intelligence — race record, speed figures, distance/surface/going heatmaps, pace profile, commercial intelligence, future projection and BloodstockAI consultancy commentary.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Horse / Sire / Dam / Trainer / Owner / Breeder / Country — or upload a pedigree PDF →"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild variant="outline" size="default" className="flex-1 sm:flex-none">
                <label className="cursor-pointer w-full justify-center">
                  <FileUp className="mr-2 h-4 w-4" />
                  {pedigreePdf ? "Replace PDF" : "Upload pedigree PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setPedigreePdf(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Button>
              <Button
                onClick={handleSearch}
                disabled={analyzePerformance.isPending || (!searchQuery.trim() && !pedigreePdf)}
                className="flex-1 sm:flex-none"
              >
                <Search className="mr-2 h-4 w-4" />
                {analyzePerformance.isPending ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>
          {pedigreePdf && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded p-2">
              <FileUp className="h-3.5 w-3.5" />
              <span className="truncate flex-1">{pedigreePdf.name} ({(pedigreePdf.size / 1024).toFixed(0)} KB)</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPedigreePdf(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Provide a name, a pedigree PDF, or both. With a PDF every named horse across all generations is researched across our verified bloodstock sources — no figures invented.
          </p>
          <div className="hidden">
            <Button
              onClick={handleSearch}
              disabled={analyzePerformance.isPending}
            >
              <Search className="mr-2 h-4 w-4" />
              {analyzePerformance.isPending ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button
              variant={showComparison ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              <GitCompareArrows className="mr-2 h-4 w-4" />
              {showComparison ? "Hide Comparison" : "Compare Horses"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyzePerformance.isPending && (
        <AnalysisLoadingState
          title={loadingCopy?.title ?? "Running performance analysis"}
          subtitle={loadingCopy?.subtitle ?? "Verifying pedigree and performance data from approved bloodstock sources."}
        />
      )}

      {result && !analyzePerformance.isPending && (
        <Card className="overflow-hidden">
          {/* Header - outside scroll area */}
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{result.horse_name}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {result.country && <Badge variant="outline">{result.country}</Badge>}
                  {result.year_of_birth ? <Badge variant="outline">{result.year_of_birth}</Badge> : null}
                  {result.status && <Badge variant="outline">{result.status}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  ⬇ Download Professional Report
                </Button>
                {scores && scores.speed_rating > 0 && (
                  <div className="text-right space-y-2">
                    <span className={`text-3xl font-bold ${getScoreColor(scores.speed_rating)}`}>{scores.speed_rating}/100</span>
                    <div>
                      <Badge variant={getScoreBadge(scores.speed_rating)}>
                        Speed Rating
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {scores && scores.speed_rating > 0 && <Progress value={scores.speed_rating} className="mt-4" />}
          </CardHeader>

          {/* Scrollable report content - fixed height */}
          <ScrollArea className="h-[600px]">
            <CardContent className="space-y-6 pt-6">
              {/* Master Roster (RedCap / RPR) */}
              {result.roster && result.roster.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      ▸ MASTER ROSTER ({result.roster.length} horses · RedCap / RPR)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground uppercase">
                          <tr>
                            <th className="text-left p-2">Role</th>
                            <th className="text-left p-2">Horse</th>
                            <th className="text-left p-2">RPR</th>
                            <th className="text-left p-2">Code / Trip</th>
                            <th className="text-left p-2">Record</th>
                            <th className="text-left p-2">Verified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.roster.map((r, idx) => {
                            const verified = (r.rpr_status || "").toLowerCase() === "verified";
                            return (
                              <tr key={idx} className="border-t border-border/40 hover:bg-muted/20">
                                <td className="p-2 text-muted-foreground">{r.role}</td>
                                <td className="p-2 font-medium">
                                  {r.name}{r.country ? ` (${r.country})` : ""}{r.year_of_birth ? ` ${r.year_of_birth}` : ""}
                                </td>
                                <td className="p-2 font-bold">{r.peak_rpr ?? (r.rpr_status || "n/v")}</td>
                                <td className="p-2 text-muted-foreground">
                                  {[r.code, r.trip].filter(Boolean).join(" · ") || "—"}
                                </td>
                                <td className="p-2 text-muted-foreground">
                                  {r.record_summary || "—"}
                                  {r.black_type ? <div className="text-[10px] text-secondary">{r.black_type}</div> : null}
                                </td>
                                <td className="p-2">
                                  {verified ? (
                                    <Badge variant="default" className="text-[10px]">
                                      <ShieldCheck className="h-3 w-3 mr-1" />verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      <AlertTriangle className="h-3 w-3 mr-1" />{r.rpr_status || "n/v"}
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {result.evidence_quality && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Evidence: {result.evidence_quality.verified_count ?? 0} verified · {result.evidence_quality.not_verified_count ?? 0} n/v.
                        {result.evidence_quality.note ? ` ${result.evidence_quality.note}` : ""}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Synthesis */}
              {result.synthesis && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      ▸ SYNTHESIS
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {result.synthesis.stronger_side && (
                        <div className="bg-muted/40 rounded p-3">
                          <p className="text-xs text-muted-foreground mb-1">Stronger side</p>
                          <p>{result.synthesis.stronger_side}</p>
                        </div>
                      )}
                      {result.synthesis.exact_cross_read && (
                        <div className="bg-muted/40 rounded p-3">
                          <p className="text-xs text-muted-foreground mb-1">Exact cross read</p>
                          <p>{result.synthesis.exact_cross_read}</p>
                        </div>
                      )}
                      {result.synthesis.trip_and_code && (
                        <div className="bg-muted/40 rounded p-3">
                          <p className="text-xs text-muted-foreground mb-1">Trip & code</p>
                          <p>{result.synthesis.trip_and_code}</p>
                        </div>
                      )}
                      {result.synthesis.subject_potential && (
                        <div className="bg-secondary/10 rounded p-3 border-l-2 border-secondary">
                          <p className="text-xs text-muted-foreground mb-1">Subject potential</p>
                          <p>{result.synthesis.subject_potential}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Career Overview */}
              {result.career && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      ▸ CAREER OVERVIEW
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Starts</span>
                        <p className="font-bold text-lg">{result.career.starts}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Wins</span>
                        <p className="font-bold text-lg">{result.career.wins} <span className="text-sm font-normal text-muted-foreground">({result.career.win_percentage}%)</span></p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Places</span>
                        <p className="font-bold text-lg">{result.career.places}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Unplaced</span>
                        <p className="font-bold text-lg">{result.career.unplaced}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                        <span className="text-muted-foreground text-xs">Career Earnings</span>
                        <p className="font-bold text-lg">{result.career.earnings || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Speed Figures */}
              {result.speed_figures && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary" />
                      ▸ SPEED FIGURES
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Best RPR</span>
                        <p className="font-bold text-lg">{result.speed_figures.best_rpr ?? "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Current RPR</span>
                        <p className="font-bold text-lg">{result.speed_figures.current_rpr ?? "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Best Beyer</span>
                        <p className="font-bold text-lg">{result.speed_figures.best_beyer ?? "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Best Timeform</span>
                        <p className="font-bold text-lg">{result.speed_figures.best_timeform ?? "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Avg Last 5</span>
                        <p className="font-bold text-lg">{result.speed_figures.avg_last_5 ?? "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Trend</span>
                        <p className="font-bold text-lg flex items-center gap-1">
                          {result.speed_figures.trend === "Improving" || result.speed_figures.trend === "IMPROVING" ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : null}
                          {result.speed_figures.trend || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Recent Form */}
              {result.recent_form && result.recent_form.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ LAST {result.recent_form.length} RUNS</h3>
                    <div className="space-y-3">
                      {result.recent_form.map((run, idx) => (
                        <div key={idx} className="text-sm p-3 bg-muted/50 rounded space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Run {idx + 1} — {run.date}</span>
                            <Badge variant={run.position === "1" || run.position === "1st" ? "default" : "secondary"}>
                              {run.position}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-muted-foreground">
                            <span>Race: {run.race || "N/A"}</span>
                            <span>Track: {run.track || "N/A"}</span>
                            <span>Distance: {run.distance || "N/A"}</span>
                            <span>Going: {run.going || "N/A"}</span>
                            <span>Margin: {run.margin || "N/A"}</span>
                            <span>Figure: {run.figure || "N/A"}</span>
                            <span>Jockey: {run.jockey || "N/A"}</span>
                          </div>
                          {run.comment && <p className="text-xs italic">{run.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Distance Analysis */}
              {result.distance && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      ▸ DISTANCE ANALYSIS
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Best Distance</span>
                        <p className="font-bold">{result.distance.best_distance || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Optimal Range</span>
                        <p className="font-bold">{result.distance.optimal_range || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Avoid</span>
                        <p className="font-bold">{result.distance.distances_to_avoid || "N/A"}</p>
                      </div>
                    </div>
                    {result.distance.record_by_distance && (
                      <div className="text-sm bg-muted/50 p-3 rounded">
                        <span className="text-muted-foreground text-xs">Record by Distance</span>
                        <p className="font-medium whitespace-pre-line mt-1">{result.distance.record_by_distance}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Surface Analysis */}
              {result.surface && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ SURFACE ANALYSIS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Dirt</span>
                        <p className="font-bold">{result.surface.dirt || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Turf</span>
                        <p className="font-bold">{result.surface.turf || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Synthetic</span>
                        <p className="font-bold">{result.surface.synthetic || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Preference</span>
                        <p className="font-bold">{result.surface.preference || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Confidence</span>
                        <p className="font-bold">{result.surface.confidence || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Class Analysis */}
              {result.class_analysis && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ CLASS ANALYSIS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Best Class</span>
                        <p className="font-bold">{result.class_analysis.best_class || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">G1 Record</span>
                        <p className="font-bold">{result.class_analysis.g1_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">G2 Record</span>
                        <p className="font-bold">{result.class_analysis.g2_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">G3 Record</span>
                        <p className="font-bold">{result.class_analysis.g3_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Listed</span>
                        <p className="font-bold">{result.class_analysis.listed_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Ceiling</span>
                        <p className="font-bold">{result.class_analysis.class_ceiling || "N/A"}</p>
                      </div>
                    </div>
                    {result.class_analysis.class_assessment && (
                      <div className="bg-muted/50 p-3 rounded text-sm">
                        <span className="text-muted-foreground text-xs">Assessment</span>
                        <p className="font-medium mt-1">{result.class_analysis.class_assessment}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Going Analysis */}
              {result.track_conditions && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ GOING / TRACK CONDITIONS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Fast/Firm</span>
                        <p className="font-bold">{result.track_conditions.firm_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Good</span>
                        <p className="font-bold">{result.track_conditions.good_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Soft</span>
                        <p className="font-bold">{result.track_conditions.soft_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Heavy</span>
                        <p className="font-bold">{result.track_conditions.heavy_record || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                        <span className="text-muted-foreground text-xs">Best Condition</span>
                        <p className="font-bold">{result.track_conditions.best_condition || result.track_conditions.going_preference || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Connections */}
              {result.connections && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      ▸ CONNECTIONS
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Trainer</span>
                        <p className="font-bold">{result.connections.trainer || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Trainer Win Rate</span>
                        <p className="font-bold">{result.connections.trainer_win_rate || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Owner</span>
                        <p className="font-bold">{result.connections.owner || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Jockey</span>
                        <p className="font-bold">{result.connections.jockey || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Jockey Win Rate</span>
                        <p className="font-bold">{result.connections.jockey_win_rate || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-muted-foreground text-xs">Breeder</span>
                        <p className="font-bold">{result.connections.breeder || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Scores */}
              {scores && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ PERFORMANCE SCORES</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Speed Rating</span>
                          <span className={`font-bold ${getScoreColor(scores.speed_rating)}`}>{scores.speed_rating}/100</span>
                        </div>
                        <Progress value={scores.speed_rating} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Consistency</span>
                          <span className={`font-bold ${getScoreColor(scores.consistency)}`}>{scores.consistency}/100</span>
                        </div>
                        <Progress value={scores.consistency} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-2">
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Class Level</span>
                          <p className="font-bold">{scores.class_level || "N/A"}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Distance Profile</span>
                          <p className="font-bold">{scores.distance_profile || "N/A"}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Surface</span>
                          <p className="font-bold">{scores.surface_pref || "N/A"}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Going Pref</span>
                          <p className="font-bold">{scores.going_preference || "N/A"}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Form Trend</span>
                          <p className="font-bold">{scores.form_trend || "N/A"}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">Data Confidence</span>
                          <p className="font-bold">{scores.data_confidence || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Insights */}
              {result.insights && result.insights.filter(i => i).length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ KEY INSIGHTS</h3>
                    <div className="space-y-2">
                      {result.insights.filter(i => i).map((insight, idx) => (
                        <div key={idx} className="text-sm p-2 bg-primary/5 rounded">
                          {idx + 1}. {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Recommendation */}
              {result.recommendation && (
                <div className="space-y-2">
                  <h3 className="font-semibold">▸ PERFORMANCE RECOMMENDATION</h3>
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{result.recommendation}</p>
                  </div>
                </div>
              )}

              {/* Pro Insights — Executive Summary, Radar, Timeline, Heatmaps, Pace, Race-by-Race, Commercial, Future, Commentary */}
              <PerformanceProInsights result={result} />

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                <p>Report by BloodstockAI — agentbloodstockai.com</p>
                <p>Sourced from verified international bloodstock databases.</p>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {!result && !analyzePerformance.isPending && searchQuery && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Search for a horse to see performance analysis</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Panel */}
      {showComparison && <HorseComparisonPanel />}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};

// PDF generation now handled by professionalPdfReport utility
