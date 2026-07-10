import { MarketEstimateTiers, type MarketTiersData } from "@/components/dashboard/MarketEstimateTiers";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, Timer, AlertTriangle, Trophy, Target, DollarSign, Award, Stethoscope, ShieldAlert, ThumbsUp, Percent } from "lucide-react";
import type { CommercialAdjustment } from "@/utils/inspectionMarketRoi";

export interface RoiCategory {
  category: "FOAL" | "WEANLING" | "YEARLING" | "TWO_YO" | "HORSE_IN_TRAINING";
  label: string;
  purchase: string;
  resale: string;
  prep_cost: string;
  risk: "Low" | "Medium" | "High";
  roi_pct: string;
  best_window: string;
  route: string;
}

export interface FuturePotential {
  g1_pct: number;
  g2_pct: number;
  g3_pct: number;
  black_type_pct: number;
  winner_pct: number;
  lifetime_low: string;
  lifetime_high: string;
  sire_fee: string | null;
  sire_yearling_avg: string | null;
  dam_black_type: string | null;
  verdict: string;
}

export interface MarketRoiData {
  market: MarketTiersData;
  roi?: RoiCategory[];
  future?: FuturePotential;
  adjustment?: CommercialAdjustment;
}

const RISK_COLORS: Record<string, string> = {
  Low: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  Medium: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  High: "text-red-600 border-red-500/30 bg-red-500/10",
};

export function MarketRoiPanel({ data }: { data?: MarketRoiData | null }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground text-center">
        Run market estimate to view valuation tiers and ROI projection.
      </div>
    );
  }
  const f = data.future;
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const gradeColor = (v: number) => v >= 15 ? "text-emerald-600" : v >= 6 ? "text-amber-600" : "text-muted-foreground";
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Market estimate</div>
        <MarketEstimateTiers data={data.market} />
        {data.adjustment && data.adjustment.pct !== 0 && (
          <div className={`mt-3 rounded-lg border p-3 sm:p-4 ${data.adjustment.pct < 0 ? "border-red-300 bg-red-50/60" : "border-emerald-300 bg-emerald-50/60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                <Percent className="w-3.5 h-3.5" /> Commercial price adjustment
              </div>
              <div className={`text-lg font-bold ${data.adjustment.pct < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {data.adjustment.pct > 0 ? "+" : ""}{data.adjustment.pct}%
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Inspection findings affected estimated value — mirroring how professional buyers price risk at public auction.
            </p>
            {data.adjustment.reasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {data.adjustment.reasons.map((r, i) => {
                  const Icon = r.kind === "vet" ? Stethoscope : r.kind === "bonus" ? ThumbsUp : ShieldAlert;
                  const color = r.kind === "bonus" ? "text-emerald-700" : r.kind === "vet" ? "text-amber-700" : "text-red-700";
                  return (
                    <li key={i} className={`flex items-start gap-2 text-[11px] ${color}`}>
                      <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="flex-1 min-w-0">{r.label}</span>
                      <span className="font-semibold">{r.impact > 0 ? "+" : ""}{r.impact}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {data.adjustment.narrative && (
              <p className="text-[11px] italic text-foreground/80 mt-2 border-t pt-2">{data.adjustment.narrative}</p>
            )}
          </div>
        )}
      </div>

      {f && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Future potential — racing projection</div>
          <div className="rounded-xl border bg-gradient-to-br from-amber-50/70 via-background to-background p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "G1 chance", value: f.g1_pct, icon: Trophy, color: "amber" },
                { label: "G2 chance", value: f.g2_pct, icon: Award, color: "amber" },
                { label: "G3 chance", value: f.g3_pct, icon: Award, color: "amber" },
                { label: "Black type", value: f.black_type_pct, icon: Target, color: "emerald" },
                { label: "Winner", value: f.winner_pct, icon: Target, color: "emerald" },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="rounded-lg border bg-card p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Icon className="w-3 h-3" />{k.label}
                    </div>
                    <div className={`mt-1 text-lg sm:text-xl font-bold ${gradeColor(k.value)}`}>{pct(k.value)}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-md border bg-card p-2.5">
                <div className="flex items-center gap-1 text-muted-foreground"><DollarSign className="w-3 h-3" />Projected lifetime earnings</div>
                <div className="font-semibold text-foreground mt-0.5">{f.lifetime_low} – {f.lifetime_high}</div>
              </div>
              <div className="rounded-md border bg-card p-2.5">
                <div className="text-muted-foreground">Sire fee · Yearling avg</div>
                <div className="font-semibold text-foreground mt-0.5 truncate">
                  {f.sire_fee ?? "—"} {f.sire_yearling_avg ? `· ${f.sire_yearling_avg}` : ""}
                </div>
              </div>
              <div className="rounded-md border bg-card p-2.5">
                <div className="text-muted-foreground">Dam black-type produce</div>
                <div className="font-semibold text-foreground mt-0.5 truncate">{f.dam_black_type ?? "—"}</div>
              </div>
            </div>
            <div className="text-[11px] italic text-muted-foreground border-t pt-2">{f.verdict}</div>
          </div>
        </div>
      )}

      {data.roi?.length ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            ROI projection · matched to horse category
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {data.roi.map((r) => (
              <div key={r.category} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="text-sm font-semibold leading-tight flex-1 min-w-0">{r.label}</div>
                  <Badge variant="outline" className={`text-[10px] ${RISK_COLORS[r.risk] ?? ""}`}>
                    <AlertTriangle className="w-3 h-3 mr-1" />{r.risk} risk
                  </Badge>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1 text-muted-foreground"><Wallet className="w-3 h-3" />Purchase</div>
                  <div className="text-right font-medium">{r.purchase}</div>
                  <div className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="w-3 h-3" />Resale</div>
                  <div className="text-right font-medium">{r.resale}</div>
                  <div className="text-muted-foreground">Prep cost</div>
                  <div className="text-right">{r.prep_cost}</div>
                  <div className="text-muted-foreground">ROI</div>
                  <div className="text-right font-semibold text-emerald-600">{r.roi_pct}</div>
                  <div className="flex items-center gap-1 text-muted-foreground"><Timer className="w-3 h-3" />Window</div>
                  <div className="text-right">{r.best_window}</div>
                </div>
                <div className="text-[11px] text-muted-foreground italic border-t pt-1.5">{r.route}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MarketRoiPanel;