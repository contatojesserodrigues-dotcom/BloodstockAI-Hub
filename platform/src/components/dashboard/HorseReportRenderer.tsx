import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Award, TrendingUp, Dna, Target, BarChart3, 
  Lightbulb, Star, Zap, Activity, Users, Trophy
} from "lucide-react";
import { PedigreeTree } from "./PedigreeTree";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import type { 
  HorseSearchResult, HorseInbreeding, HorseDosage, 
  HorseNickAnalysis, HorseCareerStats, HorseSiblingsAnalysis, HorseScores 
} from "@/integrations/supabase/hooks/useHorseSearch";

interface HorseReportRendererProps {
  insight: string;
  horseName: string;
  horseData?: HorseSearchResult;
}

const SectionCard = ({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
}) => (
  <Card className="border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const sanitizeDisplayText = (value?: string | null) => {
  if (!value) return "Data unavailable";

  const cleaned = value
    .replace(/Not found in verified sources(?:\s*[-—]\s*checked:[^\n]*)?/gi, "Data unavailable")
    .replace(/checked:\s*[^\n]+/gi, "")
    .trim();

  return cleaned || "Data unavailable";
};

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-start py-1.5 text-sm border-b border-border/30 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground text-right max-w-[60%]">{sanitizeDisplayText(value)}</span>
  </div>
);

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getRatingColor(rating: string): string {
  const upper = rating.toUpperCase();
  if (upper.includes("ELITE") || upper.includes("AAA") || upper.includes("EXCEPTIONAL") || upper.includes("HIGH"))
    return "text-green-600 dark:text-green-400";
  if (upper.includes("PROMISING") || upper.includes("AA") || upper.includes("GOOD") || upper.includes("MEDIUM"))
    return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

// ─── STRUCTURED DATA RENDERER ───
function renderFromStructuredData(horse: HorseSearchResult) {
  const pedigree = horse.pedigree;
  const inbreeding = horse.inbreeding;
  const dosage = horse.dosage;
  const nick = horse.nick_analysis;
  const career = horse.career_stats;
  const siblingsData = horse.siblings_analysis;
  const scores = horse.scores;
  const insights = horse.key_insights || [];
  const recommendation = horse.recommendation || "";

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Star className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">BloodstockAI Analysis Report</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {horse.name}
          {horse.country && <span className="text-muted-foreground font-normal text-base ml-2">| {horse.country}</span>}
          {horse.year_of_birth > 0 && <span className="text-muted-foreground font-normal text-base ml-2">| {horse.year_of_birth}</span>}
        </h2>
        <div className="flex gap-2 mt-2 flex-wrap">
          {horse.sex && <Badge variant="outline">{horse.sex}</Badge>}
          {horse.color && <Badge variant="outline">{horse.color}</Badge>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
          {horse.current_owner && sanitizeDisplayText(horse.current_owner) !== "Data unavailable" && (
            <div className="flex gap-2">
              <span className="text-muted-foreground font-medium">Owner:</span>
              <span className="text-foreground">{sanitizeDisplayText(horse.current_owner)}</span>
            </div>
          )}
          {horse.breeder && sanitizeDisplayText(horse.breeder) !== "Data unavailable" && (
            <div className="flex gap-2">
              <span className="text-muted-foreground font-medium">Breeder:</span>
              <span className="text-foreground">{sanitizeDisplayText(horse.breeder)}</span>
            </div>
          )}
          {horse.trainer && (
            <div className="flex gap-2">
              <span className="text-muted-foreground font-medium">Trainer:</span>
              <span className="text-foreground">{sanitizeDisplayText(horse.trainer)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sales History */}
      {horse.sales && horse.sales.length > 0 && horse.sales[0]?.sale_price > 0 && (
        <SectionCard icon={TrendingUp} title="Sales History">
          <div className="space-y-2">
            {horse.sales.map((sale, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                <div>
                  <span className="font-medium">{sale.sale_name || sale.auction_house || "Sale"}</span>
                  {sale.date && <span className="text-muted-foreground ml-2">{sale.date}</span>}
                  {sale.buyer && <span className="text-muted-foreground ml-2">→ {sale.buyer}</span>}
                </div>
                <Badge variant="default">
                  {sale.currency || "EUR"} {(sale.sale_price || 0).toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Pedigree Tree (5 Generations) */}
      {pedigree && (
        <PedigreeTree pedigree={pedigree} horseName={horse.name} />
      )}

      {/* Inbreeding Analysis */}
      {inbreeding && inbreeding.pattern && (
        <SectionCard icon={Dna} title="Inbreeding Analysis">
          <div className="space-y-1">
            <DataRow label="Pattern" value={inbreeding.pattern} />
            <DataRow label="Coefficient" value={inbreeding.coefficient || "N/A"} />
            <DataRow label="Assessment" value={inbreeding.assessment || "N/A"} />
            {inbreeding.details && (
              <p className="text-sm text-muted-foreground mt-2">{inbreeding.details}</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Dosage Analysis */}
      {dosage && dosage.profile && (
        <SectionCard icon={BarChart3} title="Dosage Analysis">
          <div className="space-y-1">
            <DataRow label="Profile (B-I-C-S-P)" value={dosage.profile} />
            <DataRow label="Dosage Index (DI)" value={dosage.dosage_index || "N/A"} />
            <DataRow label="Center of Distribution (CD)" value={dosage.center_of_distribution || "N/A"} />
            <DataRow label="Distance Aptitude" value={dosage.distance_aptitude || "N/A"} />
            {dosage.details && (
              <p className="text-sm text-muted-foreground mt-2">{dosage.details}</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Nick Analysis */}
      {nick && nick.cross && (
        <SectionCard icon={Target} title="Nick Analysis">
          <div className="space-y-1">
            <DataRow label="Cross" value={nick.cross} />
            <DataRow label="Nick Rating" value={nick.rating || "N/A"} />
            <DataRow label="Stakes Winners from Cross" value={nick.stakes_winners_from_cross || "Unknown"} />
            {nick.justification && (
              <p className="text-sm text-muted-foreground mt-2">{nick.justification}</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Siblings Analysis */}
      {siblingsData && (
        <SectionCard icon={Users} title="Siblings Analysis">
          <div className="space-y-1">
            <DataRow label="Total Foals from Dam" value={String(siblingsData.total_foals || 0)} />
            <DataRow label="Raced" value={String(siblingsData.total_raced || 0)} />
            <DataRow label="Winners" value={String(siblingsData.total_winners || 0)} />
            <DataRow label="Stakes Winners" value={`${siblingsData.stakes_winners || 0} (${siblingsData.stakes_percentage || "0%"})`} />
            <DataRow label="Best Sibling" value={siblingsData.best_sibling || "N/A"} />
            <DataRow label="Dam Rating" value={siblingsData.dam_rating || "N/A"} />
            {siblingsData.details && siblingsData.details.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Individual Siblings</p>
                {siblingsData.details.map((sib, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{sib.name}</span>
                      <span className="text-muted-foreground ml-2">({sib.year}, by {sib.sire})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">{sib.record}</span>
                      {sib.best_achievement && (
                        <Badge variant="outline" className="ml-2 text-xs">{sib.best_achievement}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Career / Performance Record */}
      {career && (
        <SectionCard icon={Trophy} title="Career Overview">
          <div className="space-y-1">
            <DataRow label="Record (S-W-2nd-3rd)" value={`${career.starts}-${career.wins}-${career.seconds}-${career.thirds}`} />
            <DataRow label="Win Rate" value={career.win_rate || "N/A"} />
            <DataRow label="Earnings" value={`${career.earnings_currency || ""} ${(career.earnings || 0).toLocaleString()}`} />
            <DataRow label="Best Speed Figure" value={career.best_speed_figure || "N/A"} />
            <DataRow label="Best Distance" value={career.best_distance || "N/A"} />
            <DataRow label="Best Surface" value={career.best_surface || "N/A"} />
            <DataRow label="Highest Class" value={career.highest_class || "N/A"} />
          </div>
        </SectionCard>
      )}

      {/* Recent Races */}
      {horse.performance && horse.performance.length > 0 && (
        <SectionCard icon={Activity} title={`Race Record (${horse.performance.length} races)`}>
          <div className="space-y-2">
            {horse.performance.slice(0, 8).map((race, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                <div>
                  <span className="font-medium">{race.race_name || race.track}</span>
                  <span className="text-muted-foreground ml-2">{race.track}</span>
                  <span className="text-muted-foreground ml-2">{race.date}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={race.position <= 3 ? "default" : "secondary"}>
                    {race.position === 1 ? "1st" : race.position === 2 ? "2nd" : race.position === 3 ? "3rd" : `${race.position}th`}
                  </Badge>
                  <Badge variant="outline">{race.race_type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Charts — Performance Curve */}
      {(horse as any).chart_data?.performance_by_race?.length > 0 && (
        <SectionCard icon={BarChart3} title="Performance Curve">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={(horse as any).chart_data.performance_by_race}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="race" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="figure" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Charts — Distance Breakdown */}
      {(horse as any).chart_data?.distance_breakdown?.length > 0 && (
        <SectionCard icon={Target} title="Performance by Distance">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(horse as any).chart_data.distance_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="distance" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              <Bar dataKey="wins" fill="hsl(var(--primary))" name="Wins" radius={[4, 4, 0, 0]} />
              <Bar dataKey="starts" fill="hsl(var(--muted))" name="Starts" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Charts — Sales History */}
      {(horse as any).chart_data?.sales_history_chart?.length > 0 && (
        <SectionCard icon={TrendingUp} title="Sales History Trend">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(horse as any).chart_data.sales_history_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="sale" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Price"]} />
              <Bar dataKey="price" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Scores & Ratings */}
      {scores && (
        <SectionCard icon={Award} title="Scores & Ratings">
          <div className="space-y-3">
            {/* Radar Chart for scores */}
            {scores.pedigree_quality > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={[
                  { subject: "Pedigree", value: scores.pedigree_quality || 0 },
                  { subject: "Performance", value: scores.performance_rating || 0 },
                  { subject: "Nick", value: scores.nick_score || 0 },
                  { subject: "Dosage", value: scores.dosage_score || 0 },
                  { subject: "Overall", value: scores.overall || 0 },
                ]}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Scores" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
            {[
              { label: "Pedigree Quality", value: scores.pedigree_quality },
              { label: "Performance Rating", value: scores.performance_rating },
              { label: "Nick Score", value: scores.nick_score },
              { label: "Dosage Score", value: scores.dosage_score },
              { label: "Overall", value: scores.overall },
            ].map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">{s.label}</span>
                  <span className={`font-bold ${getScoreColor(s.value || 0)}`}>{s.value || 0}/100</span>
                </div>
                <Progress value={s.value || 0} className="h-2" />
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Potential Rating</span>
              <span className={`font-bold ${getRatingColor(scores.potential_rating || "")}`}>
                {scores.potential_rating || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Confidence</span>
              <span className={`font-bold ${getRatingColor(scores.data_confidence || "")}`}>
                {scores.data_confidence || "N/A"}
              </span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Key Insights */}
      {insights.length > 0 && (
        <SectionCard icon={Lightbulb} title="Key Insights">
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs">
                  {i + 1}
                </Badge>
                <p className="text-foreground leading-relaxed">{ins}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-primary">Recommendation</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Report by BloodstockAI • agentbloodstockai.com
        </p>
      </div>
    </div>
  );
}

// ─── FALLBACK: Parse from text insight ───
function renderFromTextInsight(insight: string, horseName: string) {
  if (!insight || insight.length < 50) return null;

  // Simple text display for fallback
  const sections = insight.split(/▸\s*/);
  
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Star className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">BloodstockAI Analysis Report</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">{horseName}</h2>
      </div>

      {sections.filter(s => s.trim().length > 20).map((section, i) => {
        const lines = section.trim().split("\n");
        const title = lines[0]?.replace(/[─═╔╚╗╝│┌┐└┘]/g, "").trim() || `Section ${i + 1}`;
        const content = lines.slice(1).join("\n").replace(/[─═╔╚╗╝│┌┐└┘]/g, "").trim();
        
        if (!content) return null;
        
        return (
          <Card key={i} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{content}</p>
            </CardContent>
          </Card>
        );
      })}

      <div className="text-center py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Report by BloodstockAI • agentbloodstockai.com
        </p>
      </div>
    </div>
  );
}

export const HorseReportRenderer = ({ insight, horseName, horseData }: HorseReportRendererProps) => {
  // Prefer structured data rendering
  if (horseData && (horseData.scores || horseData.inbreeding || horseData.dosage || horseData.nick_analysis || horseData.career_stats)) {
    return renderFromStructuredData(horseData);
  }

  // Fallback to text parsing
  if (insight && insight.length > 50) {
    return renderFromTextInsight(insight, horseName);
  }

  return null;
};
