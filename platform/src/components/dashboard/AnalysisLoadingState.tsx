import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  subtitle: string;
};

/** Premium inline loading panel for long-running dashboard analyses. */
export function AnalysisLoadingState({ title, subtitle }: Props) {
  return (
    <Card className="border-border/60 bg-[#F8FAFC]/90 shadow-sm">
      <CardContent className="py-12">
        <div className="flex flex-col items-center gap-5 max-w-md mx-auto text-center px-4">
          <div
            className="h-10 w-10 rounded-full border-2 border-[#0F172A]/15 border-t-[#0F172A] animate-spin"
            aria-hidden
          />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground tracking-[-0.02em]">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
          </div>
          <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/5 rounded-full bg-[#0F172A]/70 animate-pulse" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            BloodstockAI verified sources
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
