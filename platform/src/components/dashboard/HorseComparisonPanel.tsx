import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, X, GitCompareArrows, Download, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { useHorseComparison, ComparisonResult, ComparisonHorse } from "@/integrations/supabase/hooks/useHorseComparison";
import { useCredits } from "@/hooks/useCredits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { generateComparisonReportPDF, downloadPdf } from "@/utils/professionalPdfReport";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#6366f1",
];

export const HorseComparisonPanel = () => {
  const [horseInputs, setHorseInputs] = useState<string[]>(["", ""]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { compareHorses } = useHorseComparison();
  const { checkHasCredits, consumeCredit, creditsRemaining, isFreePlan } = useCredits();

  const addHorse = () => {
    if (horseInputs.length < 10) setHorseInputs([...horseInputs, ""]);
  };

  const removeHorse = (idx: number) => {
    if (horseInputs.length > 2) setHorseInputs(horseInputs.filter((_, i) => i !== idx));
  };

  const updateHorse = (idx: number, value: string) => {
    const updated = [...horseInputs];
    updated[idx] = value;
    setHorseInputs(updated);
  };

  const handleCompare = async () => {
    const names = horseInputs.map(n => n.trim()).filter(Boolean);
    if (names.length < 2) return;

    const allowed = await checkHasCredits();
    if (!allowed) { setShowUpgrade(true); return; }

    try {
      const data = await compareHorses.mutateAsync(names);
      if (data) {
        setComparisonResult(data);
        const remaining = await consumeCredit();
        if (remaining === 0) setTimeout(() => setShowUpgrade(true), 1500);
      }
    } catch (error: any) {
      console.error('Comparison API Error:', { message: error?.message });
    }
  };

  const radarData = comparisonResult?.horses
    ? [
        { metric: "Speed", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.speed_rating || 0])) },
        { metric: "Consistency", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.consistency || 0])) },
        { metric: "Class", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.class_rating || 0])) },
        { metric: "Distance", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.distance_versatility || 0])) },
        { metric: "Surface", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.surface_adaptability || 0])) },
        { metric: "Earnings", fullMark: 100, ...Object.fromEntries(comparisonResult.horses.map(h => [h.name, h.scores?.earnings_index || 0])) },
      ]
    : [];

  const barData = comparisonResult?.horses?.map(h => ({
    name: h.name,
    starts: h.career?.starts || 0,
    wins: h.career?.wins || 0,
    win_pct: h.career?.win_percentage || 0,
  })) || [];

  const handleDownloadPDF = async () => {
    if (!comparisonResult) return;
    const doc = await generateComparisonReportPDF(comparisonResult);
    const names = comparisonResult.horses?.map(h => h.name).join("_vs_") || "Comparison";
    downloadPdf(doc, names, "Comparison");
  };

  return (
    <div className="space-y-4">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            Horse Comparison
          </CardTitle>
          <CardDescription>Compare 2-10 horses side by side with radar charts and detailed analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {horseInputs.map((name, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Badge variant="outline" className="min-w-[24px] justify-center">{idx + 1}</Badge>
              <Input
                placeholder={`Horse name ${idx + 1}...`}
                value={name}
                onChange={(e) => updateHorse(idx, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
              {horseInputs.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => removeHorse(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            {horseInputs.length < 10 && (
              <Button variant="outline" size="sm" onClick={addHorse}>
                <Plus className="mr-1 h-4 w-4" /> Add Horse
              </Button>
            )}
            <Button
              onClick={handleCompare}
              disabled={compareHorses.isPending || horseInputs.filter(n => n.trim()).length < 2}
              className="ml-auto"
            >
              {compareHorses.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing...</>
              ) : (
                <><GitCompareArrows className="mr-2 h-4 w-4" /> Compare</>
              )}
            </Button>
          </div>
          {isFreePlan && (
            <p className="text-xs text-muted-foreground">{creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} remaining</p>
          )}
        </CardContent>
      </Card>

      {compareHorses.isPending && (
        <AnalysisLoadingState
          title="Comparing horses"
          subtitle="Researching live data for each subject and generating a side-by-side bloodstock analysis."
        />
      )}

      {comparisonResult && !compareHorses.isPending && comparisonResult.horses?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Comparison Report</CardTitle>
                <CardDescription>{comparisonResult.horses.map(h => h.name).join(" vs ")}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" /> ⬇ Download Professional Report
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-[600px]">
            <CardContent className="space-y-6 pt-6">
              {/* Radar Chart */}
              <div className="space-y-3">
                <h3 className="font-semibold">▸ PERFORMANCE RADAR</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      {comparisonResult.horses.map((horse, i) => (
                        <Radar
                          key={horse.name}
                          name={horse.name}
                          dataKey={horse.name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Separator />

              {/* Bar Chart - Career Stats */}
              <div className="space-y-3">
                <h3 className="font-semibold">▸ CAREER COMPARISON</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      <Bar dataKey="starts" fill="hsl(var(--primary))" name="Starts" />
                      <Bar dataKey="wins" fill="#10b981" name="Wins" />
                      <Bar dataKey="win_pct" fill="#f59e0b" name="Win %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Separator />

              {/* Horse Cards */}
              <div className="space-y-3">
                <h3 className="font-semibold">▸ INDIVIDUAL PROFILES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparisonResult.horses.map((horse, i) => (
                    <div key={horse.name} className="bg-muted/50 rounded-lg p-4 space-y-2" style={{ borderLeft: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}>
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-lg">{horse.name}</h4>
                        <Badge variant="outline">{horse.status || "N/A"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Country: <strong className="text-foreground">{horse.country || "N/A"}</strong></span>
                        <span className="text-muted-foreground">YOB: <strong className="text-foreground">{horse.year_of_birth || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Sire: <strong className="text-foreground">{horse.sire || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Dam: <strong className="text-foreground">{horse.dam || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Record: <strong className="text-foreground">{horse.career?.starts || 0}-{horse.career?.wins || 0}-{horse.career?.places || 0}</strong></span>
                        <span className="text-muted-foreground">Win%: <strong className="text-foreground">{horse.career?.win_percentage || 0}%</strong></span>
                        <span className="text-muted-foreground">Earnings: <strong className="text-foreground">{horse.career?.earnings || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Class: <strong className="text-foreground">{horse.class_level || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Best Dist: <strong className="text-foreground">{horse.best_distance || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Surface: <strong className="text-foreground">{horse.surface_preference || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Trainer: <strong className="text-foreground">{horse.trainer || "N/A"}</strong></span>
                        <span className="text-muted-foreground">Speed: <strong className="text-foreground">{horse.scores?.speed_rating || 0}/100</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />

              {/* Strengths & Weaknesses */}
              {comparisonResult.strengths_weaknesses && comparisonResult.strengths_weaknesses.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold">▸ STRENGTHS & WEAKNESSES</h3>
                    <div className="space-y-3">
                      {comparisonResult.strengths_weaknesses.map((sw, i) => (
                        <div key={sw.name} className="bg-muted/50 rounded-lg p-4" style={{ borderLeft: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}>
                          <h4 className="font-bold mb-2">{sw.name}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-green-400 text-xs font-semibold">STRENGTHS</span>
                              <ul className="mt-1 space-y-1">
                                {sw.strengths?.map((s, j) => <li key={j} className="flex items-start gap-1"><span className="text-green-400">✓</span> {s}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="text-red-400 text-xs font-semibold">WEAKNESSES</span>
                              <ul className="mt-1 space-y-1">
                                {sw.weaknesses?.map((w, j) => <li key={j} className="flex items-start gap-1"><span className="text-red-400">✗</span> {w}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Best Performer & Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparisonResult.best_performer && (
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-yellow-400" /> Best Performer
                    </h4>
                    <p className="text-sm">{comparisonResult.best_performer}</p>
                  </div>
                )}
                {comparisonResult.best_value && (
                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-400" /> Best Value
                    </h4>
                    <p className="text-sm">{comparisonResult.best_value}</p>
                  </div>
                )}
              </div>

              {/* Head to Head */}
              {comparisonResult.head_to_head && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">▸ HEAD-TO-HEAD ANALYSIS</h3>
                    <div className="bg-muted/50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-line">
                      {comparisonResult.head_to_head}
                    </div>
                  </div>
                </>
              )}

              {/* Recommendation */}
              {comparisonResult.recommendation && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">▸ PROFESSIONAL RECOMMENDATION</h3>
                    <div className="bg-primary/5 p-4 rounded-lg text-sm leading-relaxed">
                      {comparisonResult.recommendation}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                <p>Comparison Report by BloodstockAI — agentbloodstockai.com</p>
                <p>Sourced from verified international bloodstock databases.</p>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

// PDF generation now handled by professionalPdfReport utility
