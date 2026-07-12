import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trophy, Target, TrendingUp, Dna, Star, AlertTriangle, ChevronDown, ChevronUp,
  Award, BarChart3, ShieldCheck, DollarSign, Zap, Users, Flame, Eye, BookmarkPlus, BookmarkCheck, Download, Filter, FileDown, Lightbulb
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Legend
} from "recharts";
import { CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE } from "@/components/ui/chart-theme";
import { downloadCatalogLotPDF } from "@/utils/catalogPdfReport";
import MarketEstimateTiers, { MarketTiersData } from "@/components/dashboard/MarketEstimateTiers";
import ConformationPanel, { ConformationResult } from "@/components/dashboard/ConformationPanel";
import BreezePanel, { BreezeResult } from "@/components/dashboard/BreezePanel";
import { computeDisplay, calculateOverallScore, scoreBandClass } from "@/utils/scoreWeights";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PDFDownloadGuard } from "@/components/PDFDownloadGuard";
import { AnalysisNotesPanel } from "@/components/dashboard/AnalysisNotesPanel";

/* ── Types ── */
interface CatalogHorse {
  name: string;
  lot_number?: string;
  year_of_birth?: number;
  sex?: string;
  country?: string;
  consignor?: string;
  breeder?: string;
  pedigree?: {
    sire?: string; dam?: string; dam_sire?: string; sire_of_damsire?: string;
    nick_rating?: string; nick_explanation?: string;
    inbreeding_coefficient?: number; inbreeding_to?: string[];
    dosage_profile?: { B?: number; I?: number; C?: number; S?: number; P?: number; DI?: number; CD?: number };
    key_ancestors?: string[]; female_family?: string; family_number?: string;
  };
  performance?: {
    career?: { starts?: number; wins?: number; places?: number; unplaced?: number; earnings?: string; win_percentage?: number };
    speed_figures?: { best_rpr?: number | null; best_beyer?: number | null; best_timeform?: number | null; avg_last_5?: number | null; trend?: string };
    distance_profile?: string; surface_preference?: string; going_preference?: string; class_ceiling?: string;
    best_races?: Array<{ race?: string; track?: string; date?: string; distance?: string; position?: string; figure?: string }>;
  };
  siblings?: Array<{
    name?: string;
    sex?: string;
    sire?: string;
    best_result?: string;
    earnings?: string;
    stakes_winner?: boolean;
    relation?: string;       // "Full sibling" | "Half sibling"
    sale_house?: string;
    sale_year?: number | string;
    sale_price?: string;
    grade?: string;
  }>;
  sire_stats?: {
    runners?: number; winners?: number; stakes_winners?: number; win_rate?: number;
    avg_earning_index?: number; stud_fee?: string; standing_at?: string;
    best_progeny?: Array<{ name?: string; achievement?: string }>;
  };
  dam_produce?: Array<{ name?: string; year?: number; sire?: string; sex?: string; result?: string; stakes?: boolean }>;
  dam_analysis?: {
    dam_name?: string;
    dam_own_race_record?: string;
    dam_sale_history?: string;
    produce_summary?: string;
    second_dam?: { name?: string; sire?: string; year_of_birth?: number; own_record?: string; best_offspring?: string };
    third_dam?: { name?: string; sire?: string; family_summary?: string };
    female_family_label?: string;
    female_family_label_reason?: string;
    family_number?: string;
    maternal_black_type_within_3_gens?: string[];
    key_takeaway?: string;
  };
  commercial_analysis?: {
    estimated_value_range?: string; estimated_value_justification?: string;
    comparable_sales?: Array<{ horse?: string; price?: string; sale?: string; year?: string }>;
    market_demand?: string; resale_potential?: string; commercial_sire?: boolean;
    market_tiers?: MarketTiersData;
  };
  scores?: { pedigree_score?: number; performance_score?: number; commercial_score?: number; conformation_potential?: number; overall_score?: number };
  agent_verdict?: string;
  verdict_reason?: string;
  key_strengths?: string[];
  key_risks?: string[];
  detailed_analysis?: string;
  goal_match?: boolean;
  goal_match_reason?: string;
  market_trend?: string;
  market_commentary?: string;
}

interface CatalogData {
  catalog_summary?: {
    sale_name?: string; auction_house?: string; date?: string; location?: string;
    total_lots?: number; quality_assessment?: string; market_temperature?: string;
    average_price_range?: string; key_sire_lines?: string[]; key_female_families?: string[];
  };
  horses?: CatalogHorse[];
  top_recommendations?: Array<{
    rank?: number; lot_number?: string; horse_name?: string; overall_score?: number;
    reason?: string; estimated_value?: string; risk_level?: string; verdict?: string;
    pedigree_highlights?: string; performance_highlights?: string; investment_thesis?: string;
  }>;
  market_insights?: {
    trending_sires?: string[]; value_picks?: string[]; premium_lots?: string[];
    ones_to_avoid?: string[]; overall_catalog_quality?: string;
    market_commentary?: string;
  };
  chart_data?: {
    score_distribution?: Array<{ name: string; pedigree: number; performance: number; commercial: number; overall: number }>;
    sire_representation?: Array<{ sire: string; count: number; avg_score: number }>;
    verdict_breakdown?: { BUY?: number; WATCH?: number; AVOID?: number };
  };
}

interface Props { data: CatalogData; fileName: string; }

