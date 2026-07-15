import { memo } from "react";
import { cn, statusColors, formatStatus } from "@/lib/utils";

export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide", statusColors[status] || statusColors.IDLE)}>
      {formatStatus(status)}
    </span>
  );
});
