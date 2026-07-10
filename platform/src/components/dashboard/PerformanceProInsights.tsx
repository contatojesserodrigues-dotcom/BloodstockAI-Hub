import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Gauge, TrendingUp, Target, Layers, Wind, Trophy, DollarSign,
  Award, AlertTriangle, LineChart as LineChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, Cell
} from "recharts";
import type { PerformanceResult } from "@/integrations/supabase/hooks/usePerformanceAnalysis";

const SCORE_LABELS: Record<string, string> = {
  performance: "Performance",
  pedigree: "Pedigree",
  commercial: "Commercial",
  consistency: "Consistency",
  distance_suitability: "Distance Fit",
  surface_suitability: "Surface Fit",
  improvement: "Improvement",
  future_potential: "Future",
  market_appeal: "Market Appeal",
  roi_potential: "ROI",
  risk: "Risk",
};

const scoreColor = (v: number) =>
  v >= 85 ? "#10b981" : v >= 70 ? "#eab308" : v >= 50 ? "#f97316" : "#ef4444";

export const PerformanceProInsights = ({ result }: { result: PerformanceResult }) => {
  const es = result.executive_summary;
  const bs = result.bloodstock_scores;
  const pace = result.pace_profile;
  const ci = result.commercial_intelligence;
  const fp = result.future_projection;
  const timeline = (result.performance_timeline || []).filter((t) => t.season);
  const distance = (result.distance_buckets || []).filter((d) => d.starts > 0 || (d.best_rpr ?? 0) > 0 || d.score > 0);
  const surface = (result.surface_buckets || []).filter((d) => d.starts > 0 || d.score > 0);
  const going = (result.going_buckets || []).filter((d) => d.starts > 0 || d.score > 0);

  const radarData = bs
    ? Object.entries(SCORE_LABELS).map(([k, label]) => ({
        metric: label,
        score: Number((bs as any)[k] ?? 0),
      }))
    : [];

  const paceData = pace
    ? [
        { axis: "Early Speed", v: pace.early_speed ?? 0 },
        { axis: "Cruising", v: pace.cruising_speed ?? 0 },
        { axis: "Acceleration", v: pace.acceleration ?? 0 },
        { axis: "Finish", v: pace.finishing_strength ?? 0 },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* EXECUTIVE SUMMARY */}
      {es && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <SummaryStat label="Racing Level" value={es.current_racing_level} />
              <SummaryStat label="Future Potential" value={es.future_potential} />
              <SummaryStat label="Commercial" value={es.commercial_rating} />
              <SummaryStat label="Consistency" value={es.consistency_rating} />
              <SummaryStat label="Trend" value={es.improvement_trend} />
              <SummaryStat label="Confidence" value={es.performance_confidence} />
              <SummaryStat label="Risk" value={es.risk_rating} />
              <SummaryStat label="Overall Score" value={es.overall_performance_score != null ? `${es.overall_performance_score}/100` : undefined} highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOODSTOCKAI SCORES — RADAR */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" />
              BloodstockAI Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {radarData.map((d) => (
                  <div key={d.metric}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{d.metric}</span>
                      <span className="font-semibold" style={{ color: scoreColor(d.score) }}>{d.score}/100</span>
                    </div>
                    <Progress value={d.score} />
                  </div>
                ))}
                {bs?.overall != null && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 flex items-center justify-between">
                    <span className="text-sm font-medium">Overall BloodstockAI Rating</span>
                    <span className="text-2xl font-bold" style={{ color: scoreColor(bs.overall) }}>{bs.overall}/100</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PERFORMANCE TIMELINE */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="h-4 w-4 text-primary" />
              Performance Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="peakG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="peak_rpr" name="Peak RPR" stroke="hsl(var(--primary))" fill="url(#peakG)" />
                  <Line type="monotone" dataKey="avg_rpr" name="Avg RPR" stroke="#eab308" strokeWidth={2} dot />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DISTANCE HEATMAP */}
      {distance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Distance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" name="Suitability">
                    {distance.map((d, i) => (
                      <Cell key={i} fill={scoreColor(d.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
              {distance.map((d) => (
                <div
                  key={d.label}
                  className="rounded p-2 text-center"
                  style={{ background: scoreColor(d.score) + "22", borderLeft: `3px solid ${scoreColor(d.score)}` }}
                  title={`Starts ${d.starts} · Wins ${d.wins}`}
                >
                  <div className="text-[10px] text-muted-foreground">{d.label}</div>
                  <div className="text-sm font-bold">{d.score}</div>
                </div>
              ))}
            </div>
            {result.distance_recommendation && (
              <p className="text-xs italic text-muted-foreground">{result.distance_recommendation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SURFACE + GOING */}
      {(surface.length > 0 || going.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {surface.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  Surface Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={surface} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="score">
                        {surface.map((d, i) => (<Cell key={i} fill={scoreColor(d.score)} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {going.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wind className="h-4 w-4 text-primary" />
                  Going Preference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={going}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="score">
                        {going.map((d, i) => (<Cell key={i} fill={scoreColor(d.score)} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PACE PROFILE */}
      {pace && paceData.some((p) => p.v > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pace Profile
              {pace.running_style && <Badge variant="secondary" className="ml-2">{pace.running_style}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={paceData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar dataKey="v" stroke="#eab308" fill="#eab308" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{pace.commentary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RACE-BY-RACE */}
      {result.race_by_race && result.race_by_race.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Race-by-Race
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Course</th>
                    <th className="text-left p-2">Trip</th>
                    <th className="text-left p-2">Class</th>
                    <th className="text-left p-2">Pos</th>
                    <th className="text-left p-2">OR</th>
                    <th className="text-left p-2">Rating</th>
                    <th className="text-left p-2">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {result.race_by_race.map((r, i) => (
                    <tr key={i} className="border-t border-border/40 align-top">
                      <td className="p-2 whitespace-nowrap">{r.date || "—"}</td>
                      <td className="p-2">{r.course || "—"}{r.country ? ` (${r.country})` : ""}</td>
                      <td className="p-2">{[r.distance, r.surface, r.going].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="p-2">{r.class || "—"}</td>
                      <td className="p-2 font-bold">{r.position || "—"}</td>
                      <td className="p-2">{r.official_rating ?? "—"}</td>
                      <td className="p-2 font-semibold">{r.race_rating ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{r.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* COMMERCIAL INTELLIGENCE */}
      {ci && (
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Commercial Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <SummaryStat label="Racing Prospect" value={ci.racing_prospect_value_usd} />
              <SummaryStat label="Broodmare Value" value={ci.broodmare_value_usd} />
              <SummaryStat label="Stallion Prospect" value={ci.stallion_prospect_value_usd} />
              <SummaryStat label="Export Value" value={ci.export_value_usd} />
              <SummaryStat label="NH Value" value={ci.nh_value_usd} />
              <SummaryStat label="Auction Demand" value={ci.auction_demand} />
            </div>
            {ci.commercial_appeal != null && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Commercial Appeal</span>
                  <span className="font-semibold" style={{ color: scoreColor(ci.commercial_appeal) }}>{ci.commercial_appeal}/100</span>
                </div>
                <Progress value={ci.commercial_appeal} />
              </div>
            )}
            {ci.roi_projection && (
              <div className="bg-muted/40 p-3 rounded text-sm">
                <span className="text-xs text-muted-foreground">ROI Projection</span>
                <p className="font-medium mt-1">{ci.roi_projection}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground italic flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {ci.disclaimer || "All valuations are probabilistic estimates — not guaranteed market prices."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* FUTURE PROJECTION */}
      {fp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Future Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <SummaryStat label="Rating Ceiling" value={fp.rating_ceiling} />
            <SummaryStat label="Black Type" value={fp.black_type_potential} />
            <SummaryStat label="Listed" value={fp.listed_potential} />
            <SummaryStat label="Group" value={fp.group_potential} />
            <SummaryStat label="Classic" value={fp.classic_potential} />
            <SummaryStat label="NH Potential" value={fp.nh_potential} />
            <SummaryStat label="Ideal Distance" value={fp.ideal_distance} />
            <SummaryStat label="Ideal Surface" value={fp.ideal_surface} />
            <SummaryStat label="Best Campaign" value={fp.best_campaign} />
            {fp.career_recommendation && (
              <div className="col-span-2 md:col-span-3 bg-primary/5 rounded p-3 mt-2">
                <span className="text-xs text-muted-foreground">Career Recommendation</span>
                <p className="text-sm mt-1">{fp.career_recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PEDIGREE vs PERFORMANCE */}
      {result.pedigree_vs_performance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedigree vs Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.pedigree_vs_performance.verdict && (
              <Badge variant="secondary">{result.pedigree_vs_performance.verdict}</Badge>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <SummaryStat label="Expected Distance" value={result.pedigree_vs_performance.expected_distance} />
              <SummaryStat label="Expected Surface" value={result.pedigree_vs_performance.expected_surface} />
              <SummaryStat label="Development" value={result.pedigree_vs_performance.development_pattern} />
            </div>
            {result.pedigree_vs_performance.commentary && (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.pedigree_vs_performance.commentary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* PROFESSIONAL COMMENTARY */}
      {result.professional_commentary && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Professional Bloodstock Commentary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {result.professional_commentary}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SummaryStat = ({ label, value, highlight }: { label: string; value?: string | number; highlight?: boolean }) => (
  <div className={`rounded p-2 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`font-semibold ${highlight ? "text-primary" : ""} text-sm`}>{value || "—"}</div>
  </div>
);