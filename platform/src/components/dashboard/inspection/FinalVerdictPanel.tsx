import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gavel,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FinalVerdictRecommendation = "BUY" | "WATCH" | "PASS";

export interface FinalVerdictPriceGuidance {
  value_zone?: string;
  target_bid?: string;
  walk_away?: string;
  currency?: string;
  notes?: string;
}

export interface FinalVerdict {
  recommendation: FinalVerdictRecommendation;
  confidence: number;
  headline: string;
  reasoning: string;
  strengths: string[];
  risks: string[];
  price_guidance: FinalVerdictPriceGuidance;
  next_steps: string[];
}

const REC_STYLES: Record<FinalVerdictRecommendation, string> = {
  BUY: "bg-emerald-600 text-white border-emerald-700",
  WATCH: "bg-amber-500 text-white border-amber-600",
  PASS: "bg-slate-600 text-white border-slate-700",
};

const REC_ICONS: Record<FinalVerdictRecommendation, typeof CheckCircle2> = {
  BUY: CheckCircle2,
  WATCH: Target,
  PASS: ShieldAlert,
};

function confidenceLabel(n: number) {
  if (n >= 75) return "High";
  if (n >= 50) return "Moderate";
  return "Low";
}

function confidenceColor(n: number) {
  if (n >= 75) return "text-emerald-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

type FinalVerdictPanelProps = {
  verdict: FinalVerdict;
  generatedAt?: string | null;
};

export function FinalVerdictPanel({ verdict, generatedAt }: FinalVerdictPanelProps) {
  const RecIcon = REC_ICONS[verdict.recommendation] ?? Gavel;
  const pg = verdict.price_guidance ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge className={cn("text-sm px-3 py-1.5 font-bold tracking-wide border", REC_STYLES[verdict.recommendation])}>
            <RecIcon className="w-4 h-4 mr-1.5" />
            {verdict.recommendation}
          </Badge>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</p>
            <p className={cn("text-lg font-bold tabular-nums", confidenceColor(verdict.confidence))}>
              {Math.round(verdict.confidence)}%
              <span className="text-xs font-medium text-muted-foreground ml-1.5">
                ({confidenceLabel(verdict.confidence)})
              </span>
            </p>
          </div>
        </div>
        {generatedAt && (
          <p className="text-[10px] text-muted-foreground">
            Generated {new Date(generatedAt).toLocaleString("en-GB")}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3">
        <p className="text-sm font-semibold text-foreground leading-snug">{verdict.headline}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reasoning</p>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{verdict.reasoning}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Strengths
          </p>
          <ul className="space-y-1.5">
            {(verdict.strengths ?? []).map((s, i) => (
              <li key={i} className="text-xs text-emerald-900 flex gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Risks
          </p>
          <ul className="space-y-1.5">
            {(verdict.risks ?? []).map((r, i) => (
              <li key={i} className="text-xs text-red-900 flex gap-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(pg.value_zone || pg.target_bid || pg.walk_away) && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Gavel className="w-3.5 h-3.5" /> Price guidance
          </p>
          <div className="grid sm:grid-cols-3 gap-2 text-xs">
            {pg.value_zone && (
              <div className="rounded-md border bg-background px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Value zone</p>
                <p className="font-semibold text-foreground mt-0.5">{pg.value_zone}</p>
              </div>
            )}
            {pg.target_bid && (
              <div className="rounded-md border bg-background px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Target bid</p>
                <p className="font-semibold text-emerald-700 mt-0.5">{pg.target_bid}</p>
              </div>
            )}
            {pg.walk_away && (
              <div className="rounded-md border bg-background px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Walk away</p>
                <p className="font-semibold text-red-700 mt-0.5">{pg.walk_away}</p>
              </div>
            )}
          </div>
          {pg.notes && <p className="text-[11px] text-muted-foreground">{pg.notes}</p>}
        </div>
      )}

      {(verdict.next_steps?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next steps</p>
          <ol className="space-y-1.5">
            {verdict.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <ArrowRight className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
