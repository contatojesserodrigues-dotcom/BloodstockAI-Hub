import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const premiumCardVariants = cva(
  "rounded-xl border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border/50 shadow-[var(--shadow-card)]",
        elevated: "bg-card text-card-foreground border-border/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-premium)] hover:border-border/70",
        gold: "bg-card text-card-foreground border-secondary/20 shadow-[var(--shadow-card)] hover:border-secondary/35",
        glass: "bg-card/90 backdrop-blur-sm text-card-foreground border-border/40",
        premium: "bg-card text-card-foreground border-border/50 shadow-[var(--shadow-card)]",
        dark: "bg-[hsl(var(--navy-deep))] text-foreground border-border/30",
        interactive: "bg-card text-card-foreground border-border/50 shadow-[var(--shadow-card)] hover:border-border/70 cursor-pointer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface PremiumCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof premiumCardVariants> {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant, icon, title, subtitle, action, children, ...props }, ref) => (
    <div ref={ref} className={cn(premiumCardVariants({ variant }), className)} {...props}>
      {(icon || title || subtitle || action) && (
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
);
PremiumCard.displayName = "PremiumCard";

export { PremiumCard, premiumCardVariants };
