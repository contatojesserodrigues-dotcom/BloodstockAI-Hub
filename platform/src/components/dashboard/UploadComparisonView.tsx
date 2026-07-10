import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy, Dna, TrendingUp, DollarSign, ShieldCheck, AlertTriangle,
  BarChart3, Zap, Users, Star, Crown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE } from "@/components/ui/chart-theme";

/* ── Types ── */
interface ComparisonData {
  comparison_type?: string;
  summary?: string;
  winner_recommendation?: string;
  horse_a?: HorseSide;
  horse_b?: HorseSide;
  comparison_metrics?: Array<{
    metric?: string; score_a?: number; score_b?: number; advantage?: string; notes?: string;
  }>;
  pedigree_comparison?: {
    shared_ancestors?: string[]; nick_comparison?: string; inbreeding_comparison?: string; dosage_comparison?: string;
  };
  investment_analysis?: {
    better_value?: string; higher_ceiling?: string; lower_risk?: string; reasoning?: string;
  };
}

interface HorseSide {
  name?: string; source_file?: string;
  pedigree?: {
    sire?: string; dam?: string; dam_sire?: string; nick_rating?: string; nick_explanation?: string;
    inbreeding_coefficient?: number; inbreeding_to?: string[];
    dosage_profile?: { B?: number; I?: number; C?: number; S?: number; P?: number; DI?: number; CD?: number };
    female_family?: string; key_ancestors?: string[];
  };
  performance?: {
    career?: { starts?: number; wins?: number; places?: number; earnings?: string; win_percentage?: number };
    speed_figures?: { best_rpr?: number | null; best_beyer?: number | null; best_timeform?: number | null };
    distance_profile?: string; surface_preference?: string; class_ceiling?: string;
    best_races?: Array<{ race?: string; track?: string; position?: string; figure?: string }>;
  };
  siblings?: Array<{ name?: string; best_result?: string; stakes_winner?: boolean }>;
  sire_stats?: { runners?: number; winners?: number; stakes_winners?: number; win_rate?: number; stud_fee?: string; best_progeny?: Array<{ name?: string; achievement?: string }> };
  dam_produce?: Array<{ name?: string; year?: number; sire?: string; result?: string; stakes?: boolean }>;
  commercial?: { estimated_value_range?: string; market_demand?: string; resale_potential?: string; comparable_sales?: Array<{ horse?: string; price?: string }> };
  scores?: { pedigree_score?: number; performance_score?: number; commercial_score?: number; overall_score?: number };
  strengths?: string[]; weaknesses?: string[];
  agent_verdict?: string; verdict_reason?: string;
}

interface Props {
  data: ComparisonData;
  fileA: string;
  fileB: string;
}

const getVerdictStyle = (v?: string) => {
  if (!v) return "bg-muted text-muted-foreground";
  const u = v.toUpperCase();
  if (u === "BUY") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (u === "WATCH") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (u === "AVOID") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "";
};

const getNickColor = (r?: string) => {
  if (!r) return "text-muted-foreground";
  if (r.startsWith("A")) return "text-emerald-400";
  if (r.startsWith("B")) return "text-amber-400";
  return "text-red-400";
};

const getScoreColor = (s: number) => {
  if (s >= 80) return "text-emerald-400";
  if (s >= 60) return "text-secondary";
  if (s >= 40) return "text-amber-400";
  return "text-red-400";
};

const getAdvColor = (adv?: string) => {
  if (adv === "A") return "text-blue-400";
  if (adv === "B") return "text-secondary";
  return "text-muted-foreground";
};

