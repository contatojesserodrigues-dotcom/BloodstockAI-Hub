import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export interface PremiumTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface PremiumTableProps<T> {
  columns: PremiumTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  striped?: boolean;
  compact?: boolean;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
}

/**
 * Design-system-aligned table with striped rows, empty state,
 * and optional row click handler.
 */
export function PremiumTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No data available.",
  striped = true,
  compact = false,
  className,
  onRowClick,
}: PremiumTableProps<T>) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  compact && "px-3 py-2",
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={i}
                className={cn(
                  striped && i % 2 === 0 && "bg-muted/20",
                  onRowClick && "cursor-pointer hover:bg-secondary/5",
                  compact && "[&_td]:px-3 [&_td]:py-2"
                )}
                onClick={() => onRowClick?.(row, i)}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row, i) : (row[col.key] as React.ReactNode) ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
