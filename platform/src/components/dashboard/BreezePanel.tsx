import { scoreBandClass } from "@/utils/scoreWeights";
import { Star, AlertTriangle } from "lucide-react";

interface BreezeDim { score?: number; assessment?: string; concern?: boolean; raw_time?: string; distance?: string; }

export interface BreezeResult {
  dimensions?: Record<string, BreezeDim>;
  overall_breeze_score?: number;
  breeze_summary?: string;
  pinhooker_verdict?: string;
  recommended_buyer_profile?: string;
  red_flags?: string[];
  benchmark_comparison?: string;
}

const ORDER: Array<[string, string]> = [
  ["stride_length", "Stride Length"],
  ["stride_frequency", "Stride Frequency"],
  ["action", "Action"],
  ["balance_in_motion", "Balance in Motion"],
  ["extension", "Extension"],
  ["recovery", "Recovery"],
  ["rider_feel", "Rider Feel"],
  ["time_assessment", "Time Assessment"],
  ["physical_impression", "Physical Impression"],
  ["commercial_appeal", "Commercial Appeal"],
];

export default function BreezePanel({ data }: { data: BreezeResult }) {
  if (!data) return null;
  const dims = data.dimensions || {};
  return (
    <div className="space-y-3 rounded-lg border border-secondary/30 bg-secondary/5 p-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-secondary">Breeze-Up Analysis</h5>
        {data.overall_breeze_score != null && (
          <span className={`text-lg font-bold ${scoreBandClass(data.overall_breeze_score).text}`}>
            {data.overall_breeze_score}/100
          </span>
        )}
      </div>
      <div className="space-y-2">
        {ORDER.map(([key, label]) => {
          const d = dims[key]; if (!d) return null;
          const pct = d.score != null ? Math.round(d.score * 10) : 0;
          const band = scoreBandClass(pct);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {label}
                  {d.concern && <AlertTriangle className="h-3 w-3 text-red-400" />}
                  {d.score != null && d.score >= 8 && <Star className="h-3 w-3 text-secondary" />}
                </span>
                <span className={`font-semibold ${band.text}`}>{d.score ?? "—"}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all ${band.fill}`} style={{ width: `${pct}%` }} />
              </div>
              {d.assessment && <p className="text-[11px] text-muted-foreground">{d.assessment}</p>}
              {(d.raw_time || d.distance) && (
                <p className="text-[11px] text-secondary">{[d.raw_time, d.distance].filter(Boolean).join(" / ")}</p>
              )}
            </div>
          );
        })}
      </div>
      {data.breeze_summary && <p className="text-xs text-foreground border-t border-border/30 pt-2">{data.breeze_summary}</p>}
      {data.pinhooker_verdict && (
        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Pinhooker verdict:</span> {data.pinhooker_verdict}</p>
      )}
      {data.recommended_buyer_profile && (
        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Buyer profile:</span> {data.recommended_buyer_profile}</p>
      )}
      {data.benchmark_comparison && (
        <p className="text-[11px] text-secondary">{data.benchmark_comparison}</p>
      )}
      {data.red_flags && data.red_flags.length > 0 && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
          {data.red_flags.map((rf, i) => <p key={i} className="text-[11px] text-red-400">⚠ {rf}</p>)}
        </div>
      )}
    </div>
  );
}