/* ── Horse Side Panel ── */
const HorseSidePanel = ({ horse, label, color }: { horse: HorseSide; label: string; color: string }) => {
  const scores = horse.scores;
  const ped = horse.pedigree;
  const perf = horse.performance;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">{horse.name || "Unknown"}</p>
          <p className="text-[10px] text-muted-foreground">{horse.source_file || label}</p>
        </div>
        <div className="flex items-center gap-2">
          {scores?.overall_score != null && (
            <span className={`text-lg font-bold ${getScoreColor(scores.overall_score)}`}>{scores.overall_score}</span>
          )}
          {horse.agent_verdict && (
            <Badge variant="outline" className={`text-[10px] ${getVerdictStyle(horse.agent_verdict)}`}>{horse.agent_verdict}</Badge>
          )}
        </div>
      </div>

      {horse.verdict_reason && (
        <p className="text-xs text-muted-foreground bg-accent/10 rounded p-2 border-l-2" style={{ borderColor: color }}>
          {horse.verdict_reason}
        </p>
      )}

      {/* Scores */}
      {scores && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          {[
            { l: "Pedigree", v: scores.pedigree_score },
            { l: "Performance", v: scores.performance_score },
            { l: "Commercial", v: scores.commercial_score },
            { l: "Overall", v: scores.overall_score },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between bg-accent/10 rounded px-2 py-1">
              <span className="text-muted-foreground">{l}</span>
              <span className={`font-bold ${getScoreColor(v ?? 0)}`}>{v ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pedigree */}
      {ped && (
        <div className="space-y-1">
          <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Dna className="w-3 h-3" /> Pedigree</h6>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span className="text-muted-foreground">Sire</span><span className="font-medium">{ped.sire || "—"}</span>
            <span className="text-muted-foreground">Dam</span><span className="font-medium">{ped.dam || "—"}</span>
            <span className="text-muted-foreground">Damsire</span><span className="font-medium">{ped.dam_sire || "—"}</span>
          </div>
          {ped.nick_rating && (
            <p className="text-xs"><span className="text-muted-foreground">Nick: </span><span className={`font-bold ${getNickColor(ped.nick_rating)}`}>{ped.nick_rating}</span></p>
          )}
          {ped.dosage_profile && ped.dosage_profile.DI != null && (
            <p className="text-xs font-mono text-muted-foreground">
              Dosage: {ped.dosage_profile.B}-{ped.dosage_profile.I}-{ped.dosage_profile.C}-{ped.dosage_profile.S}-{ped.dosage_profile.P} (DI: {ped.dosage_profile.DI})
            </p>
          )}
          {ped.inbreeding_coefficient != null && ped.inbreeding_coefficient > 0 && (
            <p className="text-xs text-muted-foreground">Inbreeding: {(ped.inbreeding_coefficient * 100).toFixed(2)}%{ped.inbreeding_to?.length ? ` to ${ped.inbreeding_to.join(", ")}` : ""}</p>
          )}
        </div>
      )}

      {/* Performance */}
      {perf?.career && (perf.career.starts ?? 0) > 0 && (
        <div className="space-y-1">
          <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Performance</h6>
          <div className="grid grid-cols-3 gap-1 text-xs text-center">
            <div className="bg-accent/10 rounded p-1"><p className="text-muted-foreground">Starts</p><p className="font-bold">{perf.career.starts}</p></div>
            <div className="bg-accent/10 rounded p-1"><p className="text-muted-foreground">Wins</p><p className="font-bold text-emerald-400">{perf.career.wins}</p></div>
            <div className="bg-accent/10 rounded p-1"><p className="text-muted-foreground">Win%</p><p className="font-bold">{perf.career.win_percentage ?? 0}%</p></div>
          </div>
          {perf.speed_figures && (
            <div className="flex gap-2 text-xs">
              {perf.speed_figures.best_rpr != null && <span className="text-muted-foreground">RPR: <strong>{perf.speed_figures.best_rpr}</strong></span>}
              {perf.speed_figures.best_beyer != null && <span className="text-muted-foreground">Beyer: <strong>{perf.speed_figures.best_beyer}</strong></span>}
              {perf.speed_figures.best_timeform != null && <span className="text-muted-foreground">TF: <strong>{perf.speed_figures.best_timeform}</strong></span>}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {perf.distance_profile && <Badge variant="outline" className="text-[9px]">📏 {perf.distance_profile}</Badge>}
            {perf.surface_preference && <Badge variant="outline" className="text-[9px]">🏟 {perf.surface_preference}</Badge>}
            {perf.class_ceiling && <Badge variant="outline" className="text-[9px]">🏆 {perf.class_ceiling}</Badge>}
          </div>
        </div>
      )}

      {/* Sire Stats */}
      {horse.sire_stats && (horse.sire_stats.runners ?? 0) > 0 && (
        <div className="space-y-1">
          <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Sire Stats</h6>
          <div className="text-xs text-muted-foreground">
            {horse.sire_stats.runners} runners, {horse.sire_stats.winners} winners, {horse.sire_stats.stakes_winners} SW ({horse.sire_stats.win_rate}%)
            {horse.sire_stats.stud_fee && <span className="text-secondary ml-1">Fee: {horse.sire_stats.stud_fee}</span>}
          </div>
        </div>
      )}

      {/* Commercial */}
      {horse.commercial?.estimated_value_range && (
        <div className="space-y-1">
          <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="w-3 h-3" /> Value</h6>
          <p className="text-xs"><span className="text-secondary font-medium">{horse.commercial.estimated_value_range}</span></p>
          <div className="flex gap-2 text-xs text-muted-foreground">
            {horse.commercial.market_demand && <span>Demand: {horse.commercial.market_demand}</span>}
            {horse.commercial.resale_potential && <span>Resale: {horse.commercial.resale_potential}</span>}
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 gap-2">
        {horse.strengths && horse.strengths.length > 0 && (
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Strengths</p>
            {horse.strengths.map((s, i) => <p key={i} className="text-muted-foreground">✓ {s}</p>)}
          </div>
        )}
        {horse.weaknesses && horse.weaknesses.length > 0 && (
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Weaknesses</p>
            {horse.weaknesses.map((w, i) => <p key={i} className="text-muted-foreground">⚠ {w}</p>)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Main Comparison View ── */
export const UploadComparisonView = ({ data, fileA, fileB }: Props) => {
  const metrics = data.comparison_metrics || [];
  const pedComp = data.pedigree_comparison;
  const invest = data.investment_analysis;

  // Build chart data for comparison metrics
  const barChartData = metrics.map(m => ({
    metric: m.metric?.replace(/\s+/g, "\n") || "",
    [fileA.slice(0, 15)]: m.score_a ?? 0,
    [fileB.slice(0, 15)]: m.score_b ?? 0,
  }));

  // Build radar data from horse scores
  const radarData = data.horse_a?.scores && data.horse_b?.scores ? [
    { subject: "Pedigree", A: data.horse_a.scores.pedigree_score ?? 0, B: data.horse_b.scores.pedigree_score ?? 0 },
    { subject: "Performance", A: data.horse_a.scores.performance_score ?? 0, B: data.horse_b.scores.performance_score ?? 0 },
    { subject: "Commercial", A: data.horse_a.scores.commercial_score ?? 0, B: data.horse_b.scores.commercial_score ?? 0 },
    { subject: "Overall", A: data.horse_a.scores.overall_score ?? 0, B: data.horse_b.scores.overall_score ?? 0 },
  ] : [];

  const labelA = fileA.slice(0, 15);
  const labelB = fileB.slice(0, 15);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data.summary && (
        <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-secondary" />
              <h3 className="text-sm font-bold text-foreground">Comparison Verdict</h3>
            </div>
            <p className="text-sm text-muted-foreground">{data.summary}</p>
            {data.winner_recommendation && (
              <p className="text-sm text-foreground mt-2 bg-accent/10 rounded p-2 border-l-2 border-secondary">
                <strong>Recommendation:</strong> {data.winner_recommendation}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Radar + Bar Charts */}
      {(radarData.length > 0 || barChartData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {radarData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Score Overlay</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(0 0% 15%)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(0 0% 71%)", fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name={labelA} dataKey="A" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.2} />
                      <Radar name={labelB} dataKey="B" stroke={CHART_COLORS.gold} fill={CHART_COLORS.gold} fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {barChartData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Metric Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <XAxis dataKey="metric" {...CHART_AXIS_STYLE} tick={{ ...CHART_AXIS_STYLE.tick, fontSize: 8 }} />
                      <YAxis {...CHART_AXIS_STYLE} domain={[0, 100]} />
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                      <Bar dataKey={labelA} fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} />
                      <Bar dataKey={labelB} fill={CHART_COLORS.gold} radius={[2, 2, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metrics Table */}
      {metrics.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Head-to-Head Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-accent/10 rounded px-3 py-2">
                  <span className="font-medium flex-1">{m.metric}</span>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold w-8 text-center ${m.advantage === "A" ? "text-blue-400" : "text-muted-foreground"}`}>{m.score_a ?? "—"}</span>
                    <Badge variant="outline" className={`text-[9px] w-12 justify-center ${getAdvColor(m.advantage)}`}>
                      {m.advantage === "EQUAL" ? "=" : m.advantage}
                    </Badge>
                    <span className={`font-bold w-8 text-center ${m.advantage === "B" ? "text-secondary" : "text-muted-foreground"}`}>{m.score_b ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side by Side Horses */}
      {data.horse_a && data.horse_b && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-500/20">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs text-blue-400 uppercase tracking-wider">Upload A</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <HorseSidePanel horse={data.horse_a} label={fileA} color={CHART_COLORS.blue} />
            </CardContent>
          </Card>
          <Card className="border-secondary/20">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs text-secondary uppercase tracking-wider">Upload B</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <HorseSidePanel horse={data.horse_b} label={fileB} color={CHART_COLORS.gold} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pedigree Comparison */}
      {pedComp && (pedComp.nick_comparison || pedComp.shared_ancestors?.length) && (
        <Card className="border-border/50">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Dna className="w-3 h-3" /> Pedigree Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs text-muted-foreground">
            {pedComp.shared_ancestors && pedComp.shared_ancestors.length > 0 && (
              <p><strong className="text-foreground">Shared Ancestors:</strong> {pedComp.shared_ancestors.join(", ")}</p>
            )}
            {pedComp.nick_comparison && <p><strong className="text-foreground">Nick:</strong> {pedComp.nick_comparison}</p>}
            {pedComp.inbreeding_comparison && <p><strong className="text-foreground">Inbreeding:</strong> {pedComp.inbreeding_comparison}</p>}
            {pedComp.dosage_comparison && <p><strong className="text-foreground">Dosage:</strong> {pedComp.dosage_comparison}</p>}
          </CardContent>
        </Card>
      )}

      {/* Investment Analysis */}
      {invest && invest.reasoning && (
        <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="w-3 h-3" /> Investment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="bg-accent/10 rounded p-2">
                <p className="text-muted-foreground">Better Value</p>
                <p className={`font-bold ${invest.better_value === "A" ? "text-blue-400" : "text-secondary"}`}>
                  {invest.better_value === "A" ? fileA.slice(0, 12) : fileB.slice(0, 12)}
                </p>
              </div>
              <div className="bg-accent/10 rounded p-2">
                <p className="text-muted-foreground">Higher Ceiling</p>
                <p className={`font-bold ${invest.higher_ceiling === "A" ? "text-blue-400" : "text-secondary"}`}>
                  {invest.higher_ceiling === "A" ? fileA.slice(0, 12) : fileB.slice(0, 12)}
                </p>
              </div>
              <div className="bg-accent/10 rounded p-2">
                <p className="text-muted-foreground">Lower Risk</p>
                <p className={`font-bold ${invest.lower_risk === "A" ? "text-blue-400" : "text-secondary"}`}>
                  {invest.lower_risk === "A" ? fileA.slice(0, 12) : fileB.slice(0, 12)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{invest.reasoning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
