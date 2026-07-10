import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/90 text-primary-foreground",
        secondary: "border-secondary/20 bg-secondary/10 text-[hsl(var(--navy-deep))]",
        destructive: "border-red-200/80 bg-red-50 text-red-800",
        outline: "text-muted-foreground border-border/60 bg-transparent",
        success: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200/80 bg-amber-50 text-amber-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