/* ── Helpers ── */
const getVerdictStyle = (v?: string) => {
  if (!v) return "bg-muted text-muted-foreground border-border";
  const u = v.toUpperCase();
  if (u === "BUY" || u === "BUY IF PHYSICAL CONFIRMS") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (u === "WATCH" || u === "MONITOR" || u === "VALUE BUY ONLY") return "bg-amber-50 text-amber-800 border-amber-200";
  if (u === "AVOID" || u === "PASS") return "bg-red-50 text-red-800 border-red-200";
  if (u === "INSUFFICIENT_DATA" || u === "INSUFFICIENT DATA") return "bg-muted text-muted-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
};
const getVerdictLabel = (v?: string) => {
  if (!v) return "—";
  const u = v.toUpperCase();
  if (u === "BUY") return "⭐ TOP PICK";
  if (u === "BUY IF PHYSICAL CONFIRMS") return "⭐ Buy if Physical Confirms";
  if (u === "WATCH" || u === "MONITOR") return "✅ Monitor";
  if (u === "VALUE BUY ONLY") return "✅ Value Buy Only";
  if (u === "AVOID") return "❌ Avoid";
  if (u === "PASS") return "❌ Pass";
  if (u === "INSUFFICIENT_DATA" || u === "INSUFFICIENT DATA") return "Insufficient Data";
  return v;
};
const isTopPickVerdict = (v?: string) => ["BUY", "BUY IF PHYSICAL CONFIRMS"].includes(String(v || "").toUpperCase());
const isValueVerdict = (v?: string) => ["WATCH", "MONITOR", "VALUE BUY ONLY"].includes(String(v || "").toUpperCase());
const isNegativeVerdict = (v?: string) => ["AVOID", "PASS"].includes(String(v || "").toUpperCase());

// Client-side guard: when confidence is "insufficient" (or LOW with no anchor)
// the recommendation must be neutral — never PASS / AVOID.
const resolveVerdict = (horse: any): string | undefined => {
  const raw = String(horse?.agent_verdict || "").toUpperCase();
  const meConf = String(horse?.commercial_analysis?.market_estimate?.confidence || "").toLowerCase();
  const tierConf = String(horse?.commercial_analysis?.market_tiers?.confidence || "").toLowerCase();
  const horseConf = String(horse?.market_confidence_level || "").toLowerCase();
  const noAnchor = !horse?.verified_market_anchor && !horse?.commercial_analysis?.verified_anchor;
  const insufficient =
    meConf === "insufficient" ||
    tierConf === "insufficient" ||
    horseConf === "insufficient" ||
    ((meConf === "low" || tierConf === "low" || horseConf === "low") && noAnchor);
  if (insufficient) return "INSUFFICIENT_DATA";
  return raw || undefined;
};
const getNickColor = (r?: string) => { if (!r) return "text-muted-foreground"; if (r.startsWith("A")) return "text-emerald-400"; if (r.startsWith("B")) return "text-amber-400"; return "text-red-400"; };
const getScoreColor = (s: number) => { if (s >= 80) return "text-emerald-400"; if (s >= 60) return "text-secondary"; if (s >= 40) return "text-amber-400"; return "text-red-400"; };
const getProgressColor = (s: number) => { if (s >= 80) return "bg-emerald-500"; if (s >= 60) return "bg-secondary"; if (s >= 40) return "bg-amber-500"; return "bg-red-500"; };
const getTempColor = (t?: string) => { if (!t) return ""; if (t === "Frenzy") return "text-red-400"; if (t === "Hot") return "text-orange-400"; if (t === "Warm") return "text-amber-400"; return "text-blue-400"; };

const VERDICT_COLORS: Record<string, string> = { BUY: CHART_COLORS.emerald, WATCH: CHART_COLORS.amber, AVOID: CHART_COLORS.rose };

const ScoreBar = ({ label, score, icon: Icon }: { label: string; score?: number; icon?: any }) => {
  const s = score ?? 0;
  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs min-w-0">
        <span className="flex items-center gap-1 text-muted-foreground min-w-0 break-words">{Icon && <Icon className="w-3 h-3 flex-shrink-0" />} {label}</span>
        <span className={`font-bold ${getScoreColor(s)}`}>{s}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${getProgressColor(s)}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
};

/**
 * New ScoreRow that respects the weighting system:
 *  - state "na"           → "N/A" label, no bar fill
 *  - state "not_assessed" → "Not assessed" muted label, dashed grey bar
 *  - state "scored"       → numeric + dynamic-colour bar (gold/amber/orange/red)
 */
const ScoreRow = ({
  label,
  display,
  icon: Icon,
}: {
  label: string;
  display: { state: "scored" | "not_assessed" | "na"; score: number | null };
  icon?: any;
}) => {
  if (display.state === "na") {
    return (
      <div className="space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs min-w-0">
          <span className="flex items-center gap-1 text-muted-foreground min-w-0 break-words">{Icon && <Icon className="w-3 h-3 flex-shrink-0" />} {label}</span>
          <span className="font-medium text-muted-foreground/60">N/A</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 border border-dashed border-border" />
      </div>
    );
  }
  if (display.state === "not_assessed") {
    return (
      <div className="space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs min-w-0">
          <span className="flex items-center gap-1 text-muted-foreground min-w-0 break-words">{Icon && <Icon className="w-3 h-3 flex-shrink-0" />} {label}</span>
          <span className="text-[10px] text-muted-foreground italic text-right flex-shrink-0">Not assessed</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 border border-dashed border-border" />
      </div>
    );
  }
  const s = display.score ?? 0;
  const band = scoreBandClass(s);
  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs min-w-0">
        <span className="flex items-center gap-1 text-muted-foreground min-w-0 break-words">{Icon && <Icon className="w-3 h-3 flex-shrink-0" />} {label}</span>
        <span className={`font-bold ${band.text}`}>{s}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${band.fill}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
};

