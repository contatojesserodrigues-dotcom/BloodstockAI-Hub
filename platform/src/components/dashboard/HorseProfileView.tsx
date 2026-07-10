import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Award, TrendingUp, Dna, Target, BarChart3, Lightbulb, Star, Zap, Activity,
  Users, Trophy, GitBranch, ChevronDown, ChevronRight, MapPin, User, Briefcase,
  DollarSign, Calendar, Timer, Gauge
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, AreaChart, Area, Legend, PieChart, Pie, Cell
} from "recharts";
import type { HorseSearchResult } from "@/integrations/supabase/hooks/useHorseSearch";
import { PedigreeTree } from "./PedigreeTree";

interface HorseProfileViewProps {
  horse: HorseSearchResult;
  onAncestorClick?: (name: string) => void;
}

const sanitize = (v?: string | null) => {
  if (!v || v === "Data unavailable" || v === "N/A" || v === "Unknown" ||
    /Not found in verified sources/i.test(v || "")) return null;
  return v.replace(/checked:\s*[^\n]+/gi, "").trim() || null;
};

const display = (v?: string | null, context?: string) => {
  const clean = sanitize(v);
  if (clean) return clean;
  // Provide contextual messages instead of generic "Data unavailable"
  switch (context) {
    case "pedigree": return "Pedigree not found — try entering manually";
    case "gen3": return "Generations 3/4 not publicly available for this horse";
    case "performance": return "No race record found in databases";
    case "dosage": return "Calculating...";
    case "inbreeding": return "Calculating...";
    case "sales": return "No public auction record";
    default: return "Not available";
  }
};

