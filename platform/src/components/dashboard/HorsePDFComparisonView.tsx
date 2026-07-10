import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy, Dna, TrendingUp, DollarSign, ShieldCheck, AlertTriangle,
  BarChart3, Zap, Users, Star, Crown, Eye, ChevronDown, ChevronUp, Lightbulb
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE } from "@/components/ui/chart-theme";

const MULTI_COLORS = [CHART_COLORS.gold, CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.rose, CHART_COLORS.amber, "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6"];

/* ── Types ── */
interface HorseAnalysis {
  name?: string;
  source_file?: string;
  pedigree?: {
    sire?: string; dam?: string; dam_sire?: string;
    nick_rating?: string; nick_explanation?: string;
    inbreeding_coefficient?: number; inbreeding_to?: string[];
    dosage_profile?: { B?: number; I?: number; C?: number; S?: number; P?: number; DI?: number; CD?: number };
    female_family?: string; key_ancestors?: string[];
    pedigree_tree?: Array<{ gen: number; position: string; name: string }>;
  };
  siblings?: Array<{ name?: string; best_result?: string; earnings?: string; stakes_winner?: boolean }>;
  sire_stats?: {
    runners?: number; winners?: number; stakes_winners?: number; win_rate?: number;
    stud_fee?: string; best_progeny?: Array<{ name?: string; achievement?: string }>;
  };
  dam_produce?: Array<{ name?: string; year?: number; sire?: string; result?: string; stakes?: boolean }>;
  damsire_stats?: { aei?: number; broodmare_record?: string };
  market_value?: {
    estimated_range?: string; comparable_sales?: Array<{ horse?: string; sire?: string; sale?: string; year?: string; price?: string }>;
    demand_level?: string; best_sale_to_enter?: string; market_trend?: string;
  };
  scores?: { pedigree_score?: number; performance_score?: number; commercial_score?: number; overall_score?: number; sire_strength?: number; dam_quality?: number; family_record?: number };
  strengths?: string[];
  weaknesses?: string[];
  agent_verdict?: string;
  verdict_reason?: string;
  professional_insight?: string;
  recommended_action?: string;
  market_timing?: string;
}

interface ComparisonTable {
  criteria?: string;
  scores?: Record<string, number | string>;
  best?: string;
}

interface ComparisonData {
  horses?: HorseAnalysis[];
  comparison_table?: ComparisonTable[];
  winner?: { name?: string; justification?: string };
  market_context?: {
    sire_demand?: string; price_trend?: string; upcoming_sales?: string; best_markets?: string; commentary?: string;
  };
}

interface Props { data: ComparisonData; }

