import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useHorseSearch, HorseSearchResult } from "@/integrations/supabase/hooks/useHorseSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Search, Filter, Award, TrendingUp, DollarSign, Activity, Download, FileText, Loader2, Dna, AlertTriangle } from "lucide-react";
import { HorseProfileView } from "./HorseProfileView";
import { DataQualityCard, DataConfidenceBadge } from "./DataConfidenceBadge";
import { PerformanceRadarChart, DosageBarChart } from "./MatingCharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCredits } from "@/hooks/useCredits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { generateSearchReportPDF, generateSummaryReportPDF, downloadPdf } from "@/utils/professionalPdfReport";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const DashboardSearch = () => {
  const [, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    race_type: "",
    auction_class: "",
    goal: "",
  });
  const [searchResults, setSearchResults] = useState<HorseSearchResult[]>([]);
  const [completeProfile, setCompleteProfile] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [showManualPedigree, setShowManualPedigree] = useState(false);
  const [manualPedigree, setManualPedigree] = useState({
    sire: "", dam: "", dam_sire: "",
    sire_sire: "", sire_dam: "", dam_dam: "",
    sire_sire_sire: "", sire_dam_sire: "",
  });
  const [savingManual, setSavingManual] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const { searchHorses } = useHorseSearch();
  const { isPaidPlan } = useCredits();
  const { toast } = useToast();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (gate("search")) return;
    setSearchError(null);
    setCompleteProfile(null);
    setLoadingStep("Collecting data from global sources...");

    try {
      setProfileLoading(true);

      const result = await searchHorses.mutateAsync({
        horse_name: searchQuery,
        filters: {
          race_type: filters.race_type || undefined,
          auction_class: filters.auction_class || undefined,
          goal: filters.goal || undefined,
        },
      });

      const horses = result?.horses || [];

      if (result?.error) {
        setSearchResults([]);
        setSearchError(result.error);
        return;
      }

      if (horses.length > 0) {
        setSearchResults(horses);
      } else {
        setSearchResults([]);
        setSearchError("No results found. Try a different horse name or check the spelling.");
      }
    } catch (error: any) {
      console.error('Search API Error:', { message: error?.message, status: error?.status });
      setSearchError("Search failed — please try again. Please try again.");
      grantRetry("search");
      toast({
        title: "Search Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStep("");
      setProfileLoading(false);
    }
  };

  const handleDownloadReport = async (horse: HorseSearchResult) => {
    setDownloadingPdf(true);
    try {
      const doc = await generateSearchReportPDF(horse);
      downloadPdf(doc, horse.name, "Full_Analysis");
    } finally { setDownloadingPdf(false); }
  };

  const handleDownloadSummary = async (horse: HorseSearchResult) => {
    setDownloadingSummary(true);
    try {
      const doc = await generateSummaryReportPDF(horse);
      downloadPdf(doc, horse.name, "Summary");
    } finally { setDownloadingSummary(false); }
  };

  const handleSaveManualPedigree = async () => {
    if (!searchQuery.trim() || !manualPedigree.sire || !manualPedigree.dam) {
      toast({ title: "Missing data", description: "Horse name, Sire and Dam are required.", variant: "destructive" });
      return;
    }
    setSavingManual(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Not logged in", variant: "destructive" }); return; }

      await supabase.from("extracted_data").insert({
        user_id: user.id,
        source_type: "manual_pedigree",
        horse_name: searchQuery.trim(),
        pedigree_data: {
          sire: manualPedigree.sire,
          dam: manualPedigree.dam,
          dam_sire: manualPedigree.dam_sire,
          sire_sire: manualPedigree.sire_sire,
          sire_dam: manualPedigree.sire_dam,
          dam_dam: manualPedigree.dam_dam,
          sire_sire_sire: manualPedigree.sire_sire_sire,
          sire_dam_sire: manualPedigree.sire_dam_sire,
        },
      });

      setShowManualPedigree(false);
      setProfileLoading(true);
      setLoadingStep("Analyzing manual pedigree...");

      const result = await supabase.functions.invoke("ai-analysis", {
        body: {
          type: "horse_report",
          payload: `Analyze this thoroughbred using the MANUALLY PROVIDED pedigree below.
HORSE: ${searchQuery.trim()}
PEDIGREE (manually entered by user):
Sire: ${manualPedigree.sire}
Dam: ${manualPedigree.dam}
Dam Sire: ${manualPedigree.dam_sire || "Unknown"}
Sire's Sire: ${manualPedigree.sire_sire || "Unknown"}
Sire's Dam: ${manualPedigree.sire_dam || "Unknown"}
Dam's Dam: ${manualPedigree.dam_dam || "Unknown"}
SSS: ${manualPedigree.sire_sire_sire || "Unknown"}
SDS: ${manualPedigree.sire_dam_sire || "Unknown"}

Calculate Dosage (B-I-C-S-P), DI, CD, and Inbreeding from these ancestors using your internal knowledge of thoroughbred bloodlines.
Return a complete horse_report JSON.`,
        },
      });

      if (result.data && !result.error) {
        toast({ title: "Analysis complete!", description: "Manual pedigree analyzed successfully." });
        const aiData = result.data;
        const syntheticHorse: HorseSearchResult = {
          name: searchQuery.trim(),
          year_of_birth: 0,
          sex: "",
          country: "",
          current_owner: "",
          breeder: "",
          score: aiData.chartData?.performanceRadar?.values?.reduce((a: number, b: number) => a + b, 0) / 6 || 50,
          insight: aiData.executiveSummary || "Manual pedigree analysis",
          pedigree: {
            sire: manualPedigree.sire,
            dam: manualPedigree.dam,
            dam_sire: manualPedigree.dam_sire || "Unknown",
            sire_sire: manualPedigree.sire_sire,
            sire_dam: manualPedigree.sire_dam,
            dam_dam: manualPedigree.dam_dam,
            sire_sire_sire: manualPedigree.sire_sire_sire,
            sire_dam_sire: manualPedigree.sire_dam_sire,
            siblings: [],
            progeny: [],
          },
          performance: [],
          sales: [],
          inbreeding: aiData.pedigreeAssessment?.inbreeding ? {
            pattern: aiData.pedigreeAssessment.inbreeding.pattern || "",
            coefficient: String(aiData.pedigreeAssessment.inbreeding.coefficient || ""),
            assessment: aiData.pedigreeAssessment.inbreeding.assessment || "",
            details: aiData.pedigreeAssessment.inbreeding.detail || "",
          } : undefined,
          dosage: aiData.pedigreeAssessment?.dosage ? {
            profile: Object.values(aiData.pedigreeAssessment.dosage.profile || {}).join("-"),
            dosage_index: String(aiData.pedigreeAssessment.dosage.index || ""),
            center_of_distribution: String(aiData.pedigreeAssessment.dosage.cd || ""),
            distance_aptitude: aiData.pedigreeAssessment.dosage.interpretation || "",
            details: "",
          } : undefined,
          key_insights: aiData.recommendations || [],
          recommendation: aiData.executiveSummary || "",
        };
        setSearchResults([syntheticHorse]);
      } else {
        toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save pedigree", variant: "destructive" });
    } finally {
      setSavingManual(false);
      setProfileLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      {/* Search Card — Single search bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Search className="h-5 w-5 flex-shrink-0" />
                <span className="break-words">Horse Search</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Search any horse globally — country detection is automatic
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter horse name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 h-12 text-base"
            />
            <Button
              data-search-trigger
              onClick={handleSearch}
              disabled={searchHorses.isPending || profileLoading}
              className="h-12 px-6 w-full sm:w-auto"
            >
              <Search className="mr-2 h-4 w-4" />
              {searchHorses.isPending || profileLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="h-4 w-4" />
              Advanced Filters
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <Select value={filters.race_type} onValueChange={(value) => setFilters({ ...filters, race_type: value })}>
                <SelectTrigger><SelectValue placeholder="Race Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="jump">Jump</SelectItem>
                  <SelectItem value="all-weather">All Weather</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.auction_class} onValueChange={(value) => setFilters({ ...filters, auction_class: value })}>
                <SelectTrigger><SelectValue placeholder="Auction Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearling">Yearling</SelectItem>
                  <SelectItem value="foal">Foal</SelectItem>
                  <SelectItem value="racing">Racing/Training</SelectItem>
                  <SelectItem value="broodmare">Broodmare</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.goal} onValueChange={(value) => setFilters({ ...filters, goal: value })}>
                <SelectTrigger><SelectValue placeholder="Investment Goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="racing">Racing</SelectItem>
                  <SelectItem value="breeding">Breeding</SelectItem>
                  <SelectItem value="pinhooking">Pinhooking</SelectItem>
                  <SelectItem value="resale">Resale</SelectItem>
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Loading State */}
      {(searchHorses.isPending || profileLoading) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground font-medium">{loadingStep || "Collecting data from global sources..."}</p>
                <p className="text-sm text-muted-foreground">Generating AI analysis...</p>
                <Progress value={65} className="w-48 mx-auto" />
                <div className="flex gap-2 justify-center flex-wrap mt-2">
                  {["Pedigree", "Performance", "Breeding", "Market"].map((s) => (
                    <Badge key={s} variant="outline" className="animate-pulse text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Profile Data Quality */}
      {completeProfile && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Enhanced Profile: {completeProfile.identifier.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataQualityCard
              overallScore={completeProfile.dataQuality.overallScore}
              pedigreeComplete={completeProfile.dataQuality.pedigreeComplete}
              performanceVerified={completeProfile.dataQuality.performanceVerified}
              missingFields={completeProfile.dataQuality.missingFields}
              lastUpdated={completeProfile.dataQuality.lastUpdated}
            />
            <DataConfidenceBadge confidence={completeProfile.pedigree.confidence} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Dosage Index</p>
                <p className="text-lg font-bold">{completeProfile.geneticProfile.dosageIndex}</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Racing Type</p>
                <p className="text-sm font-bold">{completeProfile.geneticProfile.racingType}</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">CD</p>
                <p className="text-lg font-bold">{completeProfile.geneticProfile.centreOfDistribution}</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Dominant Lines</p>
                <p className="text-xs font-medium truncate">
                  {completeProfile.geneticProfile.dominantBloodlines.slice(0, 2).join(", ")}
                </p>
              </div>
            </div>

            {completeProfile.aiReport && (
              <div className="space-y-2">
                <p className="text-sm">{completeProfile.aiReport.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {completeProfile.aiReport.strengths.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
                {completeProfile.aiReport.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {completeProfile.aiReport.concerns.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-yellow-500/30 text-yellow-600 dark:text-yellow-400">{c}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results with Tabbed Layout */}
      {searchResults && searchResults.length > 0 && (
        <div className="space-y-6">
          {searchResults.map((horse, index) => (
            <div key={index} className="space-y-4">
              <DataConfidenceBadge
                confidence={
                  (horse as any).data_quality?.overall_score != null
                    ? (horse as any).data_quality.overall_score / 100
                    : horse.scores?.data_confidence === "High" ? 0.9
                    : horse.scores?.data_confidence === "Medium" ? 0.7
                    : 0.5
                }
              />

              <HorseProfileView horse={horse} onAncestorClick={(name) => {
                setSearchQuery(name);
                // Trigger search on next tick after state update
                requestAnimationFrame(() => {
                  const searchBtn = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
                  if (searchBtn) searchBtn.click();
                });
              }} />

              {(horse as any).chartData && (
                <div className="grid md:grid-cols-2 gap-4">
                  <PerformanceRadarChart data={(horse as any).chartData?.performanceRadar} />
                  <DosageBarChart data={(horse as any).chartData?.dosageBar} />
                </div>
              )}

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-2 flex-wrap">
                    {false ? (
                      <Button className="flex-1" onClick={() => setShowUpgrade(true)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Reports
                      </Button>
                    ) : (
                      <>
                        <Button className="flex-1 bg-[#C9A84C] hover:bg-[#b8973f] text-white" onClick={() => handleDownloadReport(horse)} disabled={downloadingPdf}>
                          {downloadingPdf ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                          ) : (
                            <><Download className="w-4 h-4 mr-2" />Full Professional Report</>
                          )}
                        </Button>
                        <Button variant="outline" className="flex-1 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10" onClick={() => handleDownloadSummary(horse)} disabled={downloadingSummary}>
                          {downloadingSummary ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                          ) : (
                            <><FileText className="w-4 h-4 mr-2" />Quick Summary</>
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setSearchParams({ tab: "performance" })}
                      className="shrink-0"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Performance Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {searchError && !searchHorses.isPending && !profileLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{searchError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Found State */}
      {searchResults && searchResults.length === 0 && !searchHorses.isPending && !profileLoading && searchQuery && !searchError && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium text-foreground">Horse not found</p>
              <p className="text-sm text-muted-foreground mt-2">
                No results found for "{searchQuery}". Try checking the exact registered name or spelling.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-primary text-primary"
                onClick={() => setShowManualPedigree(true)}
              >
                <Dna className="w-4 h-4 mr-2" />
                Enter pedigree manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Pedigree Dialog */}
      <Dialog open={showManualPedigree} onOpenChange={setShowManualPedigree}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dna className="w-5 h-5 text-primary" />
              Enter Pedigree Manually
            </DialogTitle>
            <DialogDescription>
              For horses not found in open-access databases, enter the pedigree manually. The AI will analyze it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Horse: {searchQuery || "—"}</p>
              <p>Enter the key ancestors below. Sire and Dam are required.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sire (Father) *</Label>
                <Input placeholder="e.g. Galileo" value={manualPedigree.sire} onChange={e => setManualPedigree(p => ({ ...p, sire: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dam (Mother) *</Label>
                <Input placeholder="e.g. Kind" value={manualPedigree.dam} onChange={e => setManualPedigree(p => ({ ...p, dam: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Dam's Sire (Broodmare Sire)</Label>
              <Input placeholder="e.g. Danehill" value={manualPedigree.dam_sire} onChange={e => setManualPedigree(p => ({ ...p, dam_sire: e.target.value }))} />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grandparents (optional)</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sire's Sire</Label>
                <Input placeholder="e.g. Sadler's Wells" value={manualPedigree.sire_sire} onChange={e => setManualPedigree(p => ({ ...p, sire_sire: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sire's Dam</Label>
                <Input placeholder="e.g. Urban Sea" value={manualPedigree.sire_dam} onChange={e => setManualPedigree(p => ({ ...p, sire_dam: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dam's Dam</Label>
                <Input placeholder="e.g. Rainbow Lake" value={manualPedigree.dam_dam} onChange={e => setManualPedigree(p => ({ ...p, dam_dam: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Great-Grandparents (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sire's Sire's Sire</Label>
                <Input placeholder="e.g. Northern Dancer" value={manualPedigree.sire_sire_sire} onChange={e => setManualPedigree(p => ({ ...p, sire_sire_sire: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sire's Dam's Sire</Label>
                <Input placeholder="e.g. Miswaki" value={manualPedigree.sire_dam_sire} onChange={e => setManualPedigree(p => ({ ...p, sire_dam_sire: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>

            <Button onClick={handleSaveManualPedigree} disabled={savingManual || !manualPedigree.sire || !manualPedigree.dam} className="w-full">
              {savingManual ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Dna className="w-4 h-4 mr-2" />Save & Analyze with AI</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};