/* ── Lot Card ── */
const LotCard = ({ horse, isShortlisted, onToggleShortlist }: { horse: CatalogHorse; isShortlisted: boolean; onToggleShortlist: () => void }) => {
  const [open, setOpen] = useState(false);
  const { canDownloadPDF } = useFeatureAccess();
  const [showGuard, setShowGuard] = useState(false);
  const scores = horse.scores;
  const ped = horse.pedigree;
  const perf = horse.performance;
  const resolvedVerdict = resolveVerdict(horse);
  const verdict = (resolvedVerdict || horse.agent_verdict || "").toUpperCase();

  // ─── Score display (weighting-aware) ───
  // Backend stores each component on a 0–25 scale (sum = overall, max 100).
  // The new score system reasons on 0–100 per component with a weighted overall.
  // We rescale 0–25 → 0–100 here for display + weighted-average computation.
  const horseType =
    (horse as any).horse_type ||
    (horse as any).type ||
    (horse as any).analysis_metadata?.horse_type ||
    undefined;
  const to100 = (n?: number | null) => (n == null ? n : Math.round(Math.min(100, Math.max(0, Number(n))) * (Number(n) <= 25 ? 4 : 1)));
  const visionResult: ConformationResult | undefined = (horse as any).vision_result;
  const breezeResult: BreezeResult | undefined = (horse as any).breeze_result;
  const analysisMode: string = (horse as any).analysis_mode || "pdf_only";
  const hasCareerStarts = Number(horse.performance?.career?.starts) > 0;
  const scoreInputs: any = {
    pedigree: to100(scores?.pedigree_score),
    performance: to100(scores?.performance_score),
    commercial: to100(scores?.commercial_score),
    conformation: to100(scores?.conformation_potential),
  };
  // A backend zero with no underlying signal = "Not assessed", not 0.
  if (!visionResult && !breezeResult && scoreInputs.conformation === 0) scoreInputs.conformation = null;
  if (!hasCareerStarts && !breezeResult && scoreInputs.performance === 0) scoreInputs.performance = null;
  const display = computeDisplay(scoreInputs, horseType);
  const overallScore = calculateOverallScore(scoreInputs, horseType) || scores?.overall_score || 0;

  // Radar: hide components that are N/A; add 5th axis when vision present.
  const radarData: Array<{ subject: string; value: number }> = [];
  if (display.pedigree.state === "scored") radarData.push({ subject: "Pedigree", value: display.pedigree.score! });
  if (display.performance.state === "scored") radarData.push({ subject: "Performance", value: display.performance.score! });
  if (display.commercial.state === "scored") radarData.push({ subject: "Commercial", value: display.commercial.score! });
  if (display.conformation.state === "scored") radarData.push({ subject: "Conformation", value: display.conformation.score! });
  if (analysisMode === "pdf_biomech" && visionResult?.overall_conformation_score != null) {
    radarData.push({ subject: "Biomechanics", value: visionResult.overall_conformation_score });
  }
  if (analysisMode === "pdf_breeze" && breezeResult?.overall_breeze_score != null) {
    radarData.push({ subject: "Breeze", value: breezeResult.overall_breeze_score });
  }

  return (
      <Card className={`border border-border bg-card shadow-sm w-full max-w-full min-w-0 overflow-hidden ${verdict === "BUY" ? "border-l-4 border-l-emerald-500" : verdict === "AVOID" ? "border-l-4 border-l-red-500" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-3 sm:p-4 cursor-pointer hover:bg-accent/5 transition-colors gap-1.5 sm:gap-2" onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          {horse.lot_number && (
            <div className="flex flex-col items-center bg-secondary/10 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 flex-shrink-0">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Lot</span>
              <span className="text-xs sm:text-sm font-bold text-secondary">{horse.lot_number}</span>
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {verdict === "BUY" && <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary flex-shrink-0" />}
              <Badge variant="outline" className="text-[7px] sm:text-[9px] px-1 py-0 border-primary/30 text-primary flex-shrink-0">PDF</Badge>
              <p className="text-[11px] sm:text-sm font-bold truncate max-w-[110px] sm:max-w-none">
                {horse.name && horse.name !== "Unnamed" && horse.name !== "Not specified"
                  ? horse.name
                  : ped?.sire && ped?.dam
                    ? `${ped.sire} x ${ped.dam}`
                    : horse.name || "Unnamed Horse"}
              </p>
            </div>
            <p className="text-[9px] sm:text-xs text-muted-foreground line-clamp-2">
              {horse.sex && `${horse.sex} • `}{horse.year_of_birth && `${horse.year_of_birth} • `}{horse.country}
              {horse.name && horse.name !== "Unnamed" && horse.name !== "Not specified" && ped?.sire && ` — by ${ped.sire} out of ${ped.dam || "—"}`}
              {ped?.dam_sire && ` (${ped.dam_sire})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {horse.goal_match && <Badge className="bg-primary/20 text-primary text-[9px] sm:text-[10px]">Match</Badge>}
          {scores?.overall_score != null && (
            <div className="text-center leading-tight">
              <p className={`text-sm sm:text-lg font-bold ${getScoreColor(scores.overall_score)}`}>{scores.overall_score}</p>
              <p className="text-[7px] sm:text-[9px] text-muted-foreground">/100</p>
            </div>
          )}
          {(resolvedVerdict || horse.agent_verdict) && (
            <Badge variant="outline" className={`text-[8px] sm:text-[10px] whitespace-nowrap ${getVerdictStyle(resolvedVerdict || horse.agent_verdict)}`}>
              {getVerdictLabel(resolvedVerdict || horse.agent_verdict)}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}>
            {isShortlisted ? <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" /> : <BookmarkPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />}
          </Button>
          {open ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-border/50 p-3 sm:p-4 space-y-3 sm:space-y-4 min-w-0 overflow-hidden">
          {/* Score + Market Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0">
            {(() => {
              const rc: any = (horse as any).redcap || {};
              const fmt = (v: any) => (v === null || v === undefined || v === "" ? "n/v" : v);
              const subjectRaced = !!rc.subject_raced && rc.subject_rpr != null;
              return (
                <div className="bg-accent/10 rounded-lg p-2 sm:p-3 text-center min-w-0 overflow-hidden">
                  <p className="text-[11px] sm:text-xs text-muted-foreground break-words">RedCap (RPR)</p>
                  {subjectRaced ? (
                    <>
                      <p className="text-base sm:text-2xl font-bold break-words text-secondary">{rc.subject_rpr}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground break-words">
                        {rc.subject_code || "—"}{rc.subject_trip ? ` · ${rc.subject_trip}` : ""}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground break-words mt-1">
                        Sire {fmt(rc.sire_rpr)} · Dam {rc.dam_unraced ? "Unraced" : fmt(rc.dam_rpr)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm sm:text-lg font-bold break-words text-secondary leading-tight">
                        Sire {fmt(rc.sire_rpr)}
                        {rc.sire_code ? <span className="text-[10px] sm:text-xs text-muted-foreground"> ({rc.sire_code}{rc.sire_trip ? `, ${rc.sire_trip}` : ""})</span> : null}
                      </p>
                      <p className="text-sm sm:text-lg font-bold break-words text-secondary leading-tight">
                        Dam {rc.dam_unraced ? "Unraced" : fmt(rc.dam_rpr)}
                        {!rc.dam_unraced && rc.dam_code ? <span className="text-[10px] sm:text-xs text-muted-foreground"> ({rc.dam_code})</span> : null}
                      </p>
                      {rc.dam_sire_rpr != null && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground break-words">Dam-sire {fmt(rc.dam_sire_rpr)}</p>
                      )}
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground italic mt-1">Subject: unraced — projection only</p>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="bg-accent/10 rounded-lg p-2 sm:p-3 text-center min-w-0 overflow-hidden">
              <p className="text-[11px] sm:text-xs text-muted-foreground break-words">Pedigree Rating</p>
              <p className={`text-base sm:text-2xl font-bold break-words ${getScoreColor((scores?.pedigree_score ?? 0) * 4)}`}>{(((scores?.pedigree_score ?? 0) / 25) * 10).toFixed(1)}/10</p>
            </div>
          </div>

          {/* Market Estimate — 3 tiers (BASIC / MEDIAN / MAXIMUM) */}
          {horse.commercial_analysis?.market_tiers ? (
            <div className="space-y-2 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground break-words">Market Estimate</p>
              </div>
              <MarketEstimateTiers data={horse.commercial_analysis.market_tiers} />
            </div>
          ) : horse.commercial_analysis?.estimated_value_range ? (
            <div className="bg-accent/10 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Market Estimate</p>
              <p className="text-sm sm:text-lg font-bold text-secondary break-words">{horse.commercial_analysis.estimated_value_range}</p>
            </div>
          ) : null}

          {/* Market Estimate Justification */}
          {horse.commercial_analysis?.estimated_value_justification && (
            <div className="text-xs sm:text-sm text-muted-foreground bg-secondary/5 rounded-lg p-3 border-l-2 border-secondary/60 w-full min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-foreground flex items-start gap-1.5 mb-1 min-w-0"><DollarSign className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" /> <span className="break-words [overflow-wrap:anywhere]">Market Estimate Justification:</span></span>
              <span className="block mt-1 break-words [overflow-wrap:anywhere] whitespace-normal leading-relaxed">{horse.commercial_analysis.estimated_value_justification}</span>
            </div>
          )}

          {/* Agent verdict */}
          {horse.verdict_reason && (
            <div className="text-sm text-muted-foreground bg-accent/10 rounded-lg p-3 border-l-2 border-secondary">
              <span className="font-medium text-foreground flex items-center gap-1.5 mb-1"><Lightbulb className="w-4 h-4 text-secondary" /> Bloodstock Insight:</span>
              <span className="block mt-1">{horse.verdict_reason}</span>
            </div>
          )}

          {/* Performance Analysis (RedCap / RPR) */}
          {(horse as any).performance_analysis_rpr && (
            <div className="text-xs sm:text-sm text-muted-foreground bg-accent/10 rounded-lg p-3 border-l-2 border-primary/60 w-full min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-foreground flex items-start gap-1.5 mb-1 min-w-0">
                <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="break-words [overflow-wrap:anywhere]">Performance Analysis (RedCap / RPR):</span>
              </span>
              <span className="block mt-1 break-words [overflow-wrap:anywhere] whitespace-normal leading-relaxed">{(horse as any).performance_analysis_rpr}</span>
            </div>
          )}

          {/* Family Pedigree Analysis */}
          {(horse as any).family_pedigree_analysis && (
            <div className="text-xs sm:text-sm text-muted-foreground bg-secondary/5 rounded-lg p-3 border-l-2 border-secondary/60 w-full min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-foreground flex items-start gap-1.5 mb-1 min-w-0">
                <Dna className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <span className="break-words [overflow-wrap:anywhere]">Family Pedigree Analysis:</span>
              </span>
              <span className="block mt-1 break-words [overflow-wrap:anywhere] whitespace-normal leading-relaxed">{(horse as any).family_pedigree_analysis}</span>
            </div>
          )}

          {/* Scores */}
          {scores && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Scores</h5>
                <ScoreRow label="Pedigree" display={display.pedigree} icon={Dna} />
                <ScoreRow label="Performance" display={display.performance} icon={Zap} />
                <ScoreRow label="Commercial" display={display.commercial} icon={DollarSign} />
                <ScoreRow label="Conformation" display={display.conformation} icon={Star} />
              </div>
              {radarData.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="64%">
                      <PolarGrid gridType="polygon" stroke="hsl(var(--border))" strokeWidth={0.75} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        dataKey="value"
                        stroke={CHART_COLORS.gold}
                        fill={CHART_COLORS.gold}
                        fillOpacity={0.07}
                        strokeWidth={1.6}
                        dot={{ r: 2.25, fill: "hsl(var(--card))", stroke: CHART_COLORS.gold, strokeWidth: 1.5 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Conformation / Breeze vision panels */}
          {visionResult && <ConformationPanel data={visionResult} />}
          {breezeResult && <BreezePanel data={breezeResult} />}

          {/* Pedigree Highlights */}
          {ped && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Dna className="w-3 h-3" /> Pedigree Highlights</h5>
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
            </div>
          )}

          {/* Sire Stats */}
          {horse.sire_stats && (horse.sire_stats.runners ?? 0) > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Sire: {ped?.sire}</h5>
              <p className="text-xs text-muted-foreground">
                {horse.sire_stats.stakes_winners} stakes winners from {horse.sire_stats.runners} runners ({horse.sire_stats.win_rate}% SR)
                {horse.sire_stats.stud_fee && <span className="text-secondary ml-1">• Fee: {horse.sire_stats.stud_fee}</span>}
              </p>
              {horse.sire_stats.best_progeny && horse.sire_stats.best_progeny.length > 0 && (
                <p className="text-xs text-muted-foreground">Best: {horse.sire_stats.best_progeny.slice(0, 2).map(p => `${p.name} (${p.achievement})`).join(", ")}</p>
              )}
            </div>
          )}

          {/* Deep Maternal-Line Analysis */}
          {horse.dam_analysis && (horse.dam_analysis.dam_name || horse.dam_analysis.produce_summary || horse.dam_analysis.second_dam?.name) && (
            <div className="space-y-3 bg-secondary/5 rounded-lg p-3 border border-secondary/30">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> Deep Maternal-Line Analysis
                </h5>
                {horse.dam_analysis.female_family_label && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    horse.dam_analysis.female_family_label === "ELITE" ? "bg-emerald-500/20 text-emerald-400" :
                    horse.dam_analysis.female_family_label === "LIVE" ? "bg-blue-500/20 text-blue-400" :
                    horse.dam_analysis.female_family_label === "DORMANT" ? "bg-amber-500/20 text-amber-400" :
                    horse.dam_analysis.female_family_label === "PADDED" ? "bg-rose-500/20 text-rose-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{horse.dam_analysis.female_family_label}</span>
                )}
              </div>
              {horse.dam_analysis.dam_name && horse.dam_analysis.dam_name !== "NOT FOUND" && (
                <div className="text-xs">
                  <p className="font-semibold text-foreground">1st Dam: {horse.dam_analysis.dam_name}</p>
                  {horse.dam_analysis.dam_own_race_record && (
                    <p className="text-muted-foreground">Race record: {horse.dam_analysis.dam_own_race_record}</p>
                  )}
                  {horse.dam_analysis.dam_sale_history && (
                    <p className="text-muted-foreground">Sale history: {horse.dam_analysis.dam_sale_history}</p>
                  )}
                </div>
              )}
              {horse.dam_analysis.produce_summary && (
                <p className="text-xs text-foreground leading-relaxed">{horse.dam_analysis.produce_summary}</p>
              )}
              {horse.dam_analysis.second_dam?.name && (
                <div className="text-xs border-t border-border/30 pt-2">
                  <p className="font-semibold text-foreground">2nd Dam: {horse.dam_analysis.second_dam.name}{horse.dam_analysis.second_dam.sire && ` (by ${horse.dam_analysis.second_dam.sire})`}</p>
                  {horse.dam_analysis.second_dam.own_record && (
                    <p className="text-muted-foreground">{horse.dam_analysis.second_dam.own_record}</p>
                  )}
                  {horse.dam_analysis.second_dam.best_offspring && (
                    <p className="text-muted-foreground">Best offspring: {horse.dam_analysis.second_dam.best_offspring}</p>
                  )}
                </div>
              )}
              {horse.dam_analysis.third_dam?.name && (
                <div className="text-xs border-t border-border/30 pt-2">
                  <p className="font-semibold text-foreground">3rd Dam: {horse.dam_analysis.third_dam.name}{horse.dam_analysis.third_dam.sire && ` (by ${horse.dam_analysis.third_dam.sire})`}</p>
                  {horse.dam_analysis.third_dam.family_summary && (
                    <p className="text-muted-foreground">{horse.dam_analysis.third_dam.family_summary}</p>
                  )}
                </div>
              )}
              {horse.dam_analysis.maternal_black_type_within_3_gens && horse.dam_analysis.maternal_black_type_within_3_gens.length > 0 && (
                <div className="text-xs border-t border-border/30 pt-2">
                  <p className="font-semibold text-secondary mb-1">Black-type within 3 generations:</p>
                  <ul className="space-y-0.5">
                    {horse.dam_analysis.maternal_black_type_within_3_gens.slice(0, 6).map((bt, i) => (
                      <li key={i} className="text-muted-foreground">🏆 {bt}</li>
                    ))}
                  </ul>
                </div>
              )}
              {horse.dam_analysis.female_family_label_reason && (
                <p className="text-[11px] text-muted-foreground italic border-t border-border/30 pt-2">
                  Family verdict: {horse.dam_analysis.female_family_label_reason}
                </p>
              )}
              {horse.dam_analysis.key_takeaway && (
                <p className="text-xs text-foreground font-medium border-t border-border/30 pt-2">
                  → {horse.dam_analysis.key_takeaway}
                </p>
              )}
              {horse.dam_analysis.family_number && (
                <p className="text-[10px] text-muted-foreground">Family №: {horse.dam_analysis.family_number}</p>
              )}
            </div>
          )}

          {/* Siblings & Family */}
          {((horse.siblings && horse.siblings.length > 0) || (horse.dam_produce && horse.dam_produce.length > 0)) && (
            <div className="space-y-3 bg-accent/10 rounded-lg p-3 border border-border/30">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Siblings & Family</h5>
              
              {/* Full Siblings list — sorted with full siblings first when relation provided */}
              {horse.siblings && horse.siblings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Siblings at Auction ({horse.siblings.length})</p>
                  {[...horse.siblings]
                    .sort((a, b) => {
                      const af = /full/i.test(String(a.relation || "")) ? 0 : 1;
                      const bf = /full/i.test(String(b.relation || "")) ? 0 : 1;
                      return af - bf;
                    })
                    .slice(0, 8)
                    .map((s, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${s.stakes_winner ? "text-secondary" : "text-muted-foreground"}`}>
                        <span className="flex-shrink-0 mt-0.5">{s.stakes_winner ? "🏆" : "•"}</span>
                        <div className="min-w-0">
                          <span className="font-medium">{s.name || "Unnamed"}</span>
                          {s.sex && <span className="text-muted-foreground"> ({s.sex})</span>}
                          {s.relation && <span className="text-muted-foreground"> — {s.relation}</span>}
                          {s.sire && <span className="text-muted-foreground"> by {s.sire}</span>}
                          {(s.sale_house || s.sale_year || s.sale_price) && (
                            <span className="block text-muted-foreground">
                              {[s.sale_house, s.sale_year, s.sale_price].filter(Boolean).join(" · ")}
                              {s.grade && ` — ${s.grade}`}
                            </span>
                          )}
                          {!s.sale_price && (s.best_result || s.earnings) && (
                            <span className="block text-muted-foreground">{s.best_result}{s.earnings && ` — ${s.earnings}`}</span>
                          )}
                          {!s.sale_price && !s.best_result && !s.earnings && (
                            <span className="block text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Full Dam Produce list */}
              {horse.dam_produce && horse.dam_produce.length > 0 && (
                <div className="space-y-1.5 border-t border-border/30 pt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Dam Produce Record ({horse.dam_produce.length})</p>
                  {horse.dam_produce.map((p, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs ${p.stakes ? "text-secondary" : "text-muted-foreground"}`}>
                      <span className="flex-shrink-0 mt-0.5">{p.stakes ? "🏆" : "•"}</span>
                      <div className="min-w-0">
                        <span className="font-medium">{p.name || "Unnamed"}</span>
                        {p.year && <span className="text-muted-foreground"> ({p.year})</span>}
                        {p.sex && <span className="text-muted-foreground"> {p.sex}</span>}
                        {p.sire && <span className="text-muted-foreground"> by {p.sire}</span>}
                        {p.result && <span className="block text-muted-foreground">{p.result}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Performance */}
          {perf?.career && (perf.career.starts ?? 0) > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Performance</h5>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-xs text-center">
                <div className="bg-accent/10 rounded p-1.5 sm:p-2"><p className="text-[10px] sm:text-xs text-muted-foreground">Starts</p><p className="font-bold">{perf.career.starts}</p></div>
                <div className="bg-accent/10 rounded p-1.5 sm:p-2"><p className="text-[10px] sm:text-xs text-muted-foreground">Wins</p><p className="font-bold text-emerald-400">{perf.career.wins}</p></div>
                <div className="bg-accent/10 rounded p-1.5 sm:p-2"><p className="text-[10px] sm:text-xs text-muted-foreground">Win%</p><p className="font-bold">{perf.career.win_percentage ?? 0}%</p></div>
                <div className="bg-accent/10 rounded p-1.5 sm:p-2"><p className="text-[10px] sm:text-xs text-muted-foreground">Earnings</p><p className="font-bold text-secondary text-[10px] sm:text-xs break-all">{perf.career.earnings || "—"}</p></div>
              </div>
            </div>
          )}

          {/* Strengths / Risks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {horse.key_strengths && horse.key_strengths.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Strengths</h5>
                {horse.key_strengths.map((s, i) => <p key={i} className="text-xs text-muted-foreground">✓ {s}</p>)}
              </div>
            )}
            {horse.key_risks && horse.key_risks.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk Factors</h5>
                {horse.key_risks.map((r, i) => <p key={i} className="text-xs text-muted-foreground">⚠ {r}</p>)}
              </div>
            )}
          </div>

          {/* Market Trend */}
          {horse.commercial_analysis && (
            <div className="text-xs bg-accent/10 rounded-lg p-3 border border-border/30">
              <h5 className="font-semibold text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Market Trend</h5>
              {horse.commercial_analysis.market_demand && <p className="text-muted-foreground">{ped?.sire} line: {horse.commercial_analysis.market_demand === "High" ? "📈 Strong demand" : horse.commercial_analysis.market_demand === "Medium" ? "📊 Stable" : "📉 Softening"}</p>}
              {horse.commercial_analysis.comparable_sales?.slice(0, 2).map((cs, i) => (
                <p key={i} className="text-muted-foreground">Similar: {cs.horse} — {cs.price} ({cs.sale} {cs.year})</p>
              ))}
            </div>
          )}

          {/* Detailed analysis */}
          {horse.detailed_analysis && (
            <div className="text-xs text-muted-foreground bg-accent/5 rounded-lg p-3 border border-border/30">
              {horse.detailed_analysis}
            </div>
          )}

          {/* Recommendation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-accent/10 rounded-lg p-2.5 sm:p-3 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold">Recommendation:</span>
              {horse.agent_verdict && <Badge className={`${getVerdictStyle(horse.agent_verdict)}`}>{getVerdictLabel(horse.agent_verdict)}</Badge>}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" className="text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2 sm:px-3" onClick={(e) => {
                e.stopPropagation();
                if (canDownloadPDF) downloadCatalogLotPDF(horse);
                else setShowGuard(true);
              }}>
                <FileDown className="w-3.5 h-3.5" /> Download PDF
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}>
                {isShortlisted ? <><BookmarkCheck className="w-3.5 h-3.5 mr-0.5 text-secondary" /> Shortlisted</> : <><BookmarkPlus className="w-3.5 h-3.5 mr-0.5" /> Shortlist</>}
              </Button>
            </div>
          </div>
        </div>
      )}
      <PDFDownloadGuard open={showGuard} onOpenChange={setShowGuard} />
    </Card>
  );
};

/* ── Main Component ── */
export const CatalogAnalysisView = ({ data, fileName }: Props) => {
  const summary = data.catalog_summary;
  const horses = data.horses || [];
  const recs = data.top_recommendations || [];
  const insights = data.market_insights;
  const chartData = data.chart_data;

  const [sortBy, setSortBy] = useState<string>("score");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [filterObjective, setFilterObjective] = useState<string>("all");
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());

  const toggleShortlist = (name: string) => {
    setShortlist(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  };

  // Computed stats
  const topPicks = horses.filter(h => isTopPickVerdict(h.agent_verdict)).length;
  const avoidCount = horses.filter(h => isNegativeVerdict(h.agent_verdict)).length;
  const goodValue = horses.filter(h => isValueVerdict(h.agent_verdict)).length;

  // Filtered & sorted horses
  const filteredHorses = useMemo(() => {
    let result = [...horses];
    if (filterVerdict === "top") result = result.filter(h => isTopPickVerdict(h.agent_verdict));
    else if (filterVerdict === "good") result = result.filter(h => isValueVerdict(h.agent_verdict));
    else if (filterVerdict === "avoid") result = result.filter(h => isNegativeVerdict(h.agent_verdict));
    else if (filterVerdict === "shortlist") result = result.filter(h => shortlist.has(h.name));

    if (filterObjective === "racing") result = result.filter(h => h.goal_match);
    if (filterObjective === "breeding") result = result.filter(h => h.goal_match);
    if (filterObjective === "investment") result = result.filter(h => h.goal_match);

    if (sortBy === "score") result.sort((a, b) => (b.scores?.overall_score ?? 0) - (a.scores?.overall_score ?? 0));
    else if (sortBy === "lot") result.sort((a, b) => parseInt(a.lot_number || "999") - parseInt(b.lot_number || "999"));
    else if (sortBy === "pedigree") result.sort((a, b) => (b.scores?.pedigree_score ?? 0) - (a.scores?.pedigree_score ?? 0));

    return result;
  }, [horses, sortBy, filterVerdict, filterObjective, shortlist]);

  const verdictPieData = chartData?.verdict_breakdown
    ? Object.entries(chartData.verdict_breakdown).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      {/* Catalog Summary */}
      {summary && (
        <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-foreground break-words">{summary.sale_name || fileName}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words">
                  {summary.auction_house && `${summary.auction_house} • `}{summary.location && `${summary.location} • `}{summary.date}
                </p>
                {summary.quality_assessment && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words">{summary.quality_assessment}</p>}
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:text-right flex-shrink-0">
                {summary.total_lots != null && <p className="text-xs sm:text-sm font-bold">{summary.total_lots} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">lots</span></p>}
                {summary.market_temperature && (
                  <Badge variant="outline" className={`text-[9px] sm:text-[10px] ${getTempColor(summary.market_temperature)}`}>
                    <Flame className="w-3 h-3 mr-1" /> {summary.market_temperature}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Master Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border bg-card p-2 sm:p-3 text-center shadow-sm">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Total Lots</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{horses.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-emerald-700 uppercase tracking-wide">Top Picks</p>
          <p className="text-base sm:text-lg font-bold text-emerald-800">{topPicks}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-amber-700 uppercase tracking-wide">Good Value</p>
          <p className="text-base sm:text-lg font-bold text-amber-800">{goodValue}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-2 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-red-700 uppercase tracking-wide">Avoid</p>
          <p className="text-base sm:text-lg font-bold text-red-800">{avoidCount}</p>
        </div>
      </div>

      <AnalysisNotesPanel storageKey={fileName} />

      {/* Filter & Sort Bar */}
      <div className="flex flex-col gap-2 bg-accent/10 rounded-lg p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[100px] sm:w-[130px] h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score ↓</SelectItem>
              <SelectItem value="lot">Lot Number</SelectItem>
              <SelectItem value="pedigree">Pedigree ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { val: "all", label: "All" },
            { val: "top", label: "⭐ Top Picks" },
            { val: "good", label: "✅ Good Value" },
            { val: "avoid", label: "❌ Avoid" },
            { val: "shortlist", label: `📋 Shortlist (${shortlist.size})` },
          ].map(f => (
            <Button key={f.val} variant={filterVerdict === f.val ? "default" : "outline"} size="sm"
              className={`text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3 ${filterVerdict === f.val ? "bg-secondary text-secondary-foreground" : ""}`}
              onClick={() => setFilterVerdict(f.val)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="lots" className="w-full max-w-full min-w-0 overflow-hidden">
        <TabsList className="w-full justify-start bg-accent/10 overflow-x-auto flex-nowrap scrollbar-none">
          <TabsTrigger value="lots" className="text-[9px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-3"><Eye className="w-3 h-3 flex-shrink-0" /> Lots ({filteredHorses.length})</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-[9px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-3"><Trophy className="w-3 h-3 flex-shrink-0" /> Top Picks</TabsTrigger>
          <TabsTrigger value="charts" className="text-[9px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-3"><BarChart3 className="w-3 h-3 flex-shrink-0" /> Charts</TabsTrigger>
          {insights && <TabsTrigger value="market" className="text-[9px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-3"><TrendingUp className="w-3 h-3 flex-shrink-0" /> Market</TabsTrigger>}
        </TabsList>

        {/* All Lots */}
        <TabsContent value="lots" className="mt-3">
          <ScrollArea className="h-[65vh] sm:h-[70vh] max-h-[700px] min-h-[280px] w-full max-w-full min-w-0">
            <div className="space-y-2 pb-4 pr-3 w-full max-w-full min-w-0">
              {filteredHorses.map((horse, i) => (
                <LotCard key={i} horse={horse} isShortlisted={shortlist.has(horse.name)} onToggleShortlist={() => toggleShortlist(horse.name)} />
              ))}
              {filteredHorses.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No lots match the current filter.</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Top Recommendations */}
        <TabsContent value="recommendations" className="space-y-3 mt-3">
          {recs.length > 0 ? recs.map((rec, i) => (
            <Card key={i} className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-secondary">{rec.rank || i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold break-words">{rec.lot_number && <span className="text-[10px] sm:text-xs font-mono text-secondary mr-2">#{rec.lot_number}</span>}{rec.horse_name}</p>
                      {rec.estimated_value && <p className="text-[10px] sm:text-xs text-secondary font-medium">{rec.estimated_value}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rec.overall_score != null && <span className={`text-base sm:text-lg font-bold ${getScoreColor(rec.overall_score)}`}>{rec.overall_score}</span>}
                    {rec.verdict && <Badge variant="outline" className={`text-[9px] sm:text-[10px] ${getVerdictStyle(rec.verdict)}`}>{rec.verdict}</Badge>}
                  </div>
                </div>
                {rec.reason && <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>}
                {rec.investment_thesis && (
                  <div className="mt-2 text-xs bg-accent/10 rounded p-2 border-l-2 border-secondary">
                    <span className="font-medium text-foreground">Investment Thesis: </span>{rec.investment_thesis}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {rec.risk_level && <Badge variant="outline" className="text-[9px]">Risk: {rec.risk_level}</Badge>}
                  {rec.pedigree_highlights && <Badge variant="outline" className="text-[9px]">🧬 {rec.pedigree_highlights}</Badge>}
                </div>
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground text-center py-4">No specific recommendations.</p>}
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="mt-3 space-y-4">
          {chartData?.score_distribution && chartData.score_distribution.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Score Distribution</CardTitle></CardHeader>
              <CardContent className="p-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.score_distribution.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <XAxis dataKey="name" {...CHART_AXIS_STYLE} tick={{ ...CHART_AXIS_STYLE.tick, fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                      <YAxis {...CHART_AXIS_STYLE} domain={[0, 100]} />
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="pedigree" fill={CHART_COLORS.gold} name="Pedigree" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="performance" fill={CHART_COLORS.emerald} name="Performance" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="commercial" fill={CHART_COLORS.blue} name="Commercial" radius={[2, 2, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verdictPieData.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Verdict Breakdown</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={verdictPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {verdictPieData.map((entry, i) => <Cell key={i} fill={VERDICT_COLORS[entry.name] || CHART_COLORS.silver} />)}
                      </Pie><Tooltip {...CHART_TOOLTIP_STYLE} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            {chartData?.sire_representation && chartData.sire_representation.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="p-3 pb-0"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Top Sires</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.sire_representation.slice(0, 8)} layout="vertical" margin={{ left: 60 }}>
                        <XAxis type="number" {...CHART_AXIS_STYLE} /><YAxis type="category" dataKey="sire" {...CHART_AXIS_STYLE} tick={{ ...CHART_AXIS_STYLE.tick, fontSize: 9 }} width={55} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} /><Bar dataKey="count" fill={CHART_COLORS.gold} name="Lots" radius={[0, 2, 2, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Market */}
        {insights && (
          <TabsContent value="market" className="mt-3 space-y-3">
            {insights.overall_catalog_quality && (
              <div className="text-sm text-muted-foreground bg-accent/10 rounded-lg p-3 border-l-2 border-secondary">{insights.overall_catalog_quality}</div>
            )}
            {insights.market_commentary && (
              <div className="text-sm text-muted-foreground bg-accent/5 rounded-lg p-3 border border-border/30">{insights.market_commentary}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.trending_sires && insights.trending_sires.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-secondary flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trending Sires</h5>
                  {insights.trending_sires.map((s, i) => <p key={i} className="text-xs text-muted-foreground">🔥 {s}</p>)}
                </div>
              )}
              {insights.value_picks && insights.value_picks.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><Target className="w-3 h-3" /> Value Picks</h5>
                  {insights.value_picks.map((s, i) => <p key={i} className="text-xs text-muted-foreground">💎 {s}</p>)}
                </div>
              )}
              {insights.premium_lots && insights.premium_lots.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-secondary flex items-center gap-1"><Award className="w-3 h-3" /> Premium</h5>
                  {insights.premium_lots.map((s, i) => <p key={i} className="text-xs text-muted-foreground">⭐ {s}</p>)}
                </div>
              )}
              {insights.ones_to_avoid && insights.ones_to_avoid.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Avoid</h5>
                  {insights.ones_to_avoid.map((s, i) => <p key={i} className="text-xs text-muted-foreground">⚠ {s}</p>)}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
