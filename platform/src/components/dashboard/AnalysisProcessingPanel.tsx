import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";

export type AnalysisStage = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  stages: AnalysisStage[];
  activeIndex: number;
  progress: number;
  statusMessage?: string;
  className?: string;
};

export function AnalysisProcessingPanel({ stages, activeIndex, progress, statusMessage, className }: Props) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Processing</p>
          <p className="mt-1 text-sm font-medium text-foreground">BloodstockAI analysis in progress</p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-secondary">{Math.round(progress)}%</span>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-secondary/80 to-secondary transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <ol className="space-y-2">
        {stages.map((stage, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={stage.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                done && "border-emerald-200 bg-emerald-50/80",
                active && "border-secondary/40 bg-secondary/5",
                !done && !active && "border-transparent bg-muted/30 opacity-60",
              )}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : active ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-secondary" />
              ) : (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
              )}
              <div className="min-w-0">
                <p className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{stage.label}</p>
                {active && stage.detail && <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {statusMessage && (
        <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">{statusMessage}</p>
      )}
    </div>
  );
}