/* ── Helpers ── */
const getScoreColor = (s: number) => { if (s >= 80) return "text-emerald-400"; if (s >= 60) return "text-secondary"; if (s >= 40) return "text-amber-400"; return "text-red-400"; };
const getVerdictStyle = (v?: string) => {
  if (!v) return "bg-muted text-muted-foreground";
  const u = v.toUpperCase();
  if (u.includes("BUY")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (u.includes("WATCH")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};
const getNickColor = (r?: string) => { if (!r) return "text-muted-foreground"; if (r.startsWith("A")) return "text-emerald-400"; if (r.startsWith("B")) return "text-amber-400"; return "text-red-400"; };

/* ── Individual Horse Card ── */
const HorseCard = ({ horse, color, index }: { horse: HorseAnalysis; color: string; index: number }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const scores = horse.scores;
  const ped = horse.pedigree;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${color}20`, color }}>
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-bold">{horse.name || `Horse ${index + 1}`}</p>
              <p className="text-xs text-muted-foreground">
                {ped?.sire && `by ${ped.sire}`}{ped?.dam && ` x ${ped.dam}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scores?.overall_score != null && (
              <div className="text-center">
                <p className={`text-xl font-bold ${getScoreColor(scores.overall_score)}`}>{scores.overall_score}</p>
                <p className="text-[9px] text-muted-foreground">/100</p>
              </div>
            )}
            {horse.agent_verdict && <Badge variant="outline" className={`text-[10px] ${getVerdictStyle(horse.agent_verdict)}`}>{horse.agent_verdict}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-accent/10 overflow-x-auto h-8">
            <TabsTrigger value="overview" className="text-[10px] gap-1 h-7"><Eye className="w-3 h-3" /> Overview</TabsTrigger>
            <TabsTrigger value="pedigree" className="text-[10px] gap-1 h-7"><Dna className="w-3 h-3" /> Pedigree</TabsTrigger>
            <TabsTrigger value="family" className="text-[10px] gap-1 h-7"><Users className="w-3 h-3" /> Family</TabsTrigger>
            <TabsTrigger value="market" className="text-[10px] gap-1 h-7"><DollarSign className="w-3 h-3" /> Market</TabsTrigger>
            <TabsTrigger value="insights" className="text-[10px] gap-1 h-7"><Lightbulb className="w-3 h-3" /> Insights</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            {scores && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { l: "Pedigree", v: scores.pedigree_score }, { l: "Performance", v: scores.performance_score },
                  { l: "Commercial", v: scores.commercial_score }, { l: "Overall", v: scores.overall_score },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between bg-accent/10 rounded px-2 py-1.5">
                    <span className="text-muted-foreground">{l}</span>
                    <span className={`font-bold ${getScoreColor(v ?? 0)}`}>{v ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
            {horse.verdict_reason && (
              <div className="text-xs text-muted-foreground bg-accent/10 rounded p-2 border-l-2" style={{ borderColor: color }}>
                {horse.verdict_reason}
              </div>
            )}
          </TabsContent>

          {/* Pedigree */}
          <TabsContent value="pedigree" className="mt-3 space-y-3">
            {ped && (
              <>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Sire</span><span className="font-medium">{ped.sire || "—"}</span>
                  <span className="text-muted-foreground">Dam</span><span className="font-medium">{ped.dam || "—"}</span>
                  <span className="text-muted-foreground">Damsire</span><span className="font-medium">{ped.dam_sire || "—"}</span>
                  {ped.female_family && <><span className="text-muted-foreground">Family</span><span className="font-medium">{ped.female_family}</span></>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ped.nick_rating && <Badge variant="outline" className={`text-[10px] ${getNickColor(ped.nick_rating)}`}>Nick: {ped.nick_rating}</Badge>}
                  {ped.inbreeding_coefficient != null && ped.inbreeding_coefficient > 0 && (
                    <Badge variant="outline" className="text-[10px]">Inbreeding: {(ped.inbreeding_coefficient * 100).toFixed(1)}%</Badge>
                  )}
                  {ped.dosage_profile && ped.dosage_profile.DI != null && (
                    <Badge variant="outline" className="text-[10px] font-mono">{ped.dosage_profile.B}-{ped.dosage_profile.I}-{ped.dosage_profile.C}-{ped.dosage_profile.S}-{ped.dosage_profile.P} DI:{ped.dosage_profile.DI}</Badge>
                  )}
                </div>
                {ped.nick_explanation && <p className="text-xs text-muted-foreground">{ped.nick_explanation}</p>}
              </>
            )}
          </TabsContent>

          {/* Family */}
          <TabsContent value="family" className="mt-3 space-y-3">
            {horse.sire_stats && (horse.sire_stats.runners ?? 0) > 0 && (
              <div className="space-y-1">
                <h6 className="text-[10px] font-semibold text-muted-foreground uppercase">Sire Stats ({ped?.sire})</h6>
                <p className="text-xs text-muted-foreground">
                  {horse.sire_stats.stakes_winners} SW / {horse.sire_stats.runners} runners ({horse.sire_stats.win_rate}%)
                  {horse.sire_stats.stud_fee && <span className="text-secondary"> • {horse.sire_stats.stud_fee}</span>}
                </p>
                {horse.sire_stats.best_progeny?.slice(0, 3).map((p, i) => (
                  <p key={i} className="text-xs text-muted-foreground">🏆 {p.name}: {p.achievement}</p>
                ))}
              </div>
            )}
            {horse.siblings && horse.siblings.length > 0 && (
              <div className="space-y-1">
                <h6 className="text-[10px] font-semibold text-muted-foreground uppercase">Siblings</h6>
                {horse.siblings.slice(0, 5).map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{s.stakes_winner ? "🏆" : "•"} {s.name}: {s.best_result || s.earnings || "—"}</p>
                ))}
              </div>
            )}
            {horse.dam_produce && horse.dam_produce.length > 0 && (
              <div className="space-y-1">
                <h6 className="text-[10px] font-semibold text-muted-foreground uppercase">Dam's Produce</h6>
                {horse.dam_produce.slice(0, 5).map((p, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{p.stakes ? "🏆" : "•"} {p.name} ({p.year}) by {p.sire}: {p.result || "—"}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Market */}
          <TabsContent value="market" className="mt-3 space-y-3">
            {horse.market_value && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-accent/10 rounded p-2"><p className="text-muted-foreground">Estimated Value</p><p className="font-bold text-secondary">{horse.market_value.estimated_range || "—"}</p></div>
                  <div className="bg-accent/10 rounded p-2"><p className="text-muted-foreground">Demand</p><p className="font-bold">{horse.market_value.demand_level || "—"}</p></div>
                </div>
                {horse.market_value.comparable_sales && horse.market_value.comparable_sales.length > 0 && (
                  <div className="space-y-1">
                    <h6 className="text-[10px] font-semibold text-muted-foreground uppercase">Comparable Sales</h6>
                    <div className="text-xs space-y-1">
                      {horse.market_value.comparable_sales.slice(0, 5).map((cs, i) => (
                        <div key={i} className="flex justify-between bg-accent/10 rounded px-2 py-1">
                          <span>{cs.horse} <span className="text-muted-foreground">(by {cs.sire})</span></span>
                          <span className="text-secondary font-medium">{cs.price} <span className="text-muted-foreground">{cs.sale} {cs.year}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {horse.market_value.market_trend && <p className="text-xs text-muted-foreground">{horse.market_value.market_trend}</p>}
              </>
            )}
          </TabsContent>

          {/* Insights */}
          <TabsContent value="insights" className="mt-3 space-y-3">
            {horse.professional_insight && (
              <div className="text-xs text-muted-foreground bg-accent/10 rounded-lg p-3 border-l-2 border-secondary">
                <p className="font-semibold text-foreground mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3 text-secondary" /> Bloodstock Professional Insight</p>
                {horse.professional_insight}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {horse.strengths && horse.strengths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> What Works</p>
                  {horse.strengths.map((s, i) => <p key={i} className="text-xs text-muted-foreground">✅ {s}</p>)}
                </div>
              )}
              {horse.weaknesses && horse.weaknesses.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Watch Out For</p>
                  {horse.weaknesses.map((w, i) => <p key={i} className="text-xs text-muted-foreground">⚠️ {w}</p>)}
                </div>
              )}
            </div>
            {horse.recommended_action && <p className="text-xs text-foreground bg-accent/10 rounded p-2">🎯 <strong>Action:</strong> {horse.recommended_action}</p>}
            {horse.market_timing && <p className="text-xs text-muted-foreground bg-accent/5 rounded p-2">📈 <strong>Timing:</strong> {horse.market_timing}</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/* ── Main Component ── */
export const HorsePDFComparisonView = ({ data }: Props) => {
  const horses = data.horses || [];
  const table = data.comparison_table || [];
  const winner = data.winner;
  const market = data.market_context;

  // Build radar data
  const radarKeys = ["pedigree_score", "performance_score", "commercial_score", "sire_strength", "dam_quality", "family_record"];
  const radarLabels: Record<string, string> = { pedigree_score: "Pedigree", performance_score: "Performance", commercial_score: "Commercial", sire_strength: "Sire", dam_quality: "Dam", family_record: "Family" };
  const radarData = radarKeys.map(key => {
    const point: any = { subject: radarLabels[key] || key };
    horses.forEach((h, i) => { point[h.name || `Horse ${i + 1}`] = (h.scores as any)?.[key] ?? 0; });
    return point;
  });

  return (
    <div className="space-y-4">
      {/* Individual Horse Cards */}
      <div className="space-y-4">
        {horses.map((horse, i) => (
          <HorseCard key={i} horse={horse} color={MULTI_COLORS[i % MULTI_COLORS.length]} index={i} />
        ))}
      </div>

      {/* Side-by-Side Comparison */}
      {(table.length > 0 || radarData.length > 0) && (
        <Card className="border-secondary/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-secondary" /> Side-by-Side Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Radar Chart */}
            {radarData.length > 0 && horses.length >= 2 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(0 0% 15%)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(0 0% 71%)", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {horses.map((h, i) => (
                      <Radar key={i} name={h.name || `Horse ${i + 1}`} dataKey={h.name || `Horse ${i + 1}`}
                        stroke={MULTI_COLORS[i % MULTI_COLORS.length]} fill={MULTI_COLORS[i % MULTI_COLORS.length]} fillOpacity={0.15} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Comparison Table */}
            {table.length > 0 && (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1">
                  {/* Header */}
                  <div className="flex items-center text-xs font-semibold bg-accent/20 rounded px-3 py-2">
                    <span className="flex-1">Criteria</span>
                    {horses.map((h, i) => (
                      <span key={i} className="w-20 text-center" style={{ color: MULTI_COLORS[i % MULTI_COLORS.length] }}>{(h.name || `H${i + 1}`).slice(0, 10)}</span>
                    ))}
                    <span className="w-12 text-center text-secondary">Best</span>
                  </div>
                  {table.map((row, i) => (
                    <div key={i} className="flex items-center text-xs bg-accent/10 rounded px-3 py-2">
                      <span className="flex-1 font-medium">{row.criteria}</span>
                      {horses.map((h, hi) => {
                        const val = row.scores?.[h.name || `Horse ${hi + 1}`] ?? "—";
                        const isBest = row.best === (h.name || `Horse ${hi + 1}`);
                        return (
                          <span key={hi} className={`w-20 text-center font-bold ${isBest ? "text-secondary" : "text-muted-foreground"}`}>{val}</span>
                        );
                      })}
                      <span className="w-12 text-center text-secondary font-bold">{
                        horses.findIndex(h => (h.name || `Horse ${horses.indexOf(h) + 1}`) === row.best) + 1 || "—"
                      }</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Winner Declaration */}
      {winner && winner.name && (
        <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-secondary" />
              <h3 className="text-sm font-bold text-foreground">Winner: {winner.name}</h3>
            </div>
            {winner.justification && <p className="text-sm text-muted-foreground">{winner.justification}</p>}
          </CardContent>
        </Card>
      )}

      {/* Market Context */}
      {market && (
        <Card className="border-border/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Market Context</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
            {market.sire_demand && <p>📈 <strong>Sire Line Demand:</strong> {market.sire_demand}</p>}
            {market.price_trend && <p>💰 <strong>Price Trend:</strong> {market.price_trend}</p>}
            {market.upcoming_sales && <p>📅 <strong>Upcoming Sales:</strong> {market.upcoming_sales}</p>}
            {market.best_markets && <p>🌍 <strong>Best Markets:</strong> {market.best_markets}</p>}
            {market.commentary && (
              <div className="text-sm text-muted-foreground bg-accent/10 rounded-lg p-3 border-l-2 border-secondary mt-2">
                {market.commentary}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
