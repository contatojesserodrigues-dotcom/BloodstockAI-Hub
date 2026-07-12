import { useState } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Star, TrendingUp, Download, Award, DollarSign, Dna, Shield, Target, MapPin, Trophy, Users, Search, Sparkles } from "lucide-react";
import { useStallionSuggestion } from "@/integrations/supabase/hooks/useStallionSuggestion";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";

import { useCredits } from "@/hooks/useCredits";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UpgradeModal } from "@/components/UpgradeModal";

export const StallionFinderPanel = () => {
  const [mareName] = useState("any mare");
  const [breedingGoals, setBreedingGoals] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredSurface, setPreferredSurface] = useState("any");
  const [preferredDistance, setPreferredDistance] = useState("any");
  const [countryPreference, setCountryPreference] = useState("");
  const [query, setQuery] = useState("");
  const [influenceTags, setInfluenceTags] = useState<string[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { user } = useAuth();
  const { suggestStallions } = useStallionSuggestion();
  const { isPaidPlan } = useCredits();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const INFLUENCE_OPTIONS = [
    "Sprint", "Miler", "Classic", "Stamina", "National Hunt",
    "First Season Sire", "Proven Sire", "Commercial Sire",
  ];

  const toggleTag = (tag: string) =>
    setInfluenceTags((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const hasAnyFilter =
    !!query.trim() || !!breedingGoals.trim() || preferredSurface !== "any" ||
    preferredDistance !== "any" || !!budgetMax || !!countryPreference || influenceTags.length > 0;

  const handleSearch = async () => {
    if (!hasAnyFilter) return;
    if (gate("stallion")) return;

    try {
      const res = await suggestStallions.mutateAsync({
        mare_name: mareName.trim(),
        query: query.trim() || undefined,
        influence_tags: influenceTags.length ? influenceTags : undefined,
        breeding_goals: breedingGoals || undefined,
        budget_max: budgetMax ? parseInt(budgetMax) : undefined,
        preferred_surface: preferredSurface !== "any" ? preferredSurface as any : undefined,
        preferred_distance: preferredDistance !== "any" ? preferredDistance as any : undefined,
        country_preference: countryPreference || undefined,
      });

      if (res) {
        setResult(res);
      }
    } catch (error: any) {
      console.error('Stallion API Error:', { message: error?.message });
      grantRetry("stallion");
    }
  };

  const getScoreColor = (s: number) => s >= 80 ? "text-green-500" : s >= 60 ? "text-yellow-500" : "text-red-500";
  const getScoreBg = (s: number) => s >= 80 ? "bg-green-500/10 border-green-500/20" : s >= 60 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
  const getNickColor = (r: string) => {
    if (r?.startsWith("A")) return "text-green-500 bg-green-500/10";
    if (r?.startsWith("B")) return "text-yellow-500 bg-yellow-500/10";
    return "text-red-500 bg-red-500/10";
  };

  const ScoreBar = ({ label, value }: { label: string; value?: number }) => {
    if (value == null || isNaN(value)) return null;
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          <span className="text-[11px] font-bold">{value}</span>
        </div>
        <Progress value={Math.max(0, Math.min(100, value))} className="h-1.5" />
      </div>
    );
  };

  return (
      <div className="space-y-6">
        <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Stallion Finder
                  <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
                </CardTitle>
                <CardDescription>
                  Use the filters below to find top stallions by breeding goals, surface, distance, budget, and region
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-2">
              <Label htmlFor="sf-query" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sf-query"
                  placeholder="Stallion name, stud farm, sire, dam sire, sire line, country…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {INFLUENCE_OPTIONS.map((tag) => {
                  const active = influenceTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                        active
                          ? "bg-secondary text-secondary-foreground border-secondary"
                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sf-goals">Breeding Goals (Optional)</Label>
              <Textarea id="sf-goals" placeholder="e.g. Speed + stamina, commercial yearling, turf classic type..."
                value={breedingGoals} onChange={(e) => setBreedingGoals(e.target.value)} rows={2} className="resize-none" />
            </div>

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

            <Button onClick={handleSearch} disabled={suggestStallions.isPending || !hasAnyFilter}
              variant="premium" className="w-full h-12" size="lg">
              {suggestStallions.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-left">
                    <span className="block">🔍 Researching mare & stallion data...</span>
                    <span className="block text-xs opacity-75">🧠 Analyzing compatibility & nick patterns...</span>
                  </span>
                </span>
              ) : (
                <><Target className="w-5 h-5 mr-2" /> Find Best Stallions</>
              )}
            </Button>

            {suggestStallions.isPending && <Progress value={45} className="w-full" />}
          </CardContent>
        </Card>

        {/* ═══ RESULTS ═══ */}
        {result?.analysis && (
          <>
            {/* Mare Profile */}
            {result.analysis.mare_profile && (
              <Card className="border-secondary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Dna className="w-5 h-5 text-secondary" />
                    Mare Profile: {result.analysis.mare_profile.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Sire</p>
                      <p className="font-semibold">{result.analysis.mare_profile.sire || "—"}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Dam</p>
                      <p className="font-semibold">{result.analysis.mare_profile.dam || "—"}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Dam Sire</p>
                      <p className="font-semibold">{result.analysis.mare_profile.dam_sire || "—"}</p>
                    </div>
                  </div>
                  {result.analysis.mare_profile.racing_summary && (
                    <p className="text-sm text-muted-foreground">{result.analysis.mare_profile.racing_summary}</p>
                  )}
                  {result.analysis.mare_profile.pedigree_strengths?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {result.analysis.mare_profile.pedigree_strengths.map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {result.analysis.mare_profile.ideal_stallion_traits?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Ideal Stallion Traits
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.analysis.mare_profile.ideal_stallion_traits.map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Suggested Stallions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-secondary" />
                  Top Stallion Matches
                </CardTitle>
                <CardDescription>
                  Ranked by compatibility score — nick, inbreeding, dosage & commercial potential
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(result.analysis.suggested_stallions || []).map((stallion: any, idx: number) => (
                  <div key={idx} className={`p-4 md:p-5 rounded-xl border-2 ${getScoreBg(stallion.compatibility_score)} transition-shadow hover:shadow-md h-full flex flex-col`}>
                    {/* Header: Rank + Name + Score */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getScoreBg(stallion.compatibility_score)} ${getScoreColor(stallion.compatibility_score)}`}>
                          #{stallion.rank || idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                            {stallion.country_flag && <span className="text-xl leading-none">{stallion.country_flag}</span>}
                            {stallion.stallion_name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {stallion.sire_line && <span className="font-medium text-foreground">Line: {stallion.sire_line}</span>}
                            {stallion.country && <span>• {stallion.country}</span>}
                            {stallion.year_of_birth > 0 && <span>• b. {stallion.year_of_birth}</span>}
                            {stallion.colour && <span>• {stallion.colour}</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`text-right p-3 rounded-lg border ${getScoreBg(stallion.compatibility_score)}`}>
                        <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(stallion.compatibility_score)}`}>
                          {stallion.compatibility_score}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Score</div>
                      </div>
                    </div>

                    {/* Stud Info: Farm, Fee, Location */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {stallion.standing_at && (
                        <div className="p-2 rounded-lg border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Stud</p>
                          <p className="font-semibold text-xs truncate">{stallion.standing_at}</p>
                        </div>
                      )}
                      {stallion.farm && !stallion.standing_at && (
                        <div className="p-2 rounded-lg border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Farm</p>
                          <p className="font-semibold text-xs truncate">{stallion.farm}</p>
                        </div>
                      )}
                      {stallion.stud_fee && (
                        <div className="p-2 rounded-lg border bg-secondary/10 border-secondary/20">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Stud Fee</p>
                          <p className="font-bold text-sm text-secondary">{stallion.stud_fee}</p>
                        </div>
                      )}
                      {stallion.earnings && (
                        <div className="p-2 rounded-lg border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">Earnings</p>
                          <p className="font-semibold text-xs">{stallion.earnings}</p>
                        </div>
                      )}
                      {stallion.stud_contact && (
                        <div className="p-2 rounded-lg border bg-secondary/5 border-secondary/20 col-span-2 sm:col-span-3">
                          <p className="text-[10px] text-muted-foreground">Stud contact</p>
                          <p className="font-medium text-xs break-words">{stallion.stud_contact}</p>
                        </div>
                      )}
                      {stallion.contact_url && (
                        <div className="p-2 rounded-lg border bg-muted/30 col-span-2 sm:col-span-3">
                          <p className="text-[10px] text-muted-foreground">Website</p>
                          <p className="font-medium text-xs truncate">{stallion.contact_url}</p>
                        </div>
                      )}
                    </div>
                    {(stallion.sire || stallion.dam || stallion.dam_sire) && (
                      <div className="p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Dna className="w-3 h-3" /> Pedigree</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {stallion.sire && (
                            <div><span className="text-muted-foreground">Sire:</span> <span className="font-medium">{stallion.sire}</span></div>
                          )}
                          {stallion.dam && (
                            <div><span className="text-muted-foreground">Dam:</span> <span className="font-medium">{stallion.dam}</span></div>
                          )}
                          {stallion.dam_sire && (
                            <div><span className="text-muted-foreground">Damsire:</span> <span className="font-medium">{stallion.dam_sire}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Career record */}
                    {(stallion.career_record || stallion.career_highlights) && (
                      <div className="p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> Racing Career</p>
                        {stallion.career_record && <p className="text-xs font-medium">{stallion.career_record}</p>}
                        {stallion.career_highlights && <p className="text-xs text-muted-foreground mt-0.5">{stallion.career_highlights}</p>}
                      </div>
                    )}

                    {/* Progeny stats */}
                    {stallion.progeny_stats && (stallion.progeny_stats.runners > 0 || stallion.progeny_stats.winners > 0) && (
                      <div className="p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Progeny Statistics</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Runners:</span> <span className="font-medium">{stallion.progeny_stats.runners}</span></div>
                          <div><span className="text-muted-foreground">Winners:</span> <span className="font-medium">{stallion.progeny_stats.winners}</span></div>
                          <div><span className="text-muted-foreground">SW:</span> <span className="font-medium">{stallion.progeny_stats.stakes_winners}</span></div>
                          <div><span className="text-muted-foreground">Win%:</span> <span className="font-medium">{stallion.progeny_stats.win_percentage || "—"}</span></div>
                        </div>
                        {stallion.progeny_stats.average_earnings_per_runner && (
                          <p className="text-xs text-muted-foreground mt-1">Avg earnings/runner: {stallion.progeny_stats.average_earnings_per_runner}</p>
                        )}
                      </div>
                    )}

                    {/* Best progeny */}
                    {stallion.best_progeny?.length > 0 && (
                      <div className="p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Award className="w-3 h-3" /> Notable Progeny</p>
                        <div className="flex flex-wrap gap-1.5">
                          {stallion.best_progeny.slice(0, 5).map((p: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key metrics row: Nick, COI, Distance, Surface */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <div className={`p-2 rounded-lg border text-center ${getNickColor(stallion.nick_rating)}`}>
                        <p className="text-[10px] font-medium opacity-70">Nick Rating</p>
                        <p className="font-bold text-lg">{stallion.nick_rating || "—"}</p>
                      </div>
                      <div className="p-2 rounded-lg border bg-muted/30 text-center">
                        <p className="text-[10px] text-muted-foreground">COI</p>
                        <p className="font-bold text-sm">{stallion.inbreeding_coefficient || "—"}</p>
                      </div>
                      {stallion.predicted_foal_profile && (
                        <>
                          <div className="p-2 rounded-lg border bg-muted/30 text-center">
                            <p className="text-[10px] text-muted-foreground">Best Distance</p>
                            <p className="font-bold text-sm truncate">{stallion.predicted_foal_profile.best_distance || "—"}</p>
                          </div>
                          <div className="p-2 rounded-lg border bg-muted/30 text-center">
                            <p className="text-[10px] text-muted-foreground">Surface</p>
                            <p className="font-bold text-sm">{stallion.predicted_foal_profile.surface_preference || "—"}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Speed / Stamina bars */}
                    {stallion.predicted_foal_profile && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium">Speed</span>
                            <span className="text-xs font-bold">{stallion.predicted_foal_profile.speed_index}/10</span>
                          </div>
                          <Progress value={stallion.predicted_foal_profile.speed_index * 10} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium">Stamina</span>
                            <span className="text-xs font-bold">{stallion.predicted_foal_profile.stamina_index}/10</span>
                          </div>
                          <Progress value={stallion.predicted_foal_profile.stamina_index * 10} className="h-2" />
                        </div>
                      </div>
                    )}

                    {/* Nick justification */}
                    {stallion.nick_justification && (
                      <div className="p-2 rounded-lg bg-muted/30 mb-3">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Dna className="w-3 h-3" /> Nick Analysis</p>
                        <p className="text-xs text-muted-foreground">{stallion.nick_justification}</p>
                      </div>
                    )}

                    {/* Dosage */}
                    {stallion.dosage_analysis?.combined_profile && (
                      <div className="p-2 rounded-lg bg-muted/30 mb-3">
                        <p className="text-xs font-semibold mb-1">Dosage Profile</p>
                        <p className="text-xs text-muted-foreground">
                          {stallion.dosage_analysis.combined_profile}
                          {stallion.dosage_analysis.dosage_index && ` • DI: ${stallion.dosage_analysis.dosage_index}`}
                          {stallion.dosage_analysis.center_of_distribution && ` • CD: ${stallion.dosage_analysis.center_of_distribution}`}
                        </p>
                      </div>
                    )}

                    {/* Commercial */}
                    {stallion.commercial_projection && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {stallion.commercial_projection.estimated_yearling_value > 0 && (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-background">
                            <DollarSign className="w-4 h-4 text-secondary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Est. Yearling</p>
                              <p className="font-bold text-sm">${stallion.commercial_projection.estimated_yearling_value.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {stallion.commercial_projection.target_auction && (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-background">
                            <Award className="w-4 h-4 text-secondary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Target Auction</p>
                              <p className="font-bold text-sm truncate">{stallion.commercial_projection.target_auction}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Genetic compatibility */}
                    {stallion.genetic_compatibility?.strengths?.length > 0 && (
                      <div className="p-2 rounded-lg bg-muted/20 border border-border/30 mb-3">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Genetic Compatibility</p>
                        <div className="flex flex-wrap gap-1">
                          {stallion.genetic_compatibility.strengths.map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-green-500/5 border-green-500/20 text-green-600">{s}</Badge>
                          ))}
                        </div>
                        {stallion.genetic_compatibility.concerns?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stallion.genetic_compatibility.concerns.map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-red-500/5 border-red-500/20 text-red-600">{c}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Strengths & Risks */}
                    {(stallion.key_strengths?.length > 0 || stallion.key_risks?.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-2">
                        {stallion.key_strengths?.length > 0 && (
                          <div className="space-y-1">
                            {stallion.key_strengths.slice(0, 3).map((s: string, i: number) => (
                              <p key={i} className="text-xs flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">✓</span> {s}
                              </p>
                            ))}
                          </div>
                        )}
                        {stallion.key_risks?.length > 0 && (
                          <div className="space-y-1">
                            {stallion.key_risks.slice(0, 3).map((r: string, i: number) => (
                              <p key={i} className="text-xs flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5">⚠</span> {r}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reasoning */}
                    {stallion.reasoning && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{stallion.reasoning}</p>
                    )}

                    {/* Professional BloodstockAI Comment */}
                    {stallion.professional_comment && (
                      <div className="mt-3 p-3 rounded-lg border border-secondary/30 bg-gradient-to-br from-secondary/10 to-primary/5">
                        <p className="text-[11px] font-semibold text-secondary mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> BloodstockAI Professional Comment
                        </p>
                        <p className="text-xs leading-relaxed">{stallion.professional_comment}</p>
                        {stallion.small_recommendation && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 italic">→ {stallion.small_recommendation}</p>
                        )}
                      </div>
                    )}

                    {/* Expanded BloodstockAI Scores */}
                    {(stallion.commercial_score != null || stallion.pedigree_score != null || stallion.overall_score != null) && (
                      <div className="mt-3 p-3 rounded-lg border border-border/40 bg-muted/20">
                        <p className="text-[11px] font-semibold mb-2 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-secondary" /> BloodstockAI Scores
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <ScoreBar label="Overall" value={stallion.overall_score ?? stallion.compatibility_score} />
                          <ScoreBar label="Commercial" value={stallion.commercial_score} />
                          <ScoreBar label="Pedigree" value={stallion.pedigree_score} />
                          <ScoreBar label="Race Record" value={stallion.race_record_score} />
                          <ScoreBar label="Stud Performance" value={stallion.stud_performance_score} />
                          <ScoreBar label="Black Type Influence" value={stallion.black_type_influence} />
                          <ScoreBar label="Market Demand" value={stallion.market_demand} />
                          <ScoreBar label="Future Breeding Value" value={stallion.future_breeding_value} />
                          <ScoreBar label="Flat Suitability" value={stallion.flat_suitability} />
                          <ScoreBar label="National Hunt" value={stallion.national_hunt_suitability} />
                          <ScoreBar label="Expected ROI" value={stallion.expected_roi} />
                          <ScoreBar label="Risk" value={stallion.risk_score} />
                        </div>
                      </div>
                    )}

                    {/* Black type / champion highlights */}
                    {(stallion.black_type_summary || stallion.champion_ancestors?.length > 0 || stallion.elite_family_highlights?.length > 0) && (
                      <div className="mt-3 p-2 rounded-lg bg-muted/20 border border-border/30">
                        {stallion.black_type_summary && (
                          <p className="text-xs"><span className="font-semibold">Black Type:</span> <span className="text-muted-foreground">{stallion.black_type_summary}</span></p>
                        )}
                        {stallion.champion_ancestors?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {stallion.champion_ancestors.slice(0, 8).map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                            ))}
                          </div>
                        )}
                        {stallion.elite_family_highlights?.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            <span className="font-semibold">Female family:</span> {stallion.elite_family_highlights.join(" • ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Breeding Strategy */}
            {result.analysis.breeding_strategy && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-secondary" /> Breeding Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.analysis.breeding_strategy.primary_recommendation && (
                    <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                      <p className="text-xs font-semibold text-secondary mb-1">Primary Recommendation</p>
                      <p className="text-sm">{result.analysis.breeding_strategy.primary_recommendation}</p>
                    </div>
                  )}
                  {result.analysis.breeding_strategy.alternative_approach && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold mb-1">Alternative Approach</p>
                      <p className="text-sm text-muted-foreground">{result.analysis.breeding_strategy.alternative_approach}</p>
                    </div>
                  )}
                  {result.analysis.breeding_strategy.market_positioning && (
                    <p className="text-sm text-muted-foreground">{result.analysis.breeding_strategy.market_positioning}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Overall Assessment */}
            {result.analysis.overall_assessment && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-secondary" /> Overall Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.analysis.overall_assessment}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
      </div>
  );
};
