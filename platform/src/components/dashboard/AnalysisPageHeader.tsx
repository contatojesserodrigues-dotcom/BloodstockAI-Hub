import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Responsive header for analysis modules — stacks cleanly on mobile. */
export function AnalysisPageHeader({ title, description, action }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 p-4 sm:p-6">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-lg sm:text-xl leading-tight">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs sm:text-sm leading-relaxed max-w-2xl">
              {description}
            </CardDescription>
          )}
        </div>
        {action && (
          <div className="w-full sm:w-auto shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
            {action}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

export function AnalysisActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 w-full [&>button]:flex-1 sm:[&>button]:flex-none min-w-0">
      {children}
    </div>
  );
}

export function AnalysisMetricStrip({ items }: { items: string[] }) {
  return (
    <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed break-words">
      {items.join(" · ")}
    </p>
  );
}
