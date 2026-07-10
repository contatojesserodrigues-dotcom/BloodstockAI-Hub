import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pedigreeNodeVariants = cva(
  "rounded-md border px-3 py-2 text-center font-medium transition-all duration-200 truncate",
  {
    variants: {
      generation: {
        root: "bg-[hsl(var(--navy-deep))] text-secondary border-secondary/40 font-luxury text-sm shadow-[var(--shadow-gold)]",
        gen1: "bg-card text-card-foreground border-secondary/30 text-sm font-semibold",
        gen2: "bg-muted text-foreground border-border text-xs",
        gen3: "bg-muted/60 text-muted-foreground border-border/60 text-xs",
        gen4: "bg-muted/40 text-muted-foreground border-border/40 text-[11px]",
        gen5: "bg-muted/20 text-muted-foreground/80 border-border/30 text-[10px]",
      },
      branch: {
        sire: "border-l-2 border-l-secondary",
        dam: "border-l-2 border-l-[hsl(var(--silver))]",
        neutral: "",
      },
    },
    defaultVariants: {
      generation: "gen2",
      branch: "neutral",
    },
  }
);

export interface PedigreeNodeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pedigreeNodeVariants> {
  name: string;
  country?: string | null;
  year?: number | null;
  unknown?: boolean;
}

const PedigreeNode = React.forwardRef<HTMLDivElement, PedigreeNodeProps>(
  ({ className, generation, branch, name, country, year, unknown, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        pedigreeNodeVariants({ generation, branch }),
        unknown && "italic text-muted-foreground/50",
        className
      )}
      title={name}
      {...props}
    >
      <span className="block truncate">{unknown ? "Unknown" : name}</span>
      {(country || year) && (
        <span className="block text-[10px] text-muted-foreground/70 truncate">
          {[country, year].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  )
);
PedigreeNode.displayName = "PedigreeNode";

/** SVG connector line between pedigree nodes */
const PedigreeConnector = ({
  branch = "sire",
  className,
}: {
  branch?: "sire" | "dam";
  className?: string;
}) => (
  <svg className={cn("absolute", className)} width="24" height="100%" viewBox="0 0 24 100" preserveAspectRatio="none">
    <line
      x1="0" y1="50" x2="24" y2="50"
      stroke={branch === "sire" ? "hsl(41 51% 54%)" : "hsl(0 0% 71%)"}
      strokeWidth="1.5"
    />
  </svg>
);

export { PedigreeNode, PedigreeConnector, pedigreeNodeVariants };
