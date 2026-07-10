import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, X } from "lucide-react";

export const COUNTRY_OPTIONS = ["UK", "IRE", "FR", "USA", "AUS"] as const;
export type CountryCode = typeof COUNTRY_OPTIONS[number];

export const CATEGORY_OPTIONS = [
  "Broodmares",
  "Foals",
  "Weanlings",
  "Yearlings",
  "Breeze-Up/2YO",
  "HIT",
  "National Hunt",
  "Point to Point",
] as const;
export type Category = typeof CATEGORY_OPTIONS[number];

export interface MarketFilters {
  countries: CountryCode[]; // empty = All
  category: "all" | Category;
  sex: string;
  priceMin: string;
  priceMax: string;
  status: "all" | "active" | "sold";
  search: string;
}

export const defaultFilters: MarketFilters = {
  countries: [],
  category: "all",
  sex: "all",
  priceMin: "",
  priceMax: "",
  status: "all",
  search: "",
};

interface Props {
  filters: MarketFilters;
  onChange: (f: MarketFilters) => void;
}

const PillButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-colors shrink-0",
      active
        ? "bg-secondary text-secondary-foreground border-secondary"
        : "bg-transparent text-muted-foreground border-border/60 hover:border-secondary/50 hover:text-foreground",
    ].join(" ")}
  >
    {children}
  </button>
);

export const FilterBar = ({ filters, onChange }: Props) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const set = <K extends keyof MarketFilters>(k: K, v: MarketFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const toggleCountry = (c: CountryCode) => {
    const has = filters.countries.includes(c);
    set("countries", has ? filters.countries.filter((x) => x !== c) : [...filters.countries, c]);
  };

  const hasActive =
    filters.countries.length > 0 ||
    filters.category !== "all" ||
    filters.sex !== "all" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.search !== "" ||
    filters.status !== "active";

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
      {/* Row 1 — Countries (multi-select) */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Country</div>
        <div className="flex gap-2 overflow-x-auto md:flex-wrap">
          <PillButton active={filters.countries.length === 0} onClick={() => set("countries", [])}>
            All
          </PillButton>
          {COUNTRY_OPTIONS.map((c) => (
            <PillButton key={c} active={filters.countries.includes(c)} onClick={() => toggleCountry(c)}>
              {c}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Row 2 — Category (single-select) */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Category</div>
        <div className="flex gap-2 overflow-x-auto md:flex-wrap">
          <PillButton active={filters.category === "all"} onClick={() => set("category", "all")}>
            All
          </PillButton>
          {CATEGORY_OPTIONS.map((c) => (
            <PillButton key={c} active={filters.category === c} onClick={() => set("category", c)}>
              {c}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Row 3 — More Filters (collapsible) */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            More Filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={filters.sex} onValueChange={(v) => set("sex", v)}>
              <SelectTrigger className="w-[140px] shrink-0">
                <SelectValue placeholder="Sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sexes</SelectItem>
                <SelectItem value="Colt">Colt</SelectItem>
                <SelectItem value="Filly">Filly</SelectItem>
                <SelectItem value="Gelding">Gelding</SelectItem>
                <SelectItem value="Mare">Mare</SelectItem>
                <SelectItem value="Stallion">Stallion</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Min £"
              value={filters.priceMin}
              onChange={(e) => set("priceMin", e.target.value)}
              className="w-[110px] shrink-0"
            />
            <Input
              type="number"
              placeholder="Max £"
              value={filters.priceMax}
              onChange={(e) => set("priceMax", e.target.value)}
              className="w-[110px] shrink-0"
            />

            <div className="flex gap-1 shrink-0">
              {(["all", "active", "sold"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filters.status === s ? "premium" : "outline"}
                  onClick={() => set("status", s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, sire or dam..."
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
          {filters.countries.map((c) => (
            <Badge
              key={c}
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => toggleCountry(c)}
            >
              {c} <X className="w-3 h-3" />
            </Badge>
          ))}
          {filters.category !== "all" && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => set("category", "all")}
            >
              {filters.category} <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.sex !== "all" && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => set("sex", "all")}
            >
              {filters.sex} <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.priceMin && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => set("priceMin", "")}
            >
              Min £{filters.priceMin} <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.priceMax && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => set("priceMax", "")}
            >
              Max £{filters.priceMax} <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.status !== "active" && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50 capitalize"
              onClick={() => set("status", "active")}
            >
              {filters.status} <X className="w-3 h-3" />
            </Badge>
          )}
          {filters.search && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer hover:border-destructive/50"
              onClick={() => set("search", "")}
            >
              "{filters.search}" <X className="w-3 h-3" />
            </Badge>
          )}
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;