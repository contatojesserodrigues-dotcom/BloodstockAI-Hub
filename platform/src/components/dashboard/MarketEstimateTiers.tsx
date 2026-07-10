import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type MarketTierKey = "basic" | "median" | "maximum";
export type MarketConfidence = "high" | "medium" | "low" | "insufficient";

export interface MarketTier {
  label: string;
  scenario: string;
  range: string;
}

export interface MarketTiersData {
  basic: MarketTier;
  median: MarketTier;
  maximum: MarketTier;
  confidence: MarketConfidence;
  confidence_note?: string;
}

const TIER_STYLES: Record<MarketTierKey, { bg: string; border: string }> = {
  basic:   { bg: "bg-[#2D6A4F]", border: "border-[#2D6A4F]" },
  median:  { bg: "bg-[#101A39]", border: "border-[#101A39]" },
  maximum: { bg: "bg-[#C9A84C]", border: "border-[#C9A84C]" },
};

const CONFIDENCE_DOT: Record<MarketConfidence, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
  insufficient: "bg-muted-foreground",
};

const CONFIDENCE_LABEL: Record<MarketConfidence, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  insufficient: "INSUFFICIENT DATA",
};

function Bar({ tier, kind }: { tier: MarketTier; kind: MarketTierKey }) {
  const s = TIER_STYLES[kind];
  return (
    <div
      className={`${s.bg} text-white rounded-md px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 shadow-sm w-full min-w-0 overflow-hidden`}
    >
      <div className="min-w-0 flex-1 w-full">
        <div className="text-[10px] sm:text-xs font-bold tracking-[0.18em] uppercase break-words">
          {tier.label}
        </div>
        <div className="text-[10px] sm:text-xs text-white/85 leading-snug mt-0.5 break-words [overflow-wrap:anywhere]">
          {tier.scenario}
        </div>
      </div>
      <div className="text-xs sm:text-base font-bold break-words [overflow-wrap:anywhere] text-left sm:text-right max-w-full sm:max-w-[45%] self-start sm:self-auto">
        {tier.range}
      </div>
    </div>
  );
}

export function MarketEstimateTiers({ data }: { data: MarketTiersData }) {
  return (
    <div className="space-y-2 w-full min-w-0 overflow-hidden">
      <Bar tier={data.basic} kind="basic" />
      <Bar tier={data.median} kind="median" />
      <Bar tier={data.maximum} kind="maximum" />
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] sm:text-xs text-muted-foreground min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full ${CONFIDENCE_DOT[data.confidence]}`} />
        <span className="font-medium text-foreground break-words">Confidence: {CONFIDENCE_LABEL[data.confidence]}</span>
        {(data.confidence === "low" || data.confidence === "insufficient") && data.confidence_note && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground" aria-label="Confidence detail">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {data.confidence_note}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

export default MarketEstimateTiers;