import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const reportSectionVariants = cva(
  "rounded-lg border p-6 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        highlight: "bg-card text-card-foreground border-secondary/30 shadow-[var(--shadow-gold)]",
        muted: "bg-muted/50 text-card-foreground border-border/50",
        insight: "bg-secondary/5 text-card-foreground border-secondary/20",
        warning: "bg-destructive/5 text-card-foreground border-destructive/20",
        success: "bg-emerald-500/5 text-card-foreground border-emerald-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ReportSectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof reportSectionVariants> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

const ReportSection = React.forwardRef<HTMLDivElement, ReportSectionProps>(
  ({ className, variant, icon, title, subtitle, badge, children, ...props }, ref) => (
    <div ref={ref} className={cn(reportSectionVariants({ variant }), className)} {...props}>
      <div className="mb-4 flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold leading-tight truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
);
ReportSection.displayName = "ReportSection";

/** Small data row used inside report sections */
const ReportDataRow = ({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-0", className)}>
    <span className="text-sm text-muted-foreground truncate">{label}</span>
    <span className="text-sm font-medium text-card-foreground text-right">{value}</span>
  </div>
);

/** Score indicator pill */
const ReportScore = ({
  score,
  max = 100,
  label,
  className,
}: {
  score: number;
  max?: number;
  label?: string;
  className?: string;
}) => {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-secondary" : pct >= 25 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-card-foreground">{score}/{max}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export { ReportSection, ReportDataRow, ReportScore, reportSectionVariants };
