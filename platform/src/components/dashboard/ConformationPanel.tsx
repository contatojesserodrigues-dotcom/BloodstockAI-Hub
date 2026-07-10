import { AlertTriangle, Star } from "lucide-react";
import { scoreBandClass } from "@/utils/scoreWeights";

interface Dim {
  score?: number;
  assessment?: string;
  concern?: boolean;
  concern_detail?: string;
}

export interface ConformationResult {
  dimensions?: {
    balance?: Dim;
    front_legs?: Dim;
    hind_legs?: Dim;
    shoulder?: Dim;
    hip_hindquarters?: Dim;
    back_topline?: Dim;
    head_neck?: Dim;
    feet_hooves?: Dim;
    movement?: Dim;
  };
  overall_conformation_score?: number;
  conformation_summary?: string;
  buyer_profile?: string;
  red_flags?: string[];
}

const DIM_LABELS: Array<[keyof NonNullable<ConformationResult["dimensions"]>, string]> = [
  ["balance", "Balance"],
  ["front_legs", "Front Legs"],
  ["hind_legs", "Hind Legs"],
  ["shoulder", "Shoulder"],
  ["hip_hindquarters", "Hip / Hindquarters"],
  ["back_topline", "Back & Topline"],
  ["head_neck", "Head & Neck"],
  ["feet_hooves", "Feet & Hooves"],
  ["movement", "Movement"],
];

function tenToHundred(s?: number) {
  if (s == null) return null;
  return Math.round(s * 10);
}

export default function ConformationPanel({ data }: { data: ConformationResult }) {
  if (!data) return null;
  const dims = data.dimensions || {};
  return (
    <div className="space-y-3 rounded-lg border border-secondary/30 bg-secondary/5 p-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-secondary">Conformation Analysis</h5>
        {data.overall_conformation_score != null && (
          <span className={`text-lg font-bold ${scoreBandClass(data.overall_conformation_score).text}`}>
            {data.overall_conformation_score}/100
          </span>
        )}
      </div>
      <div className="space-y-2">
        {DIM_LABELS.map(([key, label]) => {
          const d = dims[key];
          if (!d) return null;
          const pct = tenToHundred(d.score) ?? 0;
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
              {d.concern && d.concern_detail && (
                <p className="text-[11px] text-red-400">⚠ {d.concern_detail}</p>
              )}
            </div>
          );
        })}
      </div>
      {data.conformation_summary && (
        <p className="text-xs text-foreground border-t border-border/30 pt-2">{data.conformation_summary}</p>
      )}
      {data.buyer_profile && (
        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Buyer profile:</span> {data.buyer_profile}</p>
      )}
      {data.red_flags && data.red_flags.length > 0 && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
          <p className="text-[11px] font-semibold text-red-400 mb-1">Red flags</p>
          {data.red_flags.map((rf, i) => (
            <p key={i} className="text-[11px] text-red-400">⚠ {rf}</p>
          ))}
        </div>
      )}
    </div>
  );
}