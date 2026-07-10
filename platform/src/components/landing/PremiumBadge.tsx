import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variants = {
  recommended: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  watchlist: "bg-sky-50 text-sky-800 border-sky-200/80",
  highValue: "bg-amber-50 text-amber-900 border-amber-200/80",
  risk: "bg-red-50 text-red-800 border-red-200/80",
  roi: "bg-[hsl(var(--navy-deep))]/5 text-[hsl(var(--navy-deep))] border-[hsl(var(--navy-deep))]/10",
  neutral: "bg-muted text-muted-foreground border-border/60",
} as const;

type PremiumBadgeProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
};

export const PremiumBadge = ({ children, variant = "neutral", className }: PremiumBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide",
      variants[variant],
      className,
    )}
  >
    {children}
  </span>
);