// ═══════════════════════════════════════════════════
// SECTION 1 — HORSE IDENTITY CARD
// ═══════════════════════════════════════════════════
function IdentityCard({ horse }: { horse: HorseSearchResult }) {
  const age = horse.year_of_birth > 0 ? new Date().getFullYear() - horse.year_of_birth : null;
  const pedigreeHeadline = [horse.pedigree?.sire, horse.pedigree?.dam].filter(Boolean).join(" × ");

  const info = [
    { icon: User, label: "Owner", value: sanitize(horse.current_owner) || "Not available" },
    { icon: Briefcase, label: "Trainer", value: sanitize(horse.trainer) || "Not available" },
    { icon: Users, label: "Breeder", value: sanitize(horse.breeder) || "Not available" },
  ];

  return (
    <Card className="bg-white border-[#E8E0D0] overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1A14] break-words">
              {horse.name}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {horse.year_of_birth > 0 && (
                <Badge variant="outline" className="border-[#E8E0D0] text-[#1C1A14] text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {horse.year_of_birth}{age ? ` (${age}yo)` : ""}
                </Badge>
              )}
              {horse.country && (
                <Badge variant="outline" className="border-[#E8E0D0] text-[#1C1A14] text-xs">
                  <MapPin className="h-3 w-3 mr-1" />{horse.country}
                </Badge>
              )}
              {horse.color && (
                <Badge variant="outline" className="border-[#E8E0D0] text-[#1C1A14] text-xs">{horse.color}</Badge>
              )}
              {horse.sex && (
                <Badge variant="outline" className="border-[#E8E0D0] text-[#1C1A14] text-xs">{horse.sex}</Badge>
              )}
            </div>
            {pedigreeHeadline && (
              <p className="text-sm font-medium text-[#6B5E4E]">
                <Dna className="h-3.5 w-3.5 inline mr-1" />{pedigreeHeadline}
              </p>
            )}
          </div>
          {horse.scores?.overall != null && horse.scores.overall > 0 && (
            <div className="flex-shrink-0 text-center bg-[#1C1A14] rounded-lg px-4 py-3">
              <div className="text-3xl font-bold text-[#C9A84C]">{horse.scores.overall}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#C9A84C]/70">Overall Score</div>
            </div>
          )}
        </div>
        <Separator className="my-3 bg-[#E8E0D0]" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          {info.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className="h-3.5 w-3.5 text-[#6B5E4E] flex-shrink-0" />
              <span className="text-[#6B5E4E]">{item.label}:</span>
              <span className="text-[#1C1A14] font-medium truncate">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Section 2 (Pedigree Tree) is rendered via the imported PedigreeTree component in the main export.

// ═══════════════════════════════════════════════════
// SECTION 3 — RACING PROFILE & APTITUDE SCORES
// ═══════════════════════════════════════════════════
function AptitudeScores({ horse }: { horse: HorseSearchResult }) {
  const dosage = horse.dosage;
  const career = horse.career_stats;

  // Derive scores from dosage/career data
  const distanceScores = [
    { label: "🏃 Sprinter (5–6f)", score: dosage?.distance_aptitude?.toLowerCase().includes("sprint") ? 85 : 30 },
    { label: "🏇 Miler (7–9f)", score: dosage?.distance_aptitude?.toLowerCase().includes("mil") ? 80 : 45 },
    { label: "📏 Middle Distance (10–12f)", score: dosage?.distance_aptitude?.toLowerCase().includes("middle") || dosage?.distance_aptitude?.toLowerCase().includes("classic") ? 75 : 40 },
    { label: "🌍 Long Distance (13f+)", score: dosage?.distance_aptitude?.toLowerCase().includes("stay") || dosage?.distance_aptitude?.toLowerCase().includes("long") ? 70 : 25 },
  ];

  const surfaceScores = [
    { label: "🌿 Turf / Grass", score: career?.best_surface?.toLowerCase().includes("turf") ? 85 : 50 },
    { label: "🏜️ Dirt", score: career?.best_surface?.toLowerCase().includes("dirt") ? 80 : 35 },
    { label: "🟤 All-Weather", score: career?.best_surface?.toLowerCase().includes("all") || career?.best_surface?.toLowerCase().includes("poly") ? 70 : 30 },
  ];

  const getLabel = (s: number) => s >= 70 ? "Strong" : s >= 45 ? "Moderate" : "Weak";

  if (!dosage && !career) return null;

  return (
    <Card className="bg-white border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
          <Gauge className="h-4 w-4 text-[#C9A84C]" />
          Racing Profile & Aptitude
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dosage?.profile && sanitize(dosage.profile) ? (
          <div className="bg-[#F5F0E8] rounded-md p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-[#6B5E4E]">Dosage (B-I-C-S-P)</span><span className="font-mono font-semibold text-[#1C1A14]">{dosage.profile}</span></div>
            {dosage.dosage_index && sanitize(dosage.dosage_index) && <div className="flex justify-between"><span className="text-[#6B5E4E]">DI</span><span className="font-mono font-semibold text-[#1C1A14]">{dosage.dosage_index}</span></div>}
            {dosage.center_of_distribution && sanitize(dosage.center_of_distribution) && <div className="flex justify-between"><span className="text-[#6B5E4E]">CD</span><span className="font-mono font-semibold text-[#1C1A14]">{dosage.center_of_distribution}</span></div>}
            {dosage.distance_aptitude && sanitize(dosage.distance_aptitude) && <div className="flex justify-between"><span className="text-[#6B5E4E]">Distance Aptitude</span><span className="text-[#1C1A14] font-medium">{dosage.distance_aptitude}</span></div>}
          </div>
        ) : horse.pedigree?.sire && sanitize(horse.pedigree.sire) ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
            <span className="font-medium">⚠️ Dosage profile:</span> Being calculated by AI from pedigree data. If missing, the Chef-de-Race classification may not cover the ancestors in this pedigree.
          </div>
        ) : null}

        <div>
          <h4 className="text-xs font-semibold text-[#6B5E4E] uppercase tracking-wider mb-2">Distance Aptitude</h4>
          {distanceScores.map((d, i) => (
            <div key={i} className="flex items-center gap-3 mb-1.5">
              <span className="text-xs w-40 sm:w-48 text-[#1C1A14] flex-shrink-0">{d.label}</span>
              <div className="flex-1 h-4 bg-[#E8E0D0] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: d.score >= 70 ? '#C9A84C' : '#D9D0BE' }} />
              </div>
              <span className="text-[10px] w-14 text-right text-[#6B5E4E]">{d.score} {getLabel(d.score)}</span>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-[#6B5E4E] uppercase tracking-wider mb-2">Surface Aptitude</h4>
          {surfaceScores.map((d, i) => (
            <div key={i} className="flex items-center gap-3 mb-1.5">
              <span className="text-xs w-40 sm:w-48 text-[#1C1A14] flex-shrink-0">{d.label}</span>
              <div className="flex-1 h-4 bg-[#E8E0D0] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: d.score >= 70 ? '#C9A84C' : '#D9D0BE' }} />
              </div>
              <span className="text-[10px] w-14 text-right text-[#6B5E4E]">{d.score} {getLabel(d.score)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// SECTION 4 — CAREER PERFORMANCE CHARTS
// ═══════════════════════════════════════════════════
function PerformanceCharts({ horse }: { horse: HorseSearchResult }) {
  const races = horse.performance || [];
  if (races.length === 0) return null;

  // Chart 1: Race Results Timeline (position inverted)
  const timelineData = races.slice().reverse().map((r, i) => ({
    race: r.race_name || r.track || `Race ${i + 1}`,
    position: r.position,
    date: r.date,
    track: r.track,
    distance: r.distance,
  }));

  // Chart 2: Performance by Distance
  const distBuckets: Record<string, { wins: number; starts: number }> = {};
  races.forEach(r => {
    const d = r.distance;
    const cat = d <= 6 ? "Sprint" : d <= 9 ? "Mile" : d <= 12 ? "Middle" : "Long";
    if (!distBuckets[cat]) distBuckets[cat] = { wins: 0, starts: 0 };
    distBuckets[cat].starts++;
    if (r.position === 1) distBuckets[cat].wins++;
  });
  const distData = Object.entries(distBuckets).map(([dist, v]) => ({
    distance: dist, winRate: v.starts > 0 ? Math.round((v.wins / v.starts) * 100) : 0, starts: v.starts, wins: v.wins
  }));

  // Chart 3: Prize money cumulative
  let cumulative = 0;
  const earningsData = races.slice().reverse().map((r, i) => {
    cumulative += r.prize_money || 0;
    return { race: `R${i + 1}`, earnings: cumulative };
  });
  const totalEarnings = cumulative;

  const chartTooltipStyle = {
    background: "#FFFFFF", border: "1px solid #E8E0D0", borderRadius: 8, color: "#1C1A14", fontSize: 12
  };

  return (
    <Card className="bg-white border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
          <BarChart3 className="h-4 w-4 text-[#C9A84C]" />
          Career Performance Charts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Race Results Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-[#6B5E4E] uppercase tracking-wider mb-2">Race Results Timeline</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6B5E4E" }} />
              <YAxis reversed domain={[1, 'auto']} tick={{ fontSize: 10, fill: "#6B5E4E" }} label={{ value: "Position", angle: -90, position: "insideLeft", fontSize: 10, fill: "#6B5E4E" }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="position" stroke="#C9A84C" strokeWidth={2} dot={{ fill: "#C9A84C", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Distance */}
        {distData.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#6B5E4E] uppercase tracking-wider mb-2">Win Rate by Distance</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
                <XAxis dataKey="distance" tick={{ fontSize: 10, fill: "#6B5E4E" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B5E4E" }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="winRate" fill="#C9A84C" name="Win %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Earnings */}
        {totalEarnings > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[#6B5E4E] uppercase tracking-wider">Career Earnings</h4>
              <span className="text-lg font-bold text-[#C9A84C]">
                {horse.career_stats?.earnings_currency || "€"}{totalEarnings.toLocaleString()}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
                <XAxis dataKey="race" tick={{ fontSize: 9, fill: "#6B5E4E" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B5E4E" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${horse.career_stats?.earnings_currency || "€"}${v.toLocaleString()}`, "Earnings"]} />
                <Area type="monotone" dataKey="earnings" stroke="#1C1A14" fill="#1C1A14" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// SECTION 5 — CAREER STATISTICS TABLE
// ═══════════════════════════════════════════════════
function CareerStats({ horse }: { horse: HorseSearchResult }) {
  const c = horse.career_stats;
  if (!c) return null;

  const rows = [
    { label: "Total Starts", value: String(c.starts || 0) },
    { label: "Wins", value: `${c.wins || 0} (${c.win_rate || "0%"})` },
    { label: "Places (2nd/3rd)", value: `${c.seconds || 0} / ${c.thirds || 0}` },
    { label: "Win Rate", value: c.win_rate || "N/A" },
    { label: "Best Distance", value: c.best_distance || "N/A" },
    { label: "Best Surface", value: c.best_surface || "N/A" },
    { label: "Highest Class", value: c.highest_class || "N/A" },
    { label: "Best Speed Figure", value: c.best_speed_figure || "N/A" },
    { label: "Total Prize Money", value: c.earnings ? `${c.earnings_currency || "€"}${c.earnings.toLocaleString()}` : "N/A" },
  ];

  return (
    <Card className="bg-white border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
          <Trophy className="h-4 w-4 text-[#C9A84C]" />
          Career Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-[#E8E0D0]">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between py-2 text-sm">
              <span className="text-[#6B5E4E]">{r.label}</span>
              <span className="text-[#1C1A14] font-medium text-right">{r.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// SECTION 6 — RACE BY RACE HISTORY
// ═══════════════════════════════════════════════════
function RaceHistory({ horse }: { horse: HorseSearchResult }) {
  const races = horse.performance || [];
  const [page, setPage] = useState(0);
  const perPage = 20;
  if (races.length === 0) return null;

  const paged = races.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(races.length / perPage);

  return (
    <Card className="bg-white border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
          <Activity className="h-4 w-4 text-[#C9A84C]" />
          Race History ({races.length} races)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#1C1A14] text-white">
                <th className="text-left py-2 px-2 font-medium sticky left-0 bg-[#1C1A14] z-10">Date</th>
                <th className="text-left py-2 px-2 font-medium">Track</th>
                <th className="text-left py-2 px-2 font-medium">Race</th>
                <th className="text-center py-2 px-2 font-medium">Dist</th>
                <th className="text-center py-2 px-2 font-medium">Type</th>
                <th className="text-center py-2 px-2 font-medium">Pos</th>
                <th className="text-right py-2 px-2 font-medium">Prize</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((race, i) => {
                const isWin = race.position === 1;
                return (
                  <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-[#F5F0E8]"} ${isWin ? "border-l-[3px] border-l-[#C9A84C]" : ""}`}>
                    <td className={`py-1.5 px-2 sticky left-0 z-10 ${i % 2 === 0 ? "bg-white" : "bg-[#F5F0E8]"}`}>{race.date}</td>
                    <td className="py-1.5 px-2 font-medium">{race.track}</td>
                    <td className="py-1.5 px-2 text-[#6B5E4E]">{race.race_name || "—"}</td>
                    <td className="py-1.5 px-2 text-center">{race.distance ? `${race.distance}f` : "—"}</td>
                    <td className="py-1.5 px-2 text-center">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{race.race_type || "—"}</Badge>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <Badge variant={isWin ? "default" : "secondary"} className={`text-[10px] px-1.5 py-0 ${isWin ? "bg-[#C9A84C] text-white" : ""}`}>
                        {race.position === 1 ? "1st" : race.position === 2 ? "2nd" : race.position === 3 ? "3rd" : `${race.position}th`}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{race.prize_money ? `${race.prize_money.toLocaleString()}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
            <span className="text-xs text-[#6B5E4E]">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// SECTION 7 — SALES & AUCTION HISTORY
// ═══════════════════════════════════════════════════
function SalesHistory({ horse }: { horse: HorseSearchResult }) {
  const sales = horse.sales || [];
  if (sales.length === 0 || (sales.length === 1 && !sales[0]?.sale_price)) {
    return (
      <Card className="bg-white border-[#E8E0D0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
            <DollarSign className="h-4 w-4 text-[#C9A84C]" /> Sales & Auction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#6B5E4E] text-center py-4">No public auction record found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
          <DollarSign className="h-4 w-4 text-[#C9A84C]" /> Sales & Auction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-[#1C1A14] text-white">
                <th className="text-left py-2 px-2 font-medium">Year</th>
                <th className="text-left py-2 px-2 font-medium">Sale / Auction House</th>
                <th className="text-right py-2 px-2 font-medium">Price</th>
                <th className="text-left py-2 px-2 font-medium">Buyer</th>
                <th className="text-left py-2 px-2 font-medium">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F0E8]"}>
                  <td className="py-1.5 px-2">{sale.date || "—"}</td>
                  <td className="py-1.5 px-2 font-medium">{sale.sale_name || sale.auction_house || "—"}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-[#C9A84C]">
                    {sale.currency || "EUR"} {(sale.sale_price || 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-[#6B5E4E]">{sale.buyer || "—"}</td>
                  <td className="py-1.5 px-2 text-[#6B5E4E]">{sale.seller || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// SECTION 8 — AI BLOODSTOCK ANALYSIS
// ═══════════════════════════════════════════════════
function AIAnalysis({ horse }: { horse: HorseSearchResult }) {
  const insights = horse.key_insights || [];
  const recommendation = horse.recommendation || "";
  const insight = horse.insight || "";

  if (!recommendation && insights.length === 0 && !insight) return null;

  return (
    <Card className="bg-[#F5F0E8] border-l-4 border-l-[#C9A84C] border-[#E8E0D0]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-[#1C1A14]">
            <Star className="h-4 w-4 text-[#C9A84C]" />
            Bloodstock AI Analysis
          </CardTitle>
          <Badge className="bg-[#C9A84C] text-white text-[10px]">✦ AI Powered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C9A84C] text-white text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                <p className="text-[#1C1A14] leading-relaxed">{ins}</p>
              </div>
            ))}
          </div>
        )}

        {recommendation && (
          <div className="bg-white border border-[#E8E0D0] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-[#C9A84C]" />
              <span className="font-semibold text-sm text-[#C9A84C]">Agent Verdict</span>
            </div>
            <p className="text-sm text-[#1C1A14] leading-relaxed">{recommendation}</p>
          </div>
        )}

        {!recommendation && !insights.length && insight && (
          <p className="text-sm text-[#1C1A14] leading-relaxed whitespace-pre-line">{insight}</p>
        )}

        <p className="text-[10px] text-[#6B5E4E] text-center">
          Report by BloodstockAI • agentbloodstockai.com
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════
export const HorseProfileView = ({ horse, onAncestorClick }: HorseProfileViewProps) => {
  const inbreedingPatterns = horse.inbreeding?.pattern
    ? (typeof horse.inbreeding.pattern === 'string' ? [horse.inbreeding.pattern] : [])
    : [];

  return (
    <div className="space-y-4">
      <IdentityCard horse={horse} />
      {horse.pedigree && (
        <PedigreeTree
          pedigree={horse.pedigree}
          horseName={horse.name}
          onAncestorClick={onAncestorClick}
          confidenceScore={horse.scores?.pedigree_quality}
          inbreedingPatterns={inbreedingPatterns.filter(p => p && p !== "Data unavailable")}
        />
      )}
      <AptitudeScores horse={horse} />
      <PerformanceCharts horse={horse} />
      <CareerStats horse={horse} />
      <RaceHistory horse={horse} />
      <SalesHistory horse={horse} />
      <AIAnalysis horse={horse} />
    </div>
  );
};
