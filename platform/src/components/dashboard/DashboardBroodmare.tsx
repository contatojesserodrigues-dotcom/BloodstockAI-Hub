import { useState, useRef } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Loader2, Star, TrendingUp, Upload, X, Search, Download } from "lucide-react";
import { useBroodmarePlan, useBroodmarePlans } from "@/integrations/supabase/hooks/useBroodmare";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UpgradeModal } from "@/components/UpgradeModal";
import { generateBroodmareReportPDF, downloadPdf } from "@/utils/professionalPdfReport";

export const DashboardBroodmare = () => {
  const [mareName, setMareName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [breedingGoals, setBreedingGoals] = useState("");
  const [preferredSurface, setPreferredSurface] = useState("any");
  const [preferredDistance, setPreferredDistance] = useState("any");
  const [budgetMax, setBudgetMax] = useState("");
  const [countryPreference, setCountryPreference] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();
  const { createPlan } = useBroodmarePlan();
  const { data: plans, isLoading: plansLoading } = useBroodmarePlans(user?.id);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isPaidPlan, isFreePlan } = useCredits();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      
      if (!validTypes.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload only images (JPG, PNG) or PDFs", variant: "destructive" });
        return;
      }

      if (file.size > 500 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 500MB", variant: "destructive" });
        return;
      }

      setUploadedFile(file);
      toast({ title: "File attached", description: `${file.name} ready to upload` });
    }
  };

  const handleCreatePlan = async () => {
    if (gate("broodmare")) return;
    if (!mareName && !uploadedFile) {
      toast({ title: "Input required", description: "Please enter a mare name or upload a file", variant: "destructive" });
      return;
    }

    let fileData = null;
    if (uploadedFile) {
      const reader = new FileReader();
      fileData = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadedFile);
      });
    }

    try {
      const result = await createPlan.mutateAsync({
        mare_name: mareName || undefined,
        file_data: fileData || undefined,
        file_name: uploadedFile?.name || undefined,
        breeding_goals: breedingGoals || undefined,
        filters: {
          stud_fee_max: budgetMax ? parseInt(budgetMax) : undefined,
          country: countryPreference || undefined,
          type: preferredSurface !== "any" ? preferredSurface : undefined,
        },
      });

      if (result) {
        // Analysis successful
      }
    } catch (error: any) {
      console.error('Broodmare API Error:', { message: error?.message });
      grantRetry("broodmare");
      toast({ title: "Analysis Failed", description: "Please try again.", variant: "destructive" });
    }
    
    setMareName("");
    setUploadedFile(null);
    setBreedingGoals("");
    setBudgetMax("");
    setCountryPreference("");
    setPreferredSurface("any");
    setPreferredDistance("any");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      <Card>
        <CardHeader className="space-y-1 p-4 md:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg md:text-xl">Broodmare Planning</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Real-time AI breeding recommendations from global databases — broodmares, maidens & proven mares
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mare-name" className="text-sm md:text-base flex items-center gap-2">
                <Search className="w-4 h-4" />
                Mare Name
              </Label>
              <Input id="mare-name" placeholder="Enter mare name (e.g., Enable, Magical)..."
                value={mareName} onChange={(e) => setMareName(e.target.value)} className="h-10 md:h-11" />
              <p className="text-xs text-muted-foreground">AI will search global databases in real-time</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm md:text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Pedigree/Catalog (Optional)
              </Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 h-10 md:h-11">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF or Photo
                </Button>
                {uploadedFile && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setUploadedFile(null)} className="h-10 md:h-11 w-10 md:w-11 shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {uploadedFile && (
                <p className="text-xs text-muted-foreground break-all">
                  📎 {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals" className="text-sm md:text-base">Breeding Goals (Optional)</Label>
            <Textarea id="goals" placeholder="Describe your objectives: racing discipline, commercial value, specific traits, target market..."
              value={breedingGoals} onChange={(e) => setBreedingGoals(e.target.value)} rows={3}
              className="resize-none text-sm md:text-base min-h-[80px]" />
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label className="text-sm md:text-base">Stallion Filters (Optional)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Surface</Label>
                <Select value={preferredSurface} onValueChange={setPreferredSurface}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="turf">Turf</SelectItem>
                    <SelectItem value="dirt">Dirt</SelectItem>
                    <SelectItem value="aw">All-Weather</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Distance</Label>
                <Select value={preferredDistance} onValueChange={setPreferredDistance}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="sprint">Sprint (5-7f)</SelectItem>
                    <SelectItem value="middle">Middle (8-10f)</SelectItem>
                    <SelectItem value="staying">Staying (12f+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Stud Fee ($)</Label>
                <Input type="number" placeholder="No limit" value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Input placeholder="Any" value={countryPreference}
                  onChange={(e) => setCountryPreference(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>

          <Button onClick={handleCreatePlan} disabled={(!mareName && !uploadedFile) || createPlan.isPending}
            variant="premium" className="w-full h-11 md:h-12" size="lg">
            {createPlan.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm md:text-base">Generating AI Plan...</span>
              </>
            ) : (
              <>
                <Heart className="w-5 h-5 mr-2" />
                <span className="text-sm md:text-base">
                  Generate AI Breeding Plan
                </span>
              </>
            )}
          </Button>
          
          {createPlan.isPending && (
            <div className="text-center space-y-1 md:space-y-2 px-2">
              <p className="text-xs md:text-sm text-muted-foreground">
                🔍 Searching global databases in real-time...
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Analyzing pedigree, performance, market data & compatibility
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breeding Plans */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Active Breeding Plans</CardTitle>
          <CardDescription>AI-generated breeding recommendations</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {plansLoading ? (
            <div className="flex justify-center py-6 md:py-8">
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-muted-foreground" />
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {plans.slice(0, 5).map((plan) => (
                <div key={plan.id} className="p-4 md:p-5 rounded-lg border border-border hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 md:mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base md:text-lg truncate">
                        {(plan.mare as any)?.name || "Broodmare"} Breeding Plan
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Created {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                      {plan.breeding_goals && (
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2">
                          Goal: {plan.breeding_goals}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 w-fit">
                      <Star className="w-3 h-3 mr-1" />
                      <span className="text-xs">Plan</span>
                    </Badge>
                  </div>

                  {plan.recommended_stallions && Array.isArray(plan.recommended_stallions) && (
                    <div className="mb-3 md:mb-4">
                      <p className="text-xs md:text-sm font-medium mb-2 md:mb-3">Top Stallion Recommendations</p>
                      <div className="space-y-2">
                        {(plan.recommended_stallions as any[]).slice(0, 3).map((stallion, i) => (
                          <div key={i} className="p-2 md:p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm md:text-base truncate">{stallion.stallion_name}</p>
                                {stallion.reasoning && (
                                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2">{stallion.reasoning}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-secondary shrink-0 text-xs">
                                {stallion.matching_score}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] md:text-xs">
                              {stallion.estimated_offspring_value && (
                                <div className="p-2 rounded bg-background">
                                  <p className="text-muted-foreground">Est. Value</p>
                                  <p className="font-semibold truncate">${stallion.estimated_offspring_value.toLocaleString()}</p>
                                </div>
                              )}
                              {stallion.strengths && stallion.strengths.length > 0 && (
                                <div className="p-2 rounded bg-background">
                                  <p className="text-muted-foreground">Key Strength</p>
                                  <p className="font-semibold truncate">{stallion.strengths[0]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.analysis_result && (
                    <div className="space-y-2 md:space-y-3">
                      {(plan.analysis_result as any).breeding_strategy && (
                        <div className="p-2 md:p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                          <p className="text-xs md:text-sm font-medium text-secondary mb-1">Breeding Strategy</p>
                          <p className="text-[10px] md:text-xs text-foreground line-clamp-3">
                            {typeof (plan.analysis_result as any).breeding_strategy === 'string' 
                              ? (plan.analysis_result as any).breeding_strategy
                              : (plan.analysis_result as any).breeding_strategy?.recommended_approach || (plan.analysis_result as any).breeding_strategy?.primary_goal}
                          </p>
                        </div>
                      )}
                      {(plan.analysis_result as any).expected_outcomes && (
                        <div className="p-2 md:p-3 rounded-lg bg-muted/30">
                          <p className="text-xs md:text-sm font-medium mb-2">Expected Outcomes</p>
                          <div className="space-y-1 text-[10px] md:text-xs">
                            {(plan.analysis_result as any).expected_outcomes.best_case && (
                              <p className="text-muted-foreground line-clamp-2">
                                <TrendingUp className="w-3 h-3 inline mr-1 text-green-500" />
                                Best: {(plan.analysis_result as any).expected_outcomes.best_case}
                              </p>
                            )}
                            {(plan.analysis_result as any).expected_outcomes.likely_case && (
                              <p className="text-muted-foreground line-clamp-2">
                                <Star className="w-3 h-3 inline mr-1 text-secondary" />
                                Likely: {(plan.analysis_result as any).expected_outcomes.likely_case}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button variant="outline" className="w-full mt-3 md:mt-4 h-10 md:h-11 text-xs md:text-sm"
                    onClick={async () => {
                      const doc = await generateBroodmareReportPDF(plan);
                      downloadPdf(doc, (plan.mare as any)?.name || "Broodmare", "Breeding_Plan");
                    }}>
                    <Download className="w-4 h-4 mr-2" />
                    ⬇ Download Professional Report
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8 px-4">
              <Heart className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground block mb-2 md:mb-3 mx-auto" />
              <p className="text-sm md:text-base text-muted-foreground">No breeding plans yet</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Enter a mare name above to generate your first AI-powered plan
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};