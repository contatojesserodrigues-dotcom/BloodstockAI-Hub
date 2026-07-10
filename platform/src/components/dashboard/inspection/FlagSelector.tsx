import { Bookmark, Flag, Heart, Star, Stethoscope, X, Clock } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InspectionFlag =
  | "none" | "favourite" | "shortlist" | "reject"
  | "vet_check" | "follow_up" | "high_interest";

export const FLAG_META: Record<InspectionFlag, {
  label: string; color: string; bg: string; icon: React.ReactNode;
}> = {
  none:          { label: "No flag",       color: "text-muted-foreground", bg: "bg-muted",          icon: <Flag className="w-3.5 h-3.5" /> },
  favourite:     { label: "Favourite",     color: "text-amber-500",        bg: "bg-amber-500/10",   icon: <Star className="w-3.5 h-3.5 fill-current" /> },
  shortlist:     { label: "Shortlist",     color: "text-blue-600",         bg: "bg-blue-500/10",    icon: <Bookmark className="w-3.5 h-3.5 fill-current" /> },
  high_interest: { label: "High interest", color: "text-fuchsia-600",      bg: "bg-fuchsia-500/10", icon: <Heart className="w-3.5 h-3.5 fill-current" /> },
  vet_check:     { label: "Vet check",     color: "text-teal-600",         bg: "bg-teal-500/10",    icon: <Stethoscope className="w-3.5 h-3.5" /> },
  follow_up:     { label: "Follow up",     color: "text-indigo-600",       bg: "bg-indigo-500/10",  icon: <Clock className="w-3.5 h-3.5" /> },
  reject:        { label: "Reject",        color: "text-red-600",          bg: "bg-red-500/10",     icon: <X className="w-3.5 h-3.5" /> },
};

const FLAG_ORDER: InspectionFlag[] = [
  "favourite", "shortlist", "high_interest", "vet_check", "follow_up", "reject", "none",
];

export function FlagBadge({ flag, className }: { flag: InspectionFlag; className?: string }) {
  if (flag === "none") return null;
  const m = FLAG_META[flag];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      m.bg, m.color, className,
    )}>
      {m.icon}{m.label}
    </span>
  );
}

export function FlagSelector({
  value, onChange, size = "sm",
}: { value: InspectionFlag; onChange: (next: InspectionFlag) => void; size?: "sm" | "icon" }) {
  const m = FLAG_META[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("gap-1.5", value !== "none" && `${m.color} border-current/30`)}
          title="Set inspection flag"
        >
          {m.icon}
          <span className="hidden sm:inline text-xs font-medium">{m.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Inspection flag</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FLAG_ORDER.map((f) => (
          <DropdownMenuItem key={f} onClick={() => onChange(f)} className="gap-2 text-sm">
            <span className={FLAG_META[f].color}>{FLAG_META[f].icon}</span>
            {FLAG_META[f].label}
            {value === f && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FlagFilterBar({
  value, counts, onChange,
}: {
  value: InspectionFlag | "all";
  counts: Partial<Record<InspectionFlag | "all", number>>;
  onChange: (next: InspectionFlag | "all") => void;
}) {
  const opts: Array<{ key: InspectionFlag | "all"; label: string }> = [
    { key: "all",           label: "All" },
    { key: "favourite",     label: "Favourites" },
    { key: "shortlist",     label: "Shortlist" },
    { key: "high_interest", label: "High interest" },
    { key: "vet_check",     label: "Vet check" },
    { key: "follow_up",     label: "Follow up" },
    { key: "reject",        label: "Rejected" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => {
        const active = value === o.key;
        const m = o.key === "all" ? null : FLAG_META[o.key as InspectionFlag];
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border text-muted-foreground",
            )}
          >
            {m ? <span className={active ? "" : m.color}>{m.icon}</span> : null}
            {o.label}
            {typeof counts[o.key] === "number" && (
              <span className={cn("ml-1 rounded-full px-1.5 text-[10px]", active ? "bg-primary-foreground/20" : "bg-muted")}>
                {counts[o.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}