import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { TrendingUp, Sparkles, Trophy, AlertTriangle, ShieldCheck } from "lucide-react";

type Block = {
  block_score: number | null;
  score_breakdown: any;
  attention_points: string[] | null;
  media_purpose: string;
};

type Props = {
  consolidatedScore: number | null;
  blocks: Block[];
  pedigreeSummary: any | null;
  pedigreeResearch: any | null;
  marketEstimate: any | null;
  hasPedigreeInsight: boolean;
  intelligenceScores?: Record<string, any> | null;
};

function bandColor(v: number): string {
  if (v >= 80) return "hsl(160 60% 42%)";   // emerald
  if (v >= 65) return "hsl(43 80% 50%)";    // gold
  if (v >= 50) return "hsl(38 92% 50%)";    // amber
  return "hsl(350 80% 55%)";                // rose
}

function bandLabel(v: number) {
  if (v >= 80) return "Excellent";
  if (v >= 65) return "Good";
  if (v >= 50) return "Acceptable";
  return "Concern";
}

function avg(nums: number[]): number | null {
  const xs = nums.filter((n) => typeof n === "number" && !isNaN(n));
  if (!xs.length) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function confidenceToScore(c?: string): number {
  if (c === "high") return 88;
  if (c === "moderate") return 72;
  if (c === "low") return 55;
  return 0;
}

export function InspectionScoreDashboard({
  consolidatedScore, blocks, pedigreeSummary, pedigreeResearch, marketEstimate, hasPedigreeInsight,
  intelligenceScores,
}: Props) {
  const { axes, bloodstockScore, baselineScore, pedigreeRating, marketRange, topAttention } = useMemo(() => {
    const serverReport = intelligenceScores;
    if (serverReport && typeof serverReport.overall_score === "number") {
      const comp = serverReport.components || {};
      return {
        axes: [
          { axis: "Biomechanics", value: comp.biomechanics ?? serverReport.biomechanics?.score ?? 0, has: true },
          { axis: "Pedigree", value: comp.pedigree ?? serverReport.pedigree?.score ?? 0, has: true },
          { axis: "Conformation", value: comp.conformation ?? serverReport.conformation?.score ?? 0, has: true },
          { axis: "Behaviour", value: comp.behaviour ?? serverReport.behaviour?.score ?? 0, has: true },
          { axis: "Commercial", value: comp.commercial ?? serverReport.commercial?.score ?? 0, has: true },
          { axis: "Hoof", value: serverReport.hoof?.score ?? 0, has: serverReport.hoof?.score != null },
        ],
        bloodstockScore: Math.round(serverReport.overall_score),
        baselineScore: Math.round(serverReport.overall_score),
        pedigreeRating: serverReport.pedigree?.score != null
          ? (serverReport.pedigree.score / 10).toFixed(1) : null,
        marketRange: marketEstimate?.range_label || null,
        topAttention: blocks.flatMap((b) => b.attention_points || []).slice(0, 4),
      };
    }

    const conf = avg(blocks.map((b) => b?.score_breakdown?.conformation).filter((v: any) => typeof v === "number"));
    const gait = avg(blocks.map((b) => b?.score_breakdown?.gait).filter((v: any) => typeof v === "number"));
    const hoof = avg(blocks.map((b) => b?.score_breakdown?.hoof).filter((v: any) => typeof v === "number"));
    const musc = avg(blocks.map((b) => b?.score_breakdown?.musculature).filter((v: any) => typeof v === "number"));

    const insight = pedigreeSummary?.insight;
    const pedFromInsight = confidenceToScore(insight?.confidence);
    const pedFromResearch =
      typeof pedigreeResearch?.pedigree_rating === "number"
        ? Math.round(pedigreeResearch.pedigree_rating * 10)
        : 0;
    const pedigree = Math.max(pedFromInsight, pedFromResearch) || null;

    // Commercial: from market estimate tier or insight commercial sentiment proxy
    const tier = (marketEstimate?.tier || "").toLowerCase();
    let commercial: number | null = null;
    if (tier.includes("premium") || tier.includes("top")) commercial = 88;
    else if (tier.includes("strong") || tier.includes("commercial")) commercial = 78;
    else if (tier.includes("solid") || tier.includes("mid")) commercial = 65;
    else if (tier.includes("modest") || tier.includes("low")) commercial = 50;
    else if (hasPedigreeInsight) commercial = 70;

    const axes = [
      { axis: "Conformation", value: conf ?? 0, has: conf != null },
      { axis: "Gait", value: gait ?? 0, has: gait != null },
      { axis: "Hoof", value: hoof ?? 0, has: hoof != null },
      { axis: "Muscle", value: musc ?? 0, has: musc != null },
      { axis: "Pedigree", value: pedigree ?? 0, has: pedigree != null },
      { axis: "Commercial", value: commercial ?? 0, has: commercial != null },
    ];

    const baseline = typeof consolidatedScore === "number" ? Math.round(consolidatedScore) : null;

    // BloodstockAI Score = visual baseline + pedigree boost when cross-insight exists.
    let bloodstock = baseline;
    if (baseline != null && hasPedigreeInsight && pedigree) {
      const boost = Math.round((pedigree - baseline) * 0.35); // weighted blend
      bloodstock = Math.max(0, Math.min(100, baseline + boost));
    } else if (baseline == null && pedigree) {
      bloodstock = pedigree;
    }

    const pedigreeRating =
      typeof pedigreeResearch?.pedigree_rating === "number"
        ? pedigreeResearch.pedigree_rating.toFixed(1)
        : insight?.confidence === "high"
        ? "8.5"
        : insight?.confidence === "moderate"
        ? "7.0"
        : insight?.confidence === "low"
        ? "5.5"
        : null;

    const marketRange =
      marketEstimate?.range_label ||
      (marketEstimate?.low && marketEstimate?.high
        ? `${marketEstimate.currency || "$"}${Number(marketEstimate.low).toLocaleString()}–${Number(marketEstimate.high).toLocaleString()}`
        : null);

    const allAttention = blocks.flatMap((b) => b.attention_points || []);
    const topAttention = allAttention.slice(0, 4);

    return {
      axes,
      bloodstockScore: bloodstock,
      baselineScore: baseline,
      pedigreeRating,
      marketRange,
      topAttention,
    };
  }, [blocks, consolidatedScore, pedigreeSummary, pedigreeResearch, marketEstimate, hasPedigreeInsight]);

  const barData = axes.map((a) => ({ name: a.axis, score: a.has ? a.value : 0, fill: bandColor(a.value) }));
  const radarColor = "hsl(43 76% 52%)";
  const delta = bloodstockScore != null && baselineScore != null ? bloodstockScore - baselineScore : 0;

  return (
    <Card className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-background to-background">
      <CardContent className="p-3 sm:p-5 space-y-4 sm:space-y-5">
        {/* Top KPI row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> BloodstockAI Score
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold leading-none" style={{ color: bloodstockScore != null ? bandColor(bloodstockScore) : "hsl(0 0% 50%)" }}>
                {bloodstockScore != null ? bloodstockScore : "—"}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
              {delta !== 0 && (
                <Badge variant="outline" className={`text-[10px] ${delta > 0 ? "text-emerald-600 border-emerald-300" : "text-rose-600 border-rose-300"}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {delta > 0 ? `+${delta}` : delta}
                </Badge>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
              {bloodstockScore != null ? bandLabel(bloodstockScore) : "Awaiting first upload"}
              {hasPedigreeInsight && <span className="ml-1 text-emerald-600 hidden sm:inline">· pedigree-adjusted</span>}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pedigree Rating
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{pedigreeRating ?? "—"}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">/10</span>
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
              {hasPedigreeInsight ? "Cross-referenced" : "Upload pedigree PDF"}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Market Estimate
            </div>
            <div className="mt-1 text-base sm:text-2xl font-bold text-foreground break-words leading-tight">
              {marketRange ?? "—"}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
              {marketEstimate?.tier || (hasPedigreeInsight ? "Pedigree + inspection" : "Pending pedigree")}
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
          <div className="rounded-xl border bg-card p-3 min-w-0 w-full">
            <div className="text-xs font-semibold text-muted-foreground mb-1 px-1">Profile radar</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <RadarChart data={axes} outerRadius="68%" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                  <PolarGrid stroke="hsl(0 0% 85%)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(0 0% 30%)", fontSize: 9, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(0 0% 60%)", fontSize: 9 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke={radarColor}
                    fill={radarColor}
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid hsl(0 0% 85%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`${v}/100`, "Score"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3 min-w-0 w-full">
            <div className="text-xs font-semibold text-muted-foreground mb-1 px-1">Score by dimension</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(0 0% 25%)", fontWeight: 600 }} width={78} axisLine={false} tickLine={false} interval={0} />
                  <Tooltip
                    cursor={{ fill: "hsl(43 76% 52% / 0.08)" }}
                    contentStyle={{ background: "white", border: "1px solid hsl(0 0% 85%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`${v}/100`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={18}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Attention highlights */}
        {topAttention.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <div className="text-sm font-semibold">Quick attention points</div>
              <Badge variant="outline" className="ml-auto text-[10px]">Top {topAttention.length}</Badge>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topAttention.map((p, i) => (
                <li key={i} className="flex gap-2 text-xs bg-amber-50/60 border border-amber-200/60 rounded-md p-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InspectionScoreDashboard;