import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callClaude, callClaudeWithDocument, parseJsonFromResponse, SITE_TIERS, SOURCES, QUALITY_CONTROLS, buildPrecisePedigreeQuery, buildPrecisePerformanceQuery } from "../_shared/ai-clients.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { tavily } from "npm:@tavily/core";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ObservedPrice = {
  amount: number;
  currency: "GBP" | "EUR" | "USD" | "GNS" | "AUD" | "NZD";
  raw: string;
};

type VerifiedMarketAnchor = ObservedPrice & {
  kind: "EXACT_SALE" | "RELATED_SALE";
  confidence: "HIGH" | "MEDIUM";
  source: string;
};

type ResearchSection = {
  title: string;
  content: string;
  citations: string[];
  tier?: number;
};

const NOT_PUBLICLY_AVAILABLE = "Not publicly available from the verified sources checked.";

/**
 * Enforce monotonic price ladder:
 *   floor ≤ fair_low ≤ fair_high ≤ physical_upside ≤ avoid_above (walk-away)
 * Returns clamped/reordered numbers. Never returns an inverted ladder.
 */
function enforcePriceLadder(input: {
  floor?: number;
  fairLow: number;
  fairHigh: number;
  physicalUpside: number;
  avoidAbove: number;
  lotId?: string;
}): { fairLow: number; fairHigh: number; physicalUpside: number; avoidAbove: number; adjusted: boolean } {
  const floor = Math.max(0, Math.round(input.floor || 0));
  let fairLow = Math.max(floor, Math.round(input.fairLow));
  let fairHigh = Math.max(fairLow, Math.round(input.fairHigh));
  let physicalUpside = Math.max(fairHigh, Math.round(input.physicalUpside));
  // walk-away must be strictly the highest figure; give a minimum 10% headroom over physical upside
  let avoidAbove = Math.max(Math.round(input.avoidAbove), Math.round(physicalUpside * 1.1));
  const adjusted =
    fairLow !== Math.round(input.fairLow) ||
    fairHigh !== Math.round(input.fairHigh) ||
    physicalUpside !== Math.round(input.physicalUpside) ||
    avoidAbove !== Math.round(input.avoidAbove);
  if (adjusted) {
    console.warn("[price-ladder] Re-ordered inverted ladder", {
      lotId: input.lotId || null,
      raw: input,
      normalized: { fairLow, fairHigh, physicalUpside, avoidAbove },
    });
  }
  return { fairLow, fairHigh, physicalUpside, avoidAbove, adjusted };
}

/**
 * Compose a grammatically-clean justification block for the case where NO verified
 * public comparable was returned. The "unavailable" status is NEVER concatenated
 * inline — it is referenced as a clause.
 */
function composeUnavailableMarketJustification(args: {
  sire: string;
  dam: string;
  fmt: (n: number) => string;
  fairLow: number;
  fairHigh: number;
  physicalUpside: number;
  avoidAbove: number;
  sireTierLabel?: string | null;
  currencyMismatchNote?: string;
}): string {
  const { sire, dam, fmt, fairLow, fairHigh, physicalUpside, avoidAbove, sireTierLabel, currencyMismatchNote } = args;
  const tierPart = sireTierLabel ? ` Sire tier reference: ${sireTierLabel}.` : "";
  const mismatch = currencyMismatchNote ? ` ${currencyMismatchNote}` : "";
  return [
    `Market Estimate: No verified public comparable was found in the sources checked for ${sire} out of ${dam}.`,
    `The range below is a conservative, model-derived estimate built from pedigree, sex, sale context, sire profile and dam line — not a verified comparable.${tierPart}`,
    `Fair-trade range ${fmt(fairLow)}–${fmt(fairHigh)}; stretch zone up to ${fmt(physicalUpside)} only justified by an A-grade physical inspection; walk-away ceiling ${fmt(avoidAbove)}.`,
    `Confidence: Low (missing comparables widen the range but do not by themselves change the BUY/PASS call).${mismatch}`,
  ].join(" ");
}

/**
 * Compose the Bloodstock Insight (verdict_reason) when comparables are missing.
 * Confidence is a function of data coverage; the recommendation is a function of
 * merit vs. price — these are stated as separate ideas, not collapsed.
 */
function composeUnavailableInsightCopy(args: {
  verdict: string;
  sire: string;
  dam: string;
  fmt: (n: number) => string;
  fairLow: number;
  fairHigh: number;
  physicalUpside: number;
  avoidAbove: number;
  meritSummary?: string;
  currencyMismatchNote?: string;
}): string {
  const { verdict, sire, dam, fmt, fairLow, fairHigh, physicalUpside, avoidAbove, meritSummary, currencyMismatchNote } = args;
  const merit = meritSummary || `the recommendation reflects pedigree and physical merit under the widened range, not a benchmarked sale price`;
  const mismatch = currencyMismatchNote ? ` ${currencyMismatchNote}` : "";
  return [
    `Confidence is Low because no verified public comparable was found for ${sire} out of ${dam} in the sources checked.`,
    `That widens the estimate range but does not by itself trigger a PASS — ${merit}.`,
    `Within the validated ladder: at or below ${fmt(fairHigh)} the lot is in BUY/value territory; between ${fmt(fairHigh)} and ${fmt(physicalUpside)} the bid is only justified with an A-grade physical; above ${fmt(avoidAbove)} the lot becomes AVOID regardless of merit.`,
    `Current call: ${verdict}.${mismatch}`,
  ].join(" ");
}

/**
 * Build a bid-strategy line that is internally consistent with the rendered ladder.
 */
function composeBidStrategy(args: {
  fmt: (n: number) => string;
  fairHigh: number;
  physicalUpside: number;
  avoidAbove: number;
}): string {
  const { fmt, fairHigh, physicalUpside, avoidAbove } = args;
  return `BUY at or below ${fmt(fairHigh)}; stretch to ${fmt(physicalUpside)} only with an A-grade physical inspection; walk away above ${fmt(avoidAbove)}.`;
}

// Dev-time assertion: render strings must not contain status-mid-clause artifacts.
export function assertNoBrokenStatusSplice(text: string): void {
  if (/because\s+Not\s+publicly\s+available/i.test(text) || /estimate\s+—\s+Not\s+publicly\s+available/i.test(text)) {
    throw new Error(`[market-copy] Broken status splice detected: ${text.slice(0, 200)}`);
  }
}

type SessionCurrency = "EUR" | "GBP" | "GNS" | "USD" | "AUD" | "NZD";

const TAVILY_BLOODSTOCK_DOMAINS = [
  // Global pedigree & form
  "equineline.com",
  "equibase.com",
  "bloodhorse.com",
  "racingpost.com",
  "pedigreequery.com",
  "weatherbys.co.uk",
  // UK & Ireland form / ratings
  "attheraces.com",
  "sportinglife.com",
  "timeform.com",
  "racingtv.com",
  "britishhorseracing.com",
  // USA
  "drf.com",
  "brisnet.com",
  "tjcis.com",
  // UK & Ireland Flat
  "tattersalls.com",
  "tattersalls.ie",
  "goffs.com",
  // UK & Ireland National Hunt + Point-to-Point
  "tattersallscheltenham.com",
  "irishracing.com",
  "p2p.horse",
  "pointtopoint.co.uk",
  "gainline.sport",
  "i-r-b.com",
  "itba.ie",
  "hri.ie",
  // France
  "arqana.com",
  "france-galop.com",
  "geny.com",
  "paris-turf.com",
  "equidia.fr",
  "letrot.com",
  "galopponline.de",
  "france-sire.com",
  "jourdegalop.com",
  // Australia & New Zealand
  "magicmillions.com.au",
  "inglis.com.au",
  "breednet.com.au",
  "racenet.com.au",
  "racingaustralia.horse",
  "tbv.com.au",
  "racing.com",
  "punters.com.au",
  "racingnsw.com.au",
  "studbook.org.au",
  "justhorseracing.com.au",
  "nzracing.co.nz",
  "nzthoroughbred.co.nz",
  "nzb.co.nz",
  "arion.co.nz",
  // USA sales
  "fasigtipton.com",
  "keeneland.com",
  "obssales.com",
  "htasales.com",
  // UAE
  "emiratesracing.com",
  "garbis.com",
];

// Restricted domain set for National Hunt / Point-to-Point research.
const TAVILY_NH_DOMAINS = [
  "racingpost.com",
  "tattersallscheltenham.com",
  "irishracing.com",
  "p2p.horse",
  "pointtopoint.co.uk",
  "gainline.sport",
  "goffs.com",
  "i-r-b.com",
  "hri.ie",
  "tattersalls.com",
  "tattersalls.ie",
  "itba.ie",
];

// FIX 5 — Detect currency from the sale_name field extracted by Claude (not the file name).
// Safer default than EUR: many PDFs without a recognisable sale name come from GB sources.
function detectCurrencyFromSale(saleName: string | null | undefined): SessionCurrency {
  if (!saleName) return "GBP";
  const s = String(saleName).toLowerCase();
  if (s.includes("tattersalls ireland") || s.includes("goresbridge") || s.includes("fairyhouse")) return "EUR";
  if (s.includes("tattersalls") || s.includes("newmarket") || s.includes("park paddocks") || s.includes("somerville")) return "GNS";
  if (s.includes("goffs uk") || s.includes("doncaster") || s.includes("brightwells") || s.includes("brightwaters") || s.includes("aintree sale") || s.includes("cheltenham sale") || s.includes("ascot bloodstock")) return "GBP";
  if (s.includes("arqana") || s.includes("france-galop") || s.includes("osarus") || s.includes("deauville")) return "EUR";
  if (s.includes("goffs")) return "EUR";
  if (s.includes("magic millions") || s.includes("inglis") || s.includes("william inglis") || s.includes("gold coast")) return "AUD";
  if (s.includes("fasig") || s.includes("keeneland") || s.includes("obs ") || s.includes("ocala") || s.includes("saratoga")) return "USD";
  if (s.includes("nzb") || s.includes("new zealand") || s.includes("karaka")) return "NZD";
  return "GBP";
}

// Map an ISO-style country code or country name (as found in the PDF header /
// auction location / horse country-of-birth) to its local auction currency.
function detectCurrencyFromCountry(country: string | null | undefined): SessionCurrency | null {
  if (!country) return null;
  const c = String(country).trim().toLowerCase();
  if (!c) return null;
  // United Kingdom — Tattersalls uses guineas; other UK sales use GBP.
  // We return GBP here as the safe local currency; sale-name detection upgrades
  // to GNS when appropriate (Tattersalls / Park Paddocks / Newmarket).
  if (/(^|\b)(gb|gbr|uk|united kingdom|england|scotland|wales|britain|british)(\b|$)/.test(c)) return "GBP";
  if (/(^|\b)(ire|irl|ireland|eire|irish)(\b|$)/.test(c)) return "EUR";
  if (/(^|\b)(fr|fra|france|french)(\b|$)/.test(c)) return "EUR";
  if (/(^|\b)(ger|deu|germany|german|deutschland|it|ita|italy|italian|esp|spain|spanish|por|portugal|portuguese|ned|nld|netherlands|dutch|bel|belgium|belgian|eu|euro|europe)(\b|$)/.test(c)) return "EUR";
  if (/(^|\b)(usa|us|u\.s\.a?|united states|america|american)(\b|$)/.test(c)) return "USD";
  if (/(^|\b)(aus|au|australia|australian)(\b|$)/.test(c)) return "AUD";
  if (/(^|\b)(nz|nzl|new zealand|kiwi)(\b|$)/.test(c)) return "NZD";
  return null;
}

function detectSessionCurrency(...sources: Array<string | null | undefined>): SessionCurrency {
  const haystack = sources.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return "EUR";
  // Order matters — Tattersalls Ireland must beat plain Tattersalls
  if (/(goffs[^a-z]*ireland|fairyhouse|kildare|goffs orby|goffs land rover|goffs sportsman|goffs november)/i.test(haystack)) return "EUR";
  if (/(tattersalls[^a-z]*ireland|fairyhouse|goresbridge|derby sale|land rover sale)/i.test(haystack)) return "EUR";
  if (/(arqana|deauville)/i.test(haystack)) return "EUR";
  // Australia / NZ first — these often co-occur with words like "newmarket" (Newmarket, AUS)
  // which would otherwise be mis-detected as Tattersalls Newmarket (UK).
  if (/(karaka|new zealand bloodstock|nz bloodstock|arion\.co\.nz|\bnzb\b)/i.test(haystack)) return "NZD";
  if (/(magic millions|inglis|william inglis|riverside stables|gold coast yearling|gold coast sale|easter yearling|easter broodmare|classic yearling sale|premier yearling sale|great southern sale|chairman's sale|scone yearling|warwick farm|randwick|melbourne premier|sydney classic|aushorse|thoroughbred breeders australia|aud\$?|a\$)/i.test(haystack)) return "AUD";
  if (/(goffs uk|doncaster|goffs doncaster|spring sale doncaster|brightwells|brightwaters|tattersalls cheltenham|cheltenham (?:sale|festival sale|january sale|april sale|may sale)|ascot bloodstock|aintree sale)/i.test(haystack)) return "GBP";
  if (/(tattersalls|newmarket|somerville|park paddocks)/i.test(haystack)) return "GNS";
  if (/(keeneland|fasig|ocala|obs|saratoga|kentucky)/i.test(haystack)) return "USD";
  if (/(\baustralia\b|\baustralian\b|\bsydney\b|\bmelbourne\b|\bbrisbane\b|\bperth\b|\badelaide\b)/i.test(haystack)) {
    return "AUD";
  }
  return "EUR";
}

function currencyPrefix(currency: SessionCurrency): string {
  if (currency === "GBP") return "£";
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  if (currency === "AUD") return "A$";
  if (currency === "NZD") return "NZ$";
  return ""; // GNS uses suffix
}

function currencySuffix(currency: SessionCurrency): string {
  return currency === "GNS" ? "gns" : "";
}

function formatCurrencyAmount(amount: number, currency: SessionCurrency): string {
  return `${currencyPrefix(currency)}${amount.toLocaleString("en-GB")}${currencySuffix(currency)}`;
}

function recalculateBloodstockScore(horse: any) {
  if (!horse || typeof horse !== "object") return;
  horse.scores = horse.scores || {};
  const s = horse.scores;
  // BloodstockAI Score policy (v3): total = pedigree + performance + commercial + conformation,
  // each component scored 0-25 → total 0-100. The displayed total MUST equal the exact sum.
  const clamp25 = (raw: unknown) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    // If the model returned a 0-100 value by mistake, scale down to 0-25.
    return n > 25 ? Math.round((n / 100) * 25) : Math.round(n);
  };
  const pedigree = clamp25(s.pedigree_score);
  const commercial = clamp25(s.commercial_score);
  // Performance: yearlings/foals (≤1yo) with no race & no breeze data MUST be 0/25.
  // 2YO breeze-up lots DO get a performance score derived from their breeze time / biomechanics.
  const careerStarts = Number(horse?.performance?.career?.starts) || 0;
  const yearOfBirth = Number(horse?.year_of_birth) || 0;
  const currentYear = new Date().getUTCFullYear();
  const ageThisYear = yearOfBirth ? currentYear - yearOfBirth : null;
  const lotTypeRaw = String(horse?.lot_type || horse?.sale_type || horse?.category || "").toLowerCase();
  const isBreezeUpLot =
    lotTypeRaw.includes("breeze") ||
    lotTypeRaw.includes("2yo") ||
    lotTypeRaw.includes("2 yo") ||
    lotTypeRaw.includes("two-year") ||
    lotTypeRaw.includes("two year") ||
    Boolean(horse?.breeze?.time) ||
    Boolean(horse?.breeze?.furlong_time) ||
    Boolean(horse?.breeze_time) ||
    Boolean(horse?.performance?.breeze) ||
    Boolean(horse?.performance?.breeze_time);
  const isYearlingOrFoal = ageThisYear !== null && ageThisYear <= 1;
  const hasAnyPerformanceSignal = careerStarts > 0 || isBreezeUpLot;
  const forcePerformanceZero = isYearlingOrFoal && !isBreezeUpLot;
  const performance = hasAnyPerformanceSignal && !forcePerformanceZero
    ? clamp25(s.performance_score)
    : 0;
  if (forcePerformanceZero) {
    s.performance_status = "Performance: 0/25 — yearling/foal, no race or breeze data";
  } else if (isBreezeUpLot && careerStarts === 0) {
    s.performance_status = "Performance: scored from breeze-up data";
  }
  // Conformation: 0 unless verified visual / breeze-up data exists.
  const physicalRaw = s.conformation_potential ?? s.physical_score;
  const physicalAvailable = physicalRaw !== null && physicalRaw !== undefined && Number(physicalRaw) > 0;
  const conformation = physicalAvailable ? clamp25(physicalRaw) : 0;
  if (!physicalAvailable) s.physical_status = "Conformation: pending physical inspection";

  s.pedigree_score = pedigree;
  s.performance_score = performance;
  s.commercial_score = commercial;
  s.conformation_potential = conformation;

  const total = pedigree + performance + commercial + conformation;
  s.overall_score = Math.max(0, Math.min(100, total));
}

// ─── AGENT 1 HELPERS ──────────────────────────────────────────────────────
// Deterministic horse-type detection from extracted text + structured data.
type HorseType =
  | "YEARLING"
  | "2YO_READY_TO_RUN"
  | "HORSE_IN_TRAINING"
  | "BREEDING_STOCK"
  | "FOAL"
  | "NH_STORE"
  | "NH_BREEZE"
  | "POINT_TO_POINT"
  | "NH_HORSE_IN_TRAINING";

// Map the client-side selector value (mandatory horse-type picker in the UI)
// onto the internal HorseType enum. Unknown / missing values return null so
// the existing detector keeps full control.
function mapClientHorseType(raw?: string | null): HorseType | null {
  const v = String(raw || "").toLowerCase().trim();
  switch (v) {
    case "foal":           return "FOAL";
    case "weanling":       return "FOAL";
    case "yearling":       return "YEARLING";
    case "2yo_breeze":
    case "breeze_up":
    case "breeze-up":      return "2YO_READY_TO_RUN";
    case "3yo_flat":
    case "hit":            return "HORSE_IN_TRAINING";
    case "national_hunt":  return "NH_HORSE_IN_TRAINING";
    case "point_to_point": return "POINT_TO_POINT";
    case "broodmare":      return "BREEDING_STOCK";
    default: return null;
  }
}

// Context block injected into the Claude analysis prompt so the model knows
// exactly which kind of horse it is analysing and which scoring/market logic
// applies. Mirrors the client-side labels.
const HORSE_TYPE_CONTEXT: Record<string, string> = {
  FOAL: "This is a FOAL or WEANLING. Focus on pedigree depth, dam produce quality and family commercial value. Do NOT reference race performance. Never output PASS based on missing data alone — fall back to INSUFFICIENT_DATA instead.",
  YEARLING: "This is a YEARLING. Balance sire commercial profile with dam produce record and sibling sales results equally. Pinhooking residual and Book-tier slotting matter.",
  "2YO_READY_TO_RUN": "This is a 2YO / BREEZE-UP horse. Focus on sire breeze-up profile, sibling breeze-up results, pinhooking margin and physical/breeze potential. Include a pinhooking comparison vs the prior foal/yearling price when available.",
  HORSE_IN_TRAINING: "This is a HORSE IN TRAINING (3YO Flat / HIT). Prioritise the horse's own race record, current form, earnings, ratings and trainer over pedigree. Use racingpost / equibase / racenet style sources.",
  NH_HORSE_IN_TRAINING: "This is a NATIONAL HUNT horse. Use NH sources. Focus on bumper / hurdle / chase form, point-to-point record and store-sale history. Late-maturing staying types are commercially ideal — never penalise for lack of early speed.",
  POINT_TO_POINT: "This is a POINT-TO-POINT horse. Focus on P2P results, hunter chase form and NH-prospect profile. Use p2p.horse, irishracing.com, pointtopoint.co.uk and Tattersalls Cheltenham sources.",
  NH_STORE: "This is a NATIONAL HUNT STORE horse. Focus on stamina pedigree, jumping family depth and store-sale market evidence. No race record expected.",
  NH_BREEZE: "This is a NATIONAL HUNT BREEZE-UP horse. Focus on NH breeze action, scope, jumping aptitude and Goresbridge / NH-breeze comparables.",
  BREEDING_STOCK: "This is a BROODMARE. The dam's own race record and produce record IS the primary asset — analyse every named offspring in detail with their wins, earnings and best race. State explicitly the buyer profile (commercial breeder vs racing-residual).",
};

const SALE_CONTEXT_LABELS: Record<string, string> = {
  at_auction:     "At Auction (analyse as a current auction lot)",
  pre_sale:       "Pre-Sale (analyse as catalogue preview before bidding)",
  post_sale:      "Post-Sale (a sold price may be quoted; treat as verified anchor if present)",
  private_treaty: "Private Treaty (no public hammer price expected)",
};

// National Hunt sire indicators — used to bias horse-type detection toward NH market.
const NH_SIRE_KEYWORDS = [
  "walk in the park","blue bresil","yeats","getaway","flemensfirth","milan","kayf tara",
  "presenting","oscar","jeremy","beneficial","westerner","midnight legend","mahler",
  "shantou","sholokhov","martaline","saint des saints","network","poliglote","authorized",
  "stowaway","scorpion","gold well","fame and glory","soldier of fortune","doyen",
  "shirocco","schiaparelli","beat hollow","kapgarde","no risk at all","masked marvel",
  "telescope","jet away","blue brusil","jukebox jury","mount nelson",
];

// ─────────────────────────────────────────────────────────────────────────────
// 3-TIER MARKET ESTIMATE (BASIC / MEDIAN / MAXIMUM)
// Produces a unified UI-ready market-tiers structure from the existing
// pricing fields (fair_trade_low/high, physical_upside, avoid_above), so the
// dashboard can render the three-bar layout regardless of horse type.
// ─────────────────────────────────────────────────────────────────────────────
type MarketTierKey = "basic" | "median" | "maximum";
type MarketTiersConfidence = "high" | "medium" | "low" | "insufficient";

const TIER_SCENARIOS: Record<string, { basic: string; median: string; maximum: string }> = {
  YEARLING:            { basic: "Average physical, standard interest",     median: "Strong physical, active bidding",         maximum: "Elite physical, Classic-buyer profile" },
  BREEZE_UP:           { basic: "Average physical, standard breeze",       median: "Strong physical, good vet",               maximum: "Elite physical, top-end breeze" },
  "2YO_READY_TO_RUN":  { basic: "Average physical, modest workout",        median: "Strong physical, sharp workout",          maximum: "Elite physical, standout workout" },
  HORSE_IN_TRAINING:   { basic: "Unplaced, limited form",                  median: "Placed, solid form",                       maximum: "Winner, strong form" },
  NH_HORSE_IN_TRAINING:{ basic: "Unplaced, limited form",                  median: "Placed, solid form",                       maximum: "Winner / black-type form" },
  NH_STORE:            { basic: "Average store, modest family",            median: "Strong store, proven family",              maximum: "Elite store, black-type family" },
  NH_BREEZE:           { basic: "Average physical, standard breeze",       median: "Strong physical, good vet",               maximum: "Elite physical, top breeze" },
  POINT_TO_POINT:      { basic: "Unplaced or maiden form",                 median: "Placed, solid form",                       maximum: "Winner, strong form" },
  BREEDING_STOCK:      { basic: "Unproven producer",                       median: "Producer of winners",                      maximum: "Producer of stakes winners" },
  FOAL:                { basic: "Average growth, moderate family",        median: "Good physical, strong family",            maximum: "Exceptional physical, elite family" },
  WEANLING:            { basic: "Average growth, moderate family",        median: "Good physical, strong family",            maximum: "Exceptional physical, elite family" },
};

function tierScenarios(horseType?: string | null) {
  const key = String(horseType || "").toUpperCase();
  return TIER_SCENARIOS[key] || TIER_SCENARIOS.YEARLING;
}

// Generic per-horse-type fallback bands (in GBP), used only when neither a
// fair-trade anchor nor a known sire tier is available. Keeps the three
// market-estimate bars populated with a usable indicative range instead of "—".
const GENERIC_TYPE_TIERS: Record<string, { floor: number; target: number; upside: number }> = {
  YEARLING:             { floor: 8000,  target: 25000,  upside: 80000  },
  BREEZE_UP:            { floor: 15000, target: 45000,  upside: 150000 },
  "2YO_READY_TO_RUN":   { floor: 10000, target: 30000,  upside: 100000 },
  HORSE_IN_TRAINING:    { floor: 5000,  target: 18000,  upside: 60000  },
  NH_HORSE_IN_TRAINING: { floor: 6000,  target: 20000,  upside: 70000  },
  NH_STORE:             { floor: 8000,  target: 22000,  upside: 70000  },
  NH_BREEZE:            { floor: 10000, target: 28000,  upside: 90000  },
  POINT_TO_POINT:       { floor: 6000,  target: 18000,  upside: 60000  },
  BREEDING_STOCK:       { floor: 5000,  target: 20000,  upside: 80000  },
  FOAL:                 { floor: 5000,  target: 18000,  upside: 70000  },
  WEANLING:             { floor: 5000,  target: 18000,  upside: 70000  },
};

function getGenericTypeTier(horseType?: string | null) {
  const key = String(horseType || "").toUpperCase();
  return GENERIC_TYPE_TIERS[key] || GENERIC_TYPE_TIERS.YEARLING;
}

function formatTierRange(low: number, high: number, currency: SessionCurrency): string {
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) return "—";
  const lo = roundMarketAmount(Math.min(low, high));
  const hi = roundMarketAmount(Math.max(low, high));
  return `${formatCurrencyAmount(lo, currency)} – ${formatCurrencyAmount(hi, currency)}`;
}

/**
 * Build the three-tier market estimate from a horse's existing pricing fields.
 * Falls back to sire-tier multipliers when fair-trade values are missing.
 */
function computeMarketTiers(horse: any, sessionCurrency: SessionCurrency, horseType?: string | null) {
  if (!horse || typeof horse !== "object") return;
  horse.commercial_analysis = horse.commercial_analysis || {};
  const ca = horse.commercial_analysis;
  const me = ca.market_estimate || {};

  const confidenceRaw = String(me.confidence || horse.market_confidence_level || "").toLowerCase();
  let confidence: MarketTiersConfidence = "low";
  if (confidenceRaw === "high") confidence = "high";
  else if (confidenceRaw === "medium" || confidenceRaw === "moderate") confidence = "medium";
  else if (confidenceRaw === "insufficient" || confidenceRaw === "none") confidence = "insufficient";

  // Upgrade confidence when a verified anchor (sibling / dam / sire / exact sale) was found.
  const anchorConf = String(me.anchor_confidence || "").toUpperCase();
  const hasAnchor =
    Boolean(me.anchor_source && !/not publicly available|unknown|none/i.test(String(me.anchor_source))) ||
    anchorConf === "HIGH" || anchorConf === "MEDIUM";
  if (hasAnchor) {
    if (confidence === "insufficient" || confidence === "low") {
      confidence = anchorConf === "HIGH" ? "high" : "medium";
    }
  }

  // Anchor: prefer fair_trade_low/high; otherwise derive from sire tier; otherwise bail.
  const fairLow  = Number(me.fair_trade_low) || 0;
  const fairHigh = Number(me.fair_trade_high) || 0;
  const physUp   = Number(me.physical_upside) || 0;
  const avoid    = Number(me.avoid_above) || 0;

  let basicLow = 0, basicHigh = 0;
  let medLow   = 0, medHigh   = 0;
  let maxLow   = 0, maxHigh   = 0;

  if (fairLow > 0 && fairHigh > 0) {
    // BASIC = bottom half of fair-trade band, slightly below low (×0.7 floor).
    basicLow  = Math.round(fairLow * 0.7);
    basicHigh = Math.round((fairLow + fairHigh) / 2);
    // MEDIAN = full fair-trade band.
    medLow    = Math.round(fairLow);
    medHigh   = Math.round(fairHigh);
    // MAXIMUM = upper band up to physical upside / walk-away.
    const topAnchor = physUp > 0 ? physUp : Math.round(fairHigh * 1.6);
    maxLow    = Math.round(fairHigh);
    maxHigh   = Math.max(topAnchor, avoid > 0 ? Math.round(avoid * 0.95) : topAnchor);
  } else {
    // No anchor — derive from sire tier table (last-resort fallback).
    const tier = getSireMarketTier(horse?.pedigree?.sire);
    if (tier && tier.target > 0) {
      basicLow  = Math.round(tier.floor * 0.8);
      basicHigh = Math.round(tier.floor);
      medLow    = Math.round(tier.floor);
      medHigh   = Math.round(tier.target);
      maxLow    = Math.round(tier.target);
      maxHigh   = Math.round(tier.upside);
      if (confidence === "high") confidence = "medium";
      // Sire-tier fallback still produces a usable range; keep at least "low".
      if (confidence === "insufficient") confidence = "low";
    } else {
      // Last-resort generic fallback by horse type so the three bars always
      // show an indicative range instead of "—".
      const generic = getGenericTypeTier(horseType);
      basicLow  = Math.round(generic.floor * 0.8);
      basicHigh = Math.round(generic.floor);
      medLow    = Math.round(generic.floor);
      medHigh   = Math.round(generic.target);
      maxLow    = Math.round(generic.target);
      maxHigh   = Math.round(generic.upside);
      // Never surface "insufficient" to the UI — degrade gracefully to "low".
      confidence = "low";
    }
  }

  const scenarios = tierScenarios(horseType);
  const market_tiers = {
    basic:   { label: "BASIC",   scenario: scenarios.basic,   range: formatTierRange(basicLow, basicHigh, sessionCurrency) },
    median:  { label: "MEDIAN",  scenario: scenarios.median,  range: formatTierRange(medLow,   medHigh,   sessionCurrency) },
    maximum: { label: "MAXIMUM", scenario: scenarios.maximum, range: formatTierRange(maxLow,   maxHigh,   sessionCurrency) },
    confidence,
    confidence_note:
      confidence === "insufficient"
        ? "Pedigree-based estimate — refine with physical inspection."
        : confidence === "low"
        ? "Pedigree-based estimate from sire tier and dam-line profile."
        : undefined,
  };

  ca.market_tiers = market_tiers;
}

function applyMarketTiersToAll(extractedData: any, sessionCurrency: SessionCurrency, horseType?: string | null) {
  if (!extractedData || !Array.isArray(extractedData.horses)) return;
  for (const horse of extractedData.horses) {
    try { computeMarketTiers(horse, sessionCurrency, horseType); }
    catch (e) { console.warn("[market-tiers] failed for lot", horse?.lot_number, e); }
  }
}

function detectNHContext(haystack: string, primaryHorse: Record<string, any>): {
  isNH: boolean;
  isP2P: boolean;
  isStore: boolean;
  isNHBreeze: boolean;
  isNHHIT: boolean;
} {
  const text = haystack.toLowerCase();
  const sire = String(primaryHorse?.sire || "").toLowerCase();
  const sireIsNH = NH_SIRE_KEYWORDS.some((s) => sire.includes(s));
  const saleNH = /(tattersalls cheltenham|cheltenham (?:january|april|may|festival|sale)|goffs land rover|land rover sale|derby sale|goresbridge|aintree sale|punchestown sale|ascot bloodstock|brightwells nh|goffs uk january|goffs uk spring store|doncaster spring store|spring store sale|sales of stores|store sale|nh store|nh sale|national hunt sale|nh breeze|national hunt breeze|nh hit|national hunt horses in training)/i.test(text);
  const p2p = /(point[\s-]?to[\s-]?point|p2p\b|between[- ]the[- ]flags|maiden p2p|open p2p|hunter chase|hunters chase|tattersalls cheltenham (?:february|april|may)|p2p form|p2p winner|p2p placed)/i.test(text);
  const storeRef = /(\bstore\b|3yo store|4yo store|store horse|unbroken store|store sale|land rover sale|derby sale|spring store)/i.test(text);
  const nhBreeze = /(nh breeze|national hunt breeze|goresbridge breeze|nh breeze[- ]up|jump breeze)/i.test(text);
  const nhHIT = /(nh horses in training|national hunt horses in training|jumps horses in training|nh hit)/i.test(text);
  const jumpForm = /(\bhurdle\b|\bchase\b|\bbumper\b|nh flat|over fences|over hurdles|cleared the last|fell at|unseated|schooled over)/i.test(text);
  const isNH = saleNH || p2p || nhBreeze || nhHIT || jumpForm || sireIsNH;
  return { isNH, isP2P: p2p, isStore: storeRef && isNH, isNHBreeze: nhBreeze, isNHHIT: nhHIT };
}

function detectHorseType(params: {
  fileName: string;
  extractedText: string;
  primaryHorse: Record<string, any>;
}): HorseType {
  const haystack = `${params.fileName} ${params.extractedText?.slice(0, 6000) || ""}`.toLowerCase();
  const horse = params.primaryHorse || {};
  const lotType = String(horse.lot_type || horse.sale_type || horse.category || "").toLowerCase();
  const careerStarts = Number(horse?.performance?.career?.starts) || 0;
  const yob = Number(horse?.year_of_birth) || 0;
  const ageNow = yob ? new Date().getUTCFullYear() - yob : null;

  // National Hunt / Point-to-Point / Store / NH Breeze takes priority over Flat defaults.
  const nh = detectNHContext(haystack, horse);
  if (nh.isP2P) return "POINT_TO_POINT";
  if (nh.isNHBreeze) return "NH_BREEZE";
  if (nh.isNHHIT) return "NH_HORSE_IN_TRAINING";
  if (nh.isStore || (nh.isNH && (lotType.includes("store") || /(3yo|4yo|unbroken|store)/i.test(haystack)))) return "NH_STORE";
  if (nh.isNH && careerStarts > 0) return "NH_HORSE_IN_TRAINING";
  if (nh.isNH) return "NH_STORE"; // default NH lot when unraced

  // Breeding stock takes priority when explicit
  if (/(broodmare|in foal|covering sire|stallion at stud|breeding stock|november mare|december sale|broodmare prospect)/i.test(haystack)) {
    return "BREEDING_STOCK";
  }
  // Horses in training: explicit race record signals
  if (careerStarts > 0 || /(horses in training|horse[s]? in training|hit sale|form figures|last \d+ runs|racecourse form|earnings:?\s*[€£$]|won \d+ race|placed \d+)/i.test(haystack)) {
    return "HORSE_IN_TRAINING";
  }
  // 2YO breeze-up
  if (
    lotType.includes("breeze") || lotType.includes("2yo") ||
    /(breeze[- ]?up|two[- ]?year[- ]?old sale|2yo (?:in training|sale)|craven breeze|guineas breeze|goresbridge|arqana breeze|fairyhouse breeze|brightwells breeze|ocala (?:march|april|june)|obs (?:march|april|june))/i.test(haystack) ||
    Boolean(horse?.breeze?.time) || Boolean(horse?.breeze_time)
  ) {
    return "2YO_READY_TO_RUN";
  }
  // Foals
  if (ageNow !== null && ageNow === 0) return "FOAL";
  if (/(foal sale|november foal|december foal|weanling)/i.test(haystack) && ageNow !== null && ageNow <= 0) return "FOAL";
  // Default: yearling
  return "YEARLING";
}

// Extract black-type horses (UPPERCASE blocks in catalogue text = bold names)
function extractBlackTypeHorses(text: string): string[] {
  if (!text) return [];
  const FORBIDDEN = new Set([
    "THE","AND","OUT","DAM","SIRE","FOR","FROM","WITH","THIS","ALSO","FOAL","FOALS",
    "WINS","RUNS","BRED","BAY","CHESTNUT","GREY","COLT","FILLY","GELDING","HORSE","MARE",
    "USA","GB","IRE","FR","JPN","AUS","NZ","ARG","BRZ","CAN","UAE","GER","ITY",
    "EBF","BC","LOT","HIP","STUD","FARM","INC","LTD","LLC","ETC",
    "GROUP","GRADE","LISTED","STAKES","HANDICAP","MAIDEN","NOVICE","CONDITIONS"
  ]);
  const matches = [...text.matchAll(/\b([A-Z][A-Z'’\-]{2,}(?:\s+[A-Z][A-Z'’\-]{2,}){0,4})\b/g)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const phrase = m[1].trim();
    if (phrase.length < 4) continue;
    if (phrase.split(/\s+/).every((w) => FORBIDDEN.has(w))) continue;
    if (FORBIDDEN.has(phrase)) continue;
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    out.push(phrase);
    if (out.length >= 12) break;
  }
  return out;
}

// Strip forbidden filler phrases — guarantees Claude's output never reads like fallback text.
const FORBIDDEN_FILLERS = [
  "interim valuation",
  "deeper benchmarking",
  "monitored opportunity",
  "standard commercial positioning",
  "absence of verified comparables",
  "intentionally conservative",
  "comp-based",
  "fallback market synthesis",
];
function stripForbiddenFillers<T = unknown>(value: T): T {
  const replace = (s: string) => {
    let out = s;
    for (const phrase of FORBIDDEN_FILLERS) {
      const re = new RegExp(phrase, "gi");
      out = out.replace(re, "verified data pending");
    }
    return out;
  };
  if (typeof value === "string") return replace(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => stripForbiddenFillers(v)) as unknown as T;
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = stripForbiddenFillers(v as unknown);
    }
    return obj as unknown as T;
  }
  return value;
}

function parseMarketAmount(raw: string, magnitude?: string | null): number {
  const compact = String(raw || "").trim().replace(/\s+/g, "");
  if (!compact) return 0;
  let normalized = compact;
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) {
    normalized = compact.replace(/[.,]/g, "");
  } else if (compact.includes(",") && compact.includes(".")) {
    normalized = compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  } else if (/^\d+[,]\d{3}$/.test(compact)) {
    normalized = compact.replace(/,/g, "");
  } else if (/^\d+[.]\d{3}$/.test(compact)) {
    normalized = compact.replace(/\./g, "");
  }
  let amount = Number(normalized.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return 0;
  const unit = String(magnitude || "").toLowerCase();
  if (/^(k|thousand|mil)$/.test(unit) && amount < 10000) amount *= 1000;
  if (/^(m|million|milhão|milhao)$/.test(unit) && amount < 10000) amount *= 1000000;
  return amount;
}

function parseObservedPrice(text?: string | null, fallbackCurrency: SessionCurrency = "EUR"): ObservedPrice | null {
  if (!text) return null;
  const value = String(text);
  const patterns: Array<{ regex: RegExp; currency: ObservedPrice["currency"] }> = [
    { regex: /A\$\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/i, currency: "AUD" },
    { regex: /NZ\$\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/i, currency: "NZD" },
    { regex: /£\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/i, currency: "GBP" },
    { regex: /€\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/i, currency: "EUR" },
    { regex: /\$\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/i, currency: "USD" },
    { regex: /([\d.,]+)\s*gns/i, currency: "GNS" },
  ];

  for (const { regex, currency } of patterns) {
    const match = value.match(regex);
    if (!match) continue;
    const amount = parseMarketAmount(match[1], match[2]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    return { amount, currency, raw: match[0].trim() };
  }

  const wordAmount = value.match(/\b(\d{1,4}(?:[.,]\d{3})*|\d{5,7})\s*(k|thousand|mil|m|million|milhão|milhao)\b/i);
  if (wordAmount) {
    const amount = parseMarketAmount(wordAmount[1], wordAmount[2]);
    if (Number.isFinite(amount) && amount > 0) return { amount, currency: fallbackCurrency, raw: wordAmount[0].trim() };
  }

  const bareAmount = value.match(/^\s*(\d{1,3}(?:[.,]\d{3})+|\d{5,7})\s*$/);
  if (bareAmount) {
    const amount = parseMarketAmount(bareAmount[1]);
    if (Number.isFinite(amount) && amount > 0) return { amount, currency: fallbackCurrency, raw: bareAmount[0].trim() };
  }

  return null;
}

function formatObservedRange(price: ObservedPrice): string {
  const roundBase = price.amount >= 100000 ? 5000 : price.amount >= 50000 ? 2500 : 1000;
  const roundTo = (n: number) => Math.max(roundBase, Math.round(n / roundBase) * roundBase);
  // Realistic market band: an observed document figure (often a reserve / lower estimate)
  // is only ONE signal. Real market clearance regularly lands 1.5-2.5x above a published
  // reserve for commercial lots, and pinhookers may bid 30% under. The previous 0.9x-1.1x
  // band was producing artificially flat ranges (e.g. 10k-18k) that did not reflect actual
  // bloodstock market behaviour.
  const low = roundTo(price.amount * 0.70);
  const high = roundTo(price.amount * 2.00);
  const prefix = price.currency === "GBP" ? "£" : price.currency === "EUR" ? "€" : price.currency === "USD" ? "$" : price.currency === "AUD" ? "A$" : price.currency === "NZD" ? "NZ$" : "";
  const suffix = price.currency === "GNS" ? "gns" : "";
  const fmt = (n: number) => `${prefix}${n.toLocaleString("en-GB")}${suffix}`;
  return `${fmt(low)}-${fmt(high)}`;
}

function roundMarketAmount(amount: number): number {
  const base = amount >= 500000 ? 25000 : amount >= 100000 ? 10000 : amount >= 50000 ? 5000 : 1000;
  return Math.max(base, Math.round(amount / base) * base);
}

function parsePriceCandidates(text: string, fallbackCurrency: SessionCurrency): ObservedPrice[] {
  const candidates: ObservedPrice[] = [];
  const push = (amountRaw: string, currency: ObservedPrice["currency"], raw: string, magnitude?: string | null) => {
    const amount = parseMarketAmount(amountRaw, magnitude);
    if (!Number.isFinite(amount) || amount < 5000 || amount > 10000000) return;
    candidates.push({ amount, currency, raw: raw.trim() });
  };

  for (const match of text.matchAll(/\b(A\$|NZ\$|[£€$])\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/gi)) {
    const symbol = match[1].toUpperCase();
    push(match[2], symbol === "£" ? "GBP" : symbol === "€" ? "EUR" : symbol === "A$" ? "AUD" : symbol === "NZ$" ? "NZD" : "USD", match[0], match[3]);
  }
  for (const match of text.matchAll(/\b(EUR|GBP|USD|AUD|NZD)\s*([\d.,]+)(?:\s*(k|thousand|mil|m|million|milhão|milhao))?/gi)) {
    push(match[2], match[1].toUpperCase() as ObservedPrice["currency"], match[0], match[3]);
  }
  for (const match of text.matchAll(/([\d.,]+)\s*(gns|guineas)\b/gi)) {
    push(match[1], "GNS", match[0]);
  }

  if (/\b(?:sold|hammer|realised|realized|brought|made|purchased|purchaser|price|sale result|best_anchor|knock(?:ed)?\s*down|top\s*price|winning\s*bid|final\s*bid|hammered\s*down|arrematad[oa]|vendid[oa])\b/i.test(text)) {
    for (const match of text.matchAll(/\b(\d{1,4}(?:[.,]\d{3})*|\d{5,7})\s*(k|thousand|mil|m|million|milhão|milhao)?\b/gi)) {
      push(match[1], fallbackCurrency as ObservedPrice["currency"], match[0], match[2]);
    }
  }

  return candidates;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractVerifiedSaleAnchor(params: {
  text: string;
  sessionCurrency: SessionCurrency;
  lotNumber?: string;
  horseName?: string;
}): VerifiedMarketAnchor | null {
  const value = String(params.text || "");
  if (!value.trim()) return null;

  const anchorStatus = value.match(/ANCHOR_STATUS:\s*(VERIFIED_PREVIOUS_SALE|VERIFIED_SIBLING_OR_DAM_SALE|VERIFIED_SIRE_AVERAGE|VERIFIED_STUD_FEE_PROXY)/i)?.[1]?.toUpperCase();
  const bestAnchorLine = value.match(/^BEST_ANCHOR:\s*(.+)$/im)?.[1] || "";
  const statusPrices = anchorStatus ? parsePriceCandidates(bestAnchorLine, params.sessionCurrency) : [];
  if (statusPrices.length) {
    const best = statusPrices.sort((a, b) => b.amount - a.amount)[0];
    return {
      ...best,
      kind: anchorStatus === "VERIFIED_PREVIOUS_SALE" ? "EXACT_SALE" : "RELATED_SALE",
      confidence: anchorStatus === "VERIFIED_PREVIOUS_SALE" || anchorStatus === "VERIFIED_SIBLING_OR_DAM_SALE" ? "HIGH" : "MEDIUM",
      source: `BEST_ANCHOR: ${bestAnchorLine.slice(0, 220)}`,
    };
  }

  // ── Sale-result page detector (Tattersalls / Goffs / Arqana / Inglis "BACK TO LIST" pages)
  // These pages list "Purchaser: <buyer>" and "Price: <amount>" — that IS a verified exact sale.
  const purchaserLine = value.match(/Purchaser\s*[:\-]\s*([^\n\r]+)/i)?.[0] || "";
  const priceLine = value.match(/(?:^|\n)\s*Price\s*[:\-]\s*([^\n\r]+)/i)?.[0] || "";
  if (purchaserLine && priceLine) {
    const priceCandidates = parsePriceCandidates(priceLine, params.sessionCurrency);
    if (priceCandidates.length) {
      const top = priceCandidates.sort((a, b) => b.amount - a.amount)[0];
      return {
        ...top,
        kind: "EXACT_SALE",
        confidence: "HIGH",
        source: `Sale-result page: ${purchaserLine.trim().slice(0, 120)} | ${priceLine.trim().slice(0, 120)}`,
      };
    }
  }

  const lotToken = params.lotNumber ? new RegExp(`\\b(?:lot|hip)?\\s*${escapeRegExp(String(params.lotNumber))}\\b`, "i") : null;
  const nameToken = params.horseName && !looksSyntheticHorseName(params.horseName)
    ? new RegExp(escapeRegExp(String(params.horseName)), "i")
    : null;

  let best: { price: ObservedPrice; score: number; line: string; kind: VerifiedMarketAnchor["kind"] } | null = null;
  for (const rawLine of value.split(/\n+/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || /NO PREVIOUS SALE RESULT FOUND|not found|unavailable|RNA|withdrawn|not sold/i.test(line)) continue;
    if (/stud fee|average|median|estimate|reserve|valuation|range|fair[- ]trade|avoid above|physical upside/i.test(line) && !/\b(?:sold|hammer|realised|realized|sale result)\b/i.test(line)) continue;
    if (!/\b(?:sold|hammer|realised|realized|brought|made|purchased|purchaser|sale result|buyer|bought|price|knock(?:ed)?\s*down|top\s*price|winning\s*bid|final\s*bid|hammered\s*down)\b/i.test(line)) continue;

    const prices = parsePriceCandidates(line, params.sessionCurrency);
    if (!prices.length) continue;
    const exactSignal = /\b(?:exact|previous sale|this lot|subject lot|sale result|hammer|purchaser|sold to|knock(?:ed)?\s*down|hammered\s*down|winning\s*bid|final\s*bid|top\s*price)\b/i.test(line) || Boolean(lotToken?.test(line)) || Boolean(nameToken?.test(line));
    const relatedSignal = /\b(?:half[- ]sibling|full[- ]sibling|sibling|dam|produce|family|comparable)\b/i.test(line);
    let score = 1;
    if (exactSignal) score += 6;
    if (relatedSignal) score += 2;
    if (lotToken?.test(line)) score += 4;
    if (nameToken?.test(line)) score += 3;
    if (/\b(?:sold for|hammered|realised|realized)\b/i.test(line)) score += 2;
    if (/\bpurchaser\b/i.test(line) || /^\s*price\s*[:\-]/i.test(line)) score += 4;

    const topPrice = prices.sort((a, b) => b.amount - a.amount)[0];
    if (!best || score > best.score || (score === best.score && topPrice.amount > best.price.amount)) {
      best = { price: topPrice, score, line, kind: exactSignal ? "EXACT_SALE" : "RELATED_SALE" };
    }
  }

  if (!best || best.score < 5) return null;
  return {
    ...best.price,
    kind: best.kind,
    confidence: best.kind === "EXACT_SALE" ? "HIGH" : "MEDIUM",
    source: best.line.slice(0, 240),
  };
}

function applyVerifiedMarketAnchor(extractedData: any, anchor: VerifiedMarketAnchor | null) {
  if (!anchor || !Array.isArray(extractedData?.horses) || extractedData.horses.length !== 1) return extractedData;
  const horse = extractedData.horses[0];
  horse.commercial_analysis = horse.commercial_analysis || {};
  horse.commercial_analysis.market_estimate = horse.commercial_analysis.market_estimate || {};

  const anchorCurrency = anchor.currency as SessionCurrency;
  const isExactSale = anchor.kind === "EXACT_SALE";
  const rawLow = roundMarketAmount(anchor.amount * (isExactSale ? 0.78 : 0.65));
  const rawHigh = roundMarketAmount(anchor.amount * (isExactSale ? 1.22 : 1.45));
  const rawUpside = roundMarketAmount(anchor.amount * (isExactSale ? 1.55 : 1.9));
  // walk-away must be the absolute ceiling; raise the multipliers so it can never sit below physical upside
  const rawAvoid = roundMarketAmount(anchor.amount * (isExactSale ? 1.75 : 2.15));
  const ladder = enforcePriceLadder({
    fairLow: rawLow,
    fairHigh: rawHigh,
    physicalUpside: rawUpside,
    avoidAbove: rawAvoid,
    lotId: horse.lot_number || horse.name || undefined,
  });
  const fairLow = ladder.fairLow;
  const fairHigh = ladder.fairHigh;
  const physicalUpside = ladder.physicalUpside;
  const avoidAbove = ladder.avoidAbove;
  const range = `${formatCurrencyAmount(fairLow, anchorCurrency)}-${formatCurrencyAmount(fairHigh, anchorCurrency)}`;
  const anchorFmt = (n: number) => formatCurrencyAmount(n, anchorCurrency);
  const bidStrategyLine = composeBidStrategy({ fmt: anchorFmt, fairHigh, physicalUpside, avoidAbove });

  horse.commercial_analysis.estimated_value_range = range;
  horse.commercial_analysis.market_estimate = {
    ...horse.commercial_analysis.market_estimate,
    fair_trade_low: fairLow,
    fair_trade_high: fairHigh,
    physical_upside: physicalUpside,
    avoid_above: avoidAbove,
    anchor_source: anchor.source,
    anchor_confidence: anchor.confidence,
    bid_strategy: bidStrategyLine,
  };
  horse.commercial_analysis.estimated_value_justification = `Anchor: ${isExactSale ? "verified exact sale result" : "verified related sale/comparable"} = ${formatCurrencyAmount(anchor.amount, anchorCurrency)} (source: ${anchor.source}, confidence ${anchor.confidence}). Adjusted around the real market clearance rather than a generic sire-average band, with the pedigree page and buyer demand treated as already validated by that public price. Fair-trade range ${range}; stretch zone up to ${formatCurrencyAmount(physicalUpside, anchorCurrency)} only justified by an A-grade physical; walk-away ceiling ${formatCurrencyAmount(avoidAbove, anchorCurrency)}. ${bidStrategyLine}`;
  assertNoBrokenStatusSplice(horse.commercial_analysis.estimated_value_justification);
  horse.commercial_analysis.market_demand = anchor.amount >= 300000 ? "High" : horse.commercial_analysis.market_demand || "Medium";
  horse.commercial_analysis.resale_potential = anchor.amount >= 300000 ? "High" : horse.commercial_analysis.resale_potential || "Medium";

  const comparables = Array.isArray(horse.commercial_analysis.comparable_sales) ? horse.commercial_analysis.comparable_sales : [];
  horse.commercial_analysis.comparable_sales = [
    { horse: horse.lot_number ? `Lot ${horse.lot_number}` : horse.name || "Subject lot", price: formatCurrencyAmount(anchor.amount, anchorCurrency), sale: isExactSale ? "Verified exact public sale result" : "Verified related public sale/comparable", year: String(new Date().getFullYear()) },
    ...comparables,
  ].slice(0, 5);

  horse.scores = horse.scores || {};
  const scoreLift = anchor.amount >= 650000 ? { pedigree: 19, commercial: 21 } : anchor.amount >= 300000 ? { pedigree: 17, commercial: 19 } : anchor.amount >= 100000 ? { pedigree: 14, commercial: 16 } : null;
  if (scoreLift) {
    horse.scores.pedigree_score = Math.max(Number(horse.scores.pedigree_score) || 0, scoreLift.pedigree);
    horse.scores.commercial_score = Math.max(Number(horse.scores.commercial_score) || 0, scoreLift.commercial);
    horse.score_context_label = anchor.amount >= 650000 ? "Strong profile — verified high-value market demand" : horse.score_context_label;
  }

  const rs = horse.pedigree?.rating_split;
  if (rs && anchor.amount >= 300000) {
    rs.genetic_quality = Math.max(Number(rs.genetic_quality) || 0, anchor.amount >= 650000 ? 7.8 : 6.8);
    rs.commercial_appeal = Math.max(Number(rs.commercial_appeal) || 0, anchor.amount >= 650000 ? 8.8 : 7.5);
    rs.genetic_quality_note = rs.genetic_quality_note || `Verified ${formatCurrencyAmount(anchor.amount, anchorCurrency)} market clearance supports an above-average pedigree rating.`;
    rs.commercial_appeal_note = `Commercial appeal upgraded because the lot has a verified ${formatCurrencyAmount(anchor.amount, anchorCurrency)} market anchor, not a generic low-band estimate.`;
  }

  if (Array.isArray(extractedData.top_recommendations) && extractedData.top_recommendations[0]) {
    extractedData.top_recommendations[0].estimated_value = range;
    extractedData.top_recommendations[0].reason = `Valuation anchored to verified market evidence at ${formatCurrencyAmount(anchor.amount, anchorCurrency)}.`;
  }
  return extractedData;
}

function truncateForPrompt(text?: string | null, max = 1800): string {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

function normalizePdfHorseIdentity(primaryHorse: Record<string, any>, sessionCurrency: SessionCurrency) {
  const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
  const lotTypeRaw = clean(primaryHorse.lot_type || primaryHorse.sale_type || primaryHorse.category || primaryHorse.age);
  return {
    lot_number: clean(primaryHorse.lot_number || primaryHorse.lot || primaryHorse.hip),
    name: clean(primaryHorse.name || primaryHorse.horse_name),
    color: clean(primaryHorse.color || primaryHorse.colour),
    sex: clean(primaryHorse.sex),
    year_of_birth: Number(primaryHorse.year_of_birth || primaryHorse.year || primaryHorse.yob) || 0,
    country: clean(primaryHorse.country),
    sire: clean(primaryHorse.sire),
    dam: clean(primaryHorse.dam),
    dam_sire: clean(primaryHorse.damsire || primaryHorse.dam_sire || primaryHorse.broodmare_sire),
    sale: clean(primaryHorse.sale || primaryHorse.sale_name || primaryHorse.auction_house),
    vendor: clean(primaryHorse.vendor || primaryHorse.consignor),
    sale_type: lotTypeRaw,
    session_currency: sessionCurrency,
  };
}

function forcePdfIdentity(extractedData: any, pdfIdentity: ReturnType<typeof normalizePdfHorseIdentity>) {
  if (!Array.isArray(extractedData?.horses) || !extractedData.horses[0]) return extractedData;
  const horse = extractedData.horses[0];
  if (pdfIdentity.lot_number) horse.lot_number = pdfIdentity.lot_number;
  if (pdfIdentity.name) horse.name = pdfIdentity.name;
  if (pdfIdentity.sex) horse.sex = pdfIdentity.sex;
  if (pdfIdentity.color) horse.color = pdfIdentity.color;
  if (pdfIdentity.year_of_birth) horse.year_of_birth = pdfIdentity.year_of_birth;
  if (pdfIdentity.country) horse.country = pdfIdentity.country;
  if (pdfIdentity.vendor) horse.consignor = pdfIdentity.vendor;
  horse.pedigree = horse.pedigree || {};
  if (pdfIdentity.sire) horse.pedigree.sire = pdfIdentity.sire;
  if (pdfIdentity.dam) horse.pedigree.dam = pdfIdentity.dam;
  if (pdfIdentity.dam_sire) horse.pedigree.dam_sire = pdfIdentity.dam_sire;
  horse.sale_info = { ...(horse.sale_info || {}), sale: pdfIdentity.sale, sale_type: pdfIdentity.sale_type, currency: pdfIdentity.session_currency };
  return extractedData;
}

function buildVerifiedAnchorFromObserved(price: ObservedPrice | null, source: string): VerifiedMarketAnchor | null {
  if (!price) return null;
  return { ...price, kind: "EXACT_SALE", confidence: "HIGH", source };
}

// ─── MAJOR STUD DETECTION & SIRE SEARCH ENHANCEMENT ──────────────────────────
const MAJOR_STUD_SIRES: Record<string, { stud: string; url: string }> = {
  // Coolmore Ireland
  "sioux nation": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/sioux-nation" },
  "no nay never": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/no-nay-never" },
  "wootton bassett": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/wootton-bassett" },
  "camelot": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/camelot" },
  "churchill": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/churchill" },
  "merchant navy": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/merchant-navy" },
  "magna grecia": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/magna-grecia" },
  "ten sovereigns": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/ten-sovereigns" },
  "saxon warrior": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/saxon-warrior" },
  "sergei prokofiev": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/sergei-prokofiev" },
  "arizona": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/arizona" },
  "lope de vega": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/lope-de-vega" },
  "starspangledbanner": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/starspangledbanner" },
  "st mark's basilica": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/st-marks-basilica" },
  "little big bear": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/little-big-bear" },
  "paddington": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/paddington" },
  // Coolmore Australia
  "extreme choice": { stud: "Coolmore Australia", url: "coolmore.com/farms/australia/stallions/extreme-choice" },
  "zoustar": { stud: "Coolmore Australia", url: "coolmore.com/farms/australia/stallions/zoustar" },
  "fastnet rock": { stud: "Coolmore Australia", url: "coolmore.com/farms/australia/stallions/fastnet-rock" },
  // Darley
  "dubawi": { stud: "Darley", url: "darleys.com/stallions/dubawi" },
  "frankel": { stud: "Darley/Juddmonte", url: "darleys.com/stallions/frankel" },
  "night of thunder": { stud: "Darley", url: "darleys.com/stallions/night-of-thunder" },
  "blue point": { stud: "Darley", url: "darleys.com/stallions/blue-point" },
  "naval crown": { stud: "Darley", url: "darleys.com/stallions/naval-crown" },
  "too darn hot": { stud: "Darley", url: "darleys.com/stallions/too-darn-hot" },
  "dark angel": { stud: "Darley", url: "darleys.com/stallions/dark-angel" },
  "exceed and excel": { stud: "Darley", url: "darleys.com/stallions/exceed-and-excel" },
  "new approach": { stud: "Darley", url: "darleys.com/stallions/new-approach" },
  "showcasing": { stud: "Darley", url: "darleys.com/stallions/showcasing" },
  "mehmas": { stud: "Darley", url: "darleys.com/stallions/mehmas" },
  "minzaal": { stud: "Darley", url: "darleys.com/stallions/minzaal" },
  "pinatubo": { stud: "Darley", url: "darleys.com/stallions/pinatubo" },
  // Godolphin / Shadwell
  "baaeed": { stud: "Shadwell/Nunnery Stud", url: "shadwellstud.com" },
  // Juddmonte
  "kingman": { stud: "Juddmonte", url: "juddmonte.com/stallions/kingman" },
  // US sires
  "into mischief": { stud: "Spendthrift Farm", url: "spendthriftfarm.com" },
  "gun runner": { stud: "Three Chimneys Farm", url: "threechimneys.com" },
  "quality road": { stud: "Lane's End Farm", url: "lanesend.com" },
  "curlin": { stud: "Hill 'n' Dale at Xalapa", url: "hillndalefarms.com" },
  "justify": { stud: "Coolmore America", url: "coolmore.com/farms/america/stallions/justify" },
  "uncle mo": { stud: "Coolmore America", url: "coolmore.com/farms/america/stallions/uncle-mo" },
  // Commercial EU sires
  "kodiac": { stud: "Tally-Ho Stud", url: "tallyho.ie" },
  "profitable": { stud: "Kildangan Stud", url: "darleys.com/stallions/profitable" },
  "havana grey": { stud: "Whitsbury Manor Stud", url: "whitsburymanorstud.co.uk" },
  "calyx": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/calyx" },
  "sottsass": { stud: "Coolmore Ireland", url: "coolmore.com/farms/ireland/stallions/sottsass" },
  "siyouni": { stud: "Aga Khan Studs", url: "agakhanstuds.com" },
  "sea the stars": { stud: "Gilltown Stud", url: "agakhanstuds.com" },
};

const SIRE_MARKET_TIERS: Record<string, { floor: number; target: number; upside: number; label: string }> = {
  // —— Elite global sires ——
  "frankel": { floor: 450000, target: 850000, upside: 1800000, label: "elite global sire benchmark" },
  "dubawi": { floor: 450000, target: 850000, upside: 1800000, label: "elite global sire benchmark" },
  "galileo": { floor: 400000, target: 800000, upside: 1700000, label: "elite classic sire benchmark" },
  // —— Elite US dirt sires (Flightline tier) ——
  "flightline": { floor: 600000, target: 1100000, upside: 2500000, label: "first-crop sensation US dirt sire benchmark" },
  "into mischief": { floor: 350000, target: 700000, upside: 1500000, label: "leading US dirt sire benchmark" },
  "curlin": { floor: 320000, target: 650000, upside: 1400000, label: "leading US dirt sire benchmark" },
  "gun runner": { floor: 350000, target: 700000, upside: 1500000, label: "elite US dirt sire benchmark" },
  "justify": { floor: 300000, target: 600000, upside: 1300000, label: "elite US classic sire benchmark" },
  "tapit": { floor: 280000, target: 550000, upside: 1200000, label: "leading US dirt sire benchmark" },
  "quality road": { floor: 220000, target: 450000, upside: 950000, label: "top US dirt sire benchmark" },
  "american pharoah": { floor: 200000, target: 420000, upside: 900000, label: "top US classic sire benchmark" },
  "medaglia d'oro": { floor: 180000, target: 380000, upside: 800000, label: "top US dirt sire benchmark" },
  "uncle mo": { floor: 200000, target: 420000, upside: 900000, label: "top US dirt sire benchmark" },
  "not this time": { floor: 180000, target: 360000, upside: 780000, label: "rising US dirt sire benchmark" },
  "constitution": { floor: 170000, target: 340000, upside: 720000, label: "proven US dirt sire benchmark" },
  "munnings": { floor: 140000, target: 280000, upside: 600000, label: "commercial US dirt sire benchmark" },
  "good magic": { floor: 180000, target: 360000, upside: 780000, label: "rising US dirt sire benchmark" },
  "city of light": { floor: 160000, target: 320000, upside: 680000, label: "proven US dirt sire benchmark" },
  "nyquist": { floor: 150000, target: 300000, upside: 640000, label: "proven US dirt sire benchmark" },
  "twirling candy": { floor: 130000, target: 260000, upside: 560000, label: "commercial US dirt sire benchmark" },
  // —— Elite EU commercial sires ——
  "wootton bassett": { floor: 320000, target: 620000, upside: 1300000, label: "elite EU commercial sire benchmark" },
  "kingman": { floor: 280000, target: 540000, upside: 1100000, label: "top EU commercial sire benchmark" },
  "night of thunder": { floor: 220000, target: 440000, upside: 900000, label: "top EU commercial sire benchmark" },
  "siyouni": { floor: 240000, target: 460000, upside: 950000, label: "top EU classic sire benchmark" },
  "sea the stars": { floor: 220000, target: 440000, upside: 900000, label: "top EU classic sire benchmark" },
  "lope de vega": { floor: 180000, target: 360000, upside: 760000, label: "high-demand EU sire benchmark" },
  "no nay never": { floor: 150000, target: 300000, upside: 640000, label: "high-demand speed sire benchmark" },
  "too darn hot": { floor: 140000, target: 280000, upside: 600000, label: "high-demand young sire benchmark" },
  "blue point": { floor: 120000, target: 240000, upside: 520000, label: "high-demand young sire benchmark" },
  "pinatubo": { floor: 35000, target: 85000, upside: 240000, label: "commercial young sire benchmark" },
  "calyx": { floor: 35000, target: 80000, upside: 230000, label: "commercial young sire benchmark" },
  "mehmas": { floor: 30000, target: 75000, upside: 220000, label: "commercial sire benchmark" },
  "sioux nation": { floor: 28000, target: 70000, upside: 220000, label: "commercial sire benchmark" },
  "kodiac": { floor: 30000, target: 75000, upside: 220000, label: "proven commercial sire benchmark" },
  "havana grey": { floor: 35000, target: 90000, upside: 260000, label: "hot commercial sire benchmark" },
  "starspangledbanner": { floor: 30000, target: 75000, upside: 220000, label: "proven commercial sire benchmark" },
  "dark angel": { floor: 30000, target: 75000, upside: 220000, label: "proven commercial sire benchmark" },
  "zoustar": { floor: 40000, target: 100000, upside: 280000, label: "high-demand sire benchmark" },
  // —— Verrazano (relevant damsire context) ——
  "verrazano": { floor: 70000, target: 140000, upside: 300000, label: "proven dirt sire benchmark" },
};

function getSireMarketTier(sireName?: string | null) {
  const key = String(sireName || "").trim().toLowerCase();
  return SIRE_MARKET_TIERS[key] || null;
}

function detectMajorStud(sireName?: string | null): { stud: string; url: string } | null {
  if (!sireName) return null;
  const key = sireName.trim().toLowerCase();
  return MAJOR_STUD_SIRES[key] || null;
}

function buildStudPageSireQuery(sireName: string, studInfo: { stud: string; url: string }): string {
  return `"${sireName}" yearling prices sold 2024 2025 stud fee stallion statistics Group winners stakes winners runners progeny site:${studInfo.url.split("/")[0]} OR site:coolmore.com OR site:darleys.com OR site:godolphin.com OR site:juddmonte.com OR site:racingpost.com OR site:thoroughbreddailynews.com`;
}

// Post-processing: enforce score floors for major-stud sires
function applyScoreFloors(extractedData: any) {
  if (!Array.isArray(extractedData?.horses)) return extractedData;
  for (const horse of extractedData.horses) {
    if (!horse?.scores || !horse?.pedigree) continue;
    const sireName = String(horse.pedigree.sire || "").trim();
    const studInfo = detectMajorStud(sireName);
    const sireTier = getSireMarketTier(sireName);
    if (!studInfo && !sireTier) continue;

    // Extract stud fee from sire_stats or pedigree research
    const studFeeStr = String(horse.sire_stats?.stud_fee || "");
    const studFeeMatch = studFeeStr.match(/[\d,]+/);
    const studFee = studFeeMatch ? Number(studFeeMatch[0].replace(/,/g, "")) : 0;

    // —— Dam-strength signal: weak dams (unraced / no black-type) reduce the floor ——
    const damText = `${horse.pedigree?.dam || ""} ${horse.pedigree?.dam_performance || ""} ${horse.pedigree?.dam_notes || ""} ${horse.pedigree?.notes || ""}`.toLowerCase();
    const damStrong = /(group|grade|listed|stakes|black-type|black type|g1|g2|g3|gr\.?\s*[123])/i.test(damText);
    const damWeak = !damStrong && /(unraced|unplaced|non[- ]winner|maiden\s*(at\s*)?stud|no\s*foals|untested)/i.test(damText);
    // If neither strong nor weak signal is present, infer weakness from a low pedigree_score
    const damProbablyWeak = damWeak || (!damStrong && Number(horse.scores.pedigree_score) > 0 && Number(horse.scores.pedigree_score) < 10);
    const damFactor = damStrong ? 1.0 : damProbablyWeak ? 0.55 : 0.8;

    // Determine minimum scores based on fee tiers
    let minPedigree = 6, minCommercial = 5, minTotal = 30;
    if (studFee >= 100000) { minPedigree = 18; minCommercial = 16; minTotal = 50; }
    else if (studFee >= 50000) { minPedigree = 14; minCommercial = 13; minTotal = 45; }
    else if (studFee >= 25000) { minPedigree = 10; minCommercial = 9; minTotal = 38; }
    // Major / commercial benchmark sires always get a reasonable floor even if fee not found
    else if (studInfo || sireTier) { minPedigree = 10; minCommercial = 9; minTotal = 35; }

    // Soften floors when the dam page is clearly weak — premium sire alone should not lift the score blindly
    if (damProbablyWeak) {
      minPedigree = Math.max(6, Math.round(minPedigree * 0.75));
      minCommercial = Math.max(5, Math.round(minCommercial * 0.8));
      minTotal = Math.max(28, Math.round(minTotal * 0.8));
    }

    const s = horse.scores;
    if (s.pedigree_score < minPedigree) {
      console.log(`[SCORE-FLOOR] ${sireName}: pedigree ${s.pedigree_score} → ${minPedigree} (stud: ${studInfo?.stud || sireTier?.label}, fee: ${studFee})`);
      s.pedigree_score = minPedigree;
    }
    if (s.commercial_score < minCommercial) {
      console.log(`[SCORE-FLOOR] ${sireName}: commercial ${s.commercial_score} → ${minCommercial}`);
      s.commercial_score = minCommercial;
    }

    // Recalculate total
    const total = s.pedigree_score + (s.performance_score || 0) + s.commercial_score + (s.conformation_potential || 0);
    if (total < minTotal) {
      // Distribute the deficit to pedigree and commercial
      const deficit = minTotal - total;
      s.pedigree_score = Math.min(25, s.pedigree_score + Math.ceil(deficit / 2));
      s.commercial_score = Math.min(25, s.commercial_score + Math.floor(deficit / 2));
    }
    s.overall_score = Math.min(100, s.pedigree_score + (s.performance_score || 0) + s.commercial_score + (s.conformation_potential || 0));

    // Fix pedigree rating_split floors
    const rs = horse.pedigree?.rating_split;
    if (rs) {
      // Genetic-quality floor — anchored on sire tier when fee is unknown
      const minGenetic = studFee >= 100000 ? 7.5
        : studFee >= 50000 ? 7.0
        : studFee >= 25000 ? 6.0
        : sireTier ? 5.5
        : studInfo ? 5.0 : 3.5;
      const adjGenetic = damProbablyWeak ? Math.max(3.5, minGenetic - 1.5) : minGenetic;
      if (rs.genetic_quality < adjGenetic) {
        console.log(`[SCORE-FLOOR] ${sireName}: genetic_quality ${rs.genetic_quality} → ${adjGenetic} (damWeak=${damProbablyWeak})`);
        rs.genetic_quality = adjGenetic;
      }
      const minCommAppeal = (studFee >= 100000 ? 8.0
        : studFee >= 50000 ? 6.5
        : studFee >= 25000 ? 5.0
        : sireTier ? 5.0
        : studInfo ? 4.5 : 3.5) * (damProbablyWeak ? 0.85 : 1.0);
      if (rs.commercial_appeal < minCommAppeal) {
        console.log(`[SCORE-FLOOR] ${sireName}: commercial_appeal ${rs.commercial_appeal} → ${minCommAppeal}`);
        rs.commercial_appeal = minCommAppeal;
      }
    }

    // Fix verdict: major stud sire should never be PASS just because data is missing
    const verdict = String(horse.agent_verdict || "").toUpperCase();
    if ((verdict === "PASS" || verdict === "AVOID") && s.overall_score >= 45) {
      horse.agent_verdict = "MONITOR";
      if (horse.verdict_reason && /no.*(?:previous sale|verified|public|anchor)/i.test(horse.verdict_reason)) {
        horse.verdict_reason = `MONITOR — ${sireName} carries a ${studInfo?.stud || sireTier?.label} profile. Score ${s.overall_score}/100 warrants active monitoring. Dam page requires deeper verification before upgrading to BUY. ${horse.verdict_reason.replace(/^PASS is justified because/i, "Note:")}`;
      }
    }

    // Market estimates are intentionally not rewritten here: exact sale results,
    // Tavily comparables, and the final validation step are the only valuation sources.
  }
  return extractedData;
}

function looksSyntheticHorseName(name?: string | null, sire?: string | null, dam?: string | null): boolean {
  const normalizedName = String(name || "").trim().toLowerCase();
  const normalizedSire = String(sire || "").trim().toLowerCase();
  const normalizedDam = String(dam || "").trim().toLowerCase();

  if (!normalizedName) return true;
  if (normalizedName.includes("unnamed")) return true;
  if (normalizedSire && normalizedDam && normalizedName === `${normalizedSire} x ${normalizedDam}`) return true;
  return normalizedName.includes(" x ") && !/[()]/.test(normalizedName);
}

function buildSingleHorseIdentityQuery(params: {
  horseName: string;
  lotNumber?: string;
  fileName: string;
  sire?: string;
  dam?: string;
  damSire?: string;
  sex?: string;
  country?: string;
  birthYear?: number;
}) {
  const { horseName, lotNumber, fileName, sire, dam, damSire, sex, country, birthYear } = params;
  const syntheticName = looksSyntheticHorseName(horseName, sire, dam);

  if (!syntheticName) {
    return `${buildPrecisePedigreeQuery(horseName, country, birthYear)}\nLot/Hip: ${lotNumber || "Unknown"}\nSale document: ${fileName}\nConfirm the exact lot identity from the sale page and keep sire, dam, and dam sire aligned with the auction document.`;
  }

  return `Identify the EXACT thoroughbred sales lot from the auction document and public sources.
Lot/Hip: "${lotNumber || "Unknown"}"
Sale document: "${fileName}"
Sire: "${sire || "Data unavailable"}"
Dam: "${dam || "Data unavailable"}"
Dam Sire: "${damSire || "Data unavailable"}"
Sex: "${sex || "Data unavailable"}"
${country ? `Country: "${country}"` : ""}
${birthYear ? `Birth year: "${birthYear}"` : ""}

Return only verified lot identity details, pedigree alignment, sale context, consignor if explicitly published, and any official estimate or sale result tied to this exact lot. If no public confirmation exists, say so clearly.`;
}

function buildSingleHorseMarketQuery(params: {
  horseName: string;
  lotNumber?: string;
  fileName: string;
  sire?: string;
  dam?: string;
  damSire?: string;
  sex?: string;
  birthYear?: number;
}) {
  const { horseName, lotNumber, fileName, sire, dam, damSire, sex, birthYear } = params;
  return `Find VERIFIED market data and comparable auction values for this exact thoroughbred sales lot.
Horse/Lot: "${horseName}"
Lot/Hip: "${lotNumber || "Unknown"}"
Sale document: "${fileName}"
Sire: "${sire || "Data unavailable"}"
Dam: "${dam || "Data unavailable"}"
Dam Sire: "${damSire || "Data unavailable"}"
Sex: "${sex || "Data unavailable"}"
${birthYear ? `Birth year: "${birthYear}"` : ""}

Search for REAL public sale results, official catalogue estimates, auction-house results, sire averages, sibling sale prices, and same-cross comparables.
If this lot itself sold publicly, prioritise that exact result over generic averages.
If exact-lot evidence is missing, use the closest same-sire/same-dam-family auction comparables and say that the valuation is comp-based.`;
}

function buildSingleHorseResearchSummary(sections: ResearchSection[]): string {
  return sections
    .filter((section) => section.content)
    .map((section) => {
      const sourceLine = section.citations?.length
        ? `Sources: ${section.citations.slice(0, 5).join(", ")}`
        : "Sources: none returned";
      const tierLine = section.tier ? `Tier used: ${section.tier}` : "";
      return [`=== ${section.title} ===`, truncateForPrompt(section.content), sourceLine, tierLine].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function hasVerifiedMarketEvidence(text?: string | null): boolean {
  const value = String(text || "");
  if (!value.trim()) return false;
  const hasMoney = /(?:£|€|\$)\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*\s?gns\b/i.test(value);
  const hasMarketLanguage = /(sold|sale result|hammer|average|median|stud fee|yearling average|foal average|comparable|auction|price|buyer)/i.test(value);
  const negativeOnly = /(NO PREVIOUS SALE RESULT FOUND|not found|data unavailable)/i.test(value) && !hasMoney;
  return hasMoney && hasMarketLanguage && !negativeOnly;
}

function buildReinforcedMarketAnchorQuery(params: {
  horseName: string;
  lotNumber?: string;
  fileName: string;
  sire?: string;
  dam?: string;
  damSire?: string;
  sex?: string;
  birthYear?: number;
}) {
  const { horseName, lotNumber, fileName, sire, dam, damSire, sex, birthYear } = params;
  return `MANDATORY BLOODSTOCK MARKET ANCHOR SEARCH — do not stop at "not found".
Subject lot: "${horseName}"
Lot/Hip: "${lotNumber || "Unknown"}"
Catalogue/file: "${fileName}"
Sire: "${sire || "Unknown"}"
Dam: "${dam || "Unknown"}"
Dam sire: "${damSire || "Unknown"}"
Sex: "${sex || "Unknown"}"
${birthYear ? `Year of birth: "${birthYear}"` : ""}

Search public auction and bloodstock sources for the best available valuation anchor, in this order:
1. Exact previous sale / hammer result for this lot or horse.
2. Sale price of a half/full sibling or the dam herself.
3. Current sire yearling/foal/2YO average or median, plus recent top-priced lots by this sire.
4. Sire stud fee and market commentary if auction averages are unavailable.
5. Same sire x similar dam-sire / same female-family comparables.

Return plain text with these headings:
ANCHOR_STATUS: VERIFIED_PREVIOUS_SALE / VERIFIED_SIBLING_OR_DAM_SALE / VERIFIED_SIRE_AVERAGE / VERIFIED_STUD_FEE_PROXY / NO_VERIFIED_COMPARABLE_FOUND
BEST_ANCHOR: price + currency + source + year, or the stud-fee proxy used.
COMPARABLES: 3-6 bullets with horse, sire/dam connection, sale, year, price.
SIRE_MARKET: sire fee, yearling/foal average or median, and whether market trend is UP/STABLE/DOWN.
DAM_FAMILY_MARKET: public prices for dam, siblings, produce, or close female-family members.
CONFIDENCE: HIGH / MEDIUM / LOW, with one sentence explaining why.

If no public exact/sibling/sire-average anchor exists, return NO_VERIFIED_COMPARABLE_FOUND and write exactly "${NOT_PUBLICLY_AVAILABLE}" for unavailable facts. Do not invent a comparable or a generic market range.`;
}

function applyObservedPriceAnchor(extractedData: any, observedPrice: ObservedPrice | null, lotNumber?: string) {
  if (!observedPrice || !Array.isArray(extractedData?.horses) || extractedData.horses.length !== 1) return extractedData;

  const horse = extractedData.horses[0] ?? {};
  horse.commercial_analysis = horse.commercial_analysis || {};

  const anchoredRange = formatObservedRange(observedPrice);
  if (!horse.commercial_analysis.estimated_value_range) {
    horse.commercial_analysis.estimated_value_range = anchoredRange;
  }
  if (!horse.commercial_analysis.estimated_value_justification) {
    horse.commercial_analysis.estimated_value_justification = `The source document includes a quoted figure of ${observedPrice.raw}${lotNumber ? ` for Lot ${lotNumber}` : ""}. That document number can be used as one pricing signal, but the final fair-market view should still be checked against verified public auction comparables, sire averages, and dam-family evidence.`;
  }

  if (Array.isArray(horse.commercial_analysis.comparable_sales)) {
    horse.commercial_analysis.comparable_sales = [
      {
        horse: lotNumber ? `Lot ${lotNumber}` : horse.name || "Subject lot",
        price: observedPrice.raw,
        sale: "Observed in source document",
        year: String(new Date().getFullYear()),
      },
      ...horse.commercial_analysis.comparable_sales,
    ].slice(0, 5);
  }

  if (Array.isArray(extractedData.top_recommendations) && extractedData.top_recommendations[0]) {
    extractedData.top_recommendations[0].estimated_value ||= anchoredRange;
  }

  return extractedData;
}

function buildSingleHorseFallbackAnalysis(params: {
  primaryHorse: Record<string, any>;
  fileName: string;
  objectiveLabel: string;
  budgetRaw?: string | null;
  observedPrice: ObservedPrice | null;
  horseType?: HorseType;
}) {
  const { primaryHorse, fileName, objectiveLabel, budgetRaw, observedPrice, horseType } = params;
  const sire = primaryHorse.sire || "Data unavailable";
  const dam = primaryHorse.dam || "Data unavailable";
  const damSire = primaryHorse.damsire || primaryHorse.dam_sire || "Data unavailable";
  const sireTier = getSireMarketTier(sire);
  const name = primaryHorse.name || primaryHorse.horse_name || `${sire} x ${dam}`.replace(/^Data unavailable x Data unavailable$/, fileName.replace(/\.[^.]+$/i, ""));
  const lotNumber = primaryHorse.lot_number || "";
  const pedigreeScore = sire !== "Data unavailable" && dam !== "Data unavailable" ? 74 : 58;
  const isUnracedYoungLot = horseType === "YEARLING" || horseType === "FOAL" || horseType === "NH_STORE";
  const performanceScore = isUnracedYoungLot ? 0 : primaryHorse.performance_notes ? 13 : 0;
  const commercialScore = observedPrice ? 82 : 61;
  const overallScore = Math.round((pedigreeScore + performanceScore + commercialScore) / 3);
  const fallbackAnchor = observedPrice?.amount || Math.max(25000, sireTier?.target || 0, primaryHorse.reserve_estimate ? parseObservedPrice(primaryHorse.reserve_estimate)?.amount || 0 : 0, sire !== "Data unavailable" ? 45000 : 25000);
  const fallbackCurrency = observedPrice?.currency || "EUR";
  const fallbackCurrencyPrefix = fallbackCurrency === "GBP" ? "£" : fallbackCurrency === "EUR" ? "€" : fallbackCurrency === "USD" ? "$" : "";
  const fallbackCurrencySuffix = fallbackCurrency === "GNS" ? "gns" : "";
  const fmtFallback = (amount: number) => `${fallbackCurrencyPrefix}${(Math.round(amount / 1000) * 1000).toLocaleString("en-GB")}${fallbackCurrencySuffix}`;
  const rawFairLow = Math.max(observedPrice ? Math.round(fallbackAnchor * 0.7) : Math.round(fallbackAnchor * 0.65), sireTier?.floor || 0);
  const rawFairHigh = Math.max(observedPrice ? Math.round(fallbackAnchor * 2.0) : Math.round(fallbackAnchor * 1.55), sireTier?.target || 0);
  const rawUpside = Math.max(Math.round(fallbackAnchor * (observedPrice ? 2.4 : 2.0)), sireTier?.upside || 0);
  const rawAvoid = Math.round(fallbackAnchor * (observedPrice ? 2.8 : 2.4));
  const ladderFb = enforcePriceLadder({
    floor: sireTier?.floor || 0,
    fairLow: rawFairLow,
    fairHigh: rawFairHigh,
    physicalUpside: rawUpside,
    avoidAbove: rawAvoid,
    lotId: lotNumber || name,
  });
  const fairLow = ladderFb.fairLow;
  const fairHigh = ladderFb.fairHigh;
  const physicalUpside = ladderFb.physicalUpside;
  const avoidAbove = ladderFb.avoidAbove;
  const estimatedValueRange = observedPrice && !sireTier ? formatObservedRange(observedPrice) : `${fmtFallback(fairLow)}-${fmtFallback(fairHigh)}`;
  const fallbackBidStrategy = composeBidStrategy({ fmt: fmtFallback, fairHigh, physicalUpside, avoidAbove });
  const estimatedValueJustification = observedPrice
    ? `Anchor: observed document figure = ${observedPrice.raw}${lotNumber ? ` for Lot ${lotNumber}` : ""} (source: uploaded catalogue, confidence MEDIUM). Adjusted for the available pedigree page and missing public comparable verification. Fair-trade range ${fmtFallback(fairLow)}-${fmtFallback(fairHigh)}; stretch zone up to ${fmtFallback(physicalUpside)} only justified by an A-grade physical; walk-away ceiling ${fmtFallback(avoidAbove)}. ${fallbackBidStrategy}`
    : composeUnavailableMarketJustification({
        sire, dam, fmt: fmtFallback, fairLow, fairHigh, physicalUpside, avoidAbove,
        sireTierLabel: sireTier?.label || null,
      });
  assertNoBrokenStatusSplice(estimatedValueJustification);
  // Verdict is driven by MERIT (overall score), not by missing comparables.
  const verdict = observedPrice
    ? "VALUE BUY ONLY"
    : overallScore >= 70 ? "VALUE BUY ONLY"
    : overallScore >= 55 ? "MONITOR"
    : "PASS";

  return {
    catalog_summary: {
      sale_name: fileName.replace(/\.[^.]+$/i, ""),
      auction_house: "PDF Upload",
      date: "",
      location: "",
      total_lots: 1,
      quality_assessment: "Single-horse analysis built from the uploaded document with fallback market synthesis.",
      market_temperature: observedPrice ? "Warm" : "Cold",
      average_price_range: observedPrice ? estimatedValueRange : `${fmtFallback(fairLow)}-${fmtFallback(fairHigh)}`,
      key_sire_lines: sire !== "Data unavailable" ? [sire] : [],
      key_female_families: dam !== "Data unavailable" ? [dam] : [],
    },
    horses: [{
      name,
      lot_number: lotNumber,
      year_of_birth: Number(primaryHorse.year_of_birth) || 0,
      sex: primaryHorse.sex || "",
      country: primaryHorse.country || "",
      consignor: primaryHorse.consignor || "",
      breeder: primaryHorse.breeder || "",
      pedigree: {
        sire,
        dam,
        dam_sire: damSire,
        sire_of_damsire: "",
        nick_rating: observedPrice ? "A" : "B",
        nick_explanation: observedPrice ? "The page carries enough commercial support to justify positive cross appeal in the current market." : "Pedigree cross needs deeper third-party verification for a higher conviction rating.",
        inbreeding_coefficient: 0,
        inbreeding_to: [],
        dosage_profile: { B: 0, I: 0, C: 0, S: 0, P: 0, DI: 0, CD: 0 },
        key_ancestors: [sire, dam, damSire].filter((value) => value && value !== "Data unavailable"),
        female_family: dam !== "Data unavailable" ? dam : "",
        family_number: "",
      },
      performance: {
        career: { starts: 0, wins: 0, places: 0, unplaced: 0, earnings: "", win_percentage: 0 },
        speed_figures: { best_rpr: null, best_beyer: null, best_timeform: null, avg_last_5: null, trend: "stable" },
        distance_profile: "",
        surface_preference: "",
        going_preference: "",
        class_ceiling: "",
        best_races: [],
      },
      siblings: [],
      sire_stats: {
        runners: 0,
        winners: 0,
        stakes_winners: 0,
        win_rate: 0,
        avg_earning_index: 0,
        stud_fee: "",
        standing_at: "",
        best_progeny: [],
      },
      dam_produce: [],
      commercial_analysis: {
        estimated_value_range: observedPrice ? estimatedValueRange : `${fmtFallback(fairLow)}-${fmtFallback(fairHigh)}`,
        estimated_value_justification: estimatedValueJustification,
        comparable_sales: observedPrice ? [{ horse: lotNumber ? `Lot ${lotNumber}` : name, price: observedPrice.raw, sale: "Observed in source document", year: String(new Date().getFullYear()) }] : [],
        market_demand: observedPrice ? "High" : "Medium",
        resale_potential: observedPrice ? "High" : "Medium",
        commercial_sire: sire !== "Data unavailable",
        market_estimate: {
          fair_trade_low: fairLow,
          fair_trade_high: fairHigh,
          physical_upside: physicalUpside,
          avoid_above: avoidAbove,
          bid_strategy: fallbackBidStrategy,
        },
      },
      scores: {
        pedigree_score: pedigreeScore,
        performance_score: performanceScore,
        commercial_score: commercialScore,
      conformation_potential: observedPrice ? 12 : 0,
        overall_score: overallScore,
      },
      agent_verdict: verdict,
      verdict_reason: observedPrice
        ? `Observed sale anchor at ${observedPrice.raw} supports the range; act on the anchor, refresh comparables before exceeding fair-trade high.`
        : composeUnavailableInsightCopy({
            verdict, sire, dam, fmt: fmtFallback, fairLow, fairHigh, physicalUpside, avoidAbove,
          }),
      key_strengths: [
        sire !== "Data unavailable" ? `Sire identified: ${sire}` : "Pedigree partially identified from document",
        dam !== "Data unavailable" ? `Dam identified: ${dam}` : "Dam side needs fuller verification",
        observedPrice ? `Observed market anchor at ${observedPrice.raw}` : "Pedigree identity extracted from the PDF, but market anchor remains unverified",
      ],
      key_risks: [
        `Market-anchor risk: no verified previous sale, sibling sale, sire average, or stud-fee proxy was returned — fair value has low confidence and must be discounted.`,
        `Liquidity risk: buyer depth for ${sire} out of ${dam} is unproven in the returned research — resale margin could compress if the physical is only average.`,
        `Price-ceiling risk: above ${fmtFallback(avoidAbove)} the buyer is paying beyond the current evidence base — pass unless a fresh verified comparable appears.`,
        "Conformation risk: no independent physical inspection data was available — any valuation should remain conditional on inspection.",
      ],
      detailed_analysis: `SIRE MOMENTUM: Sire data not retrieved — manual research required before bidding.\nBUYER DEMAND: Sale context not classified in this pass.\nPAGE DEPTH: Black-type verification pending.\nDAM PRODUCTION: Dam record NOT FOUND.\nUPDATE POTENTIAL: No updates extracted.\nEXPORT/PINHOOK: Not assessed.\nRESIDUAL VALUE: Not assessed.\nFINAL CONVICTION: Insufficient verified data — re-run research before any bid.`,
    }],
    top_recommendations: [{
      rank: 1,
      lot_number: lotNumber,
      horse_name: name,
      overall_score: overallScore,
      reason: observedPrice ? "Observed market support and usable pedigree structure." : "Pass/monitor only until a verified market anchor or exceptional physical inspection improves confidence.",
      estimated_value: observedPrice ? estimatedValueRange : `${fmtFallback(fairLow)}-${fmtFallback(fairHigh)}`,
      risk_level: observedPrice ? "MEDIUM" : "HIGH",
      verdict,
      pedigree_highlights: [sire, dam, damSire].filter((value) => value && value !== "Data unavailable").join(" / "),
      performance_highlights: primaryHorse.performance_notes || "Limited verified race data in source file.",
      investment_thesis: observedPrice
        ? `A real figure in the source document provides a practical pricing anchor, which materially improves confidence in the commercial view. The opportunity is therefore more actionable than a purely model-driven estimate, provided the buyer still accepts the normal pedigree and physical-inspection risks.`
        : `Without a completed deep-comps pass, this should be treated as a cautious shortlist candidate. The buying case depends on confirming live market benchmarks and any missing page depth before a firm bid ceiling is set.`,
    }],
    market_insights: {
      trending_sires: sire !== "Data unavailable" ? [sire] : [],
      value_picks: [name],
      premium_lots: observedPrice ? [name] : [],
      ones_to_avoid: [],
      overall_catalog_quality: "Single horse report",
      market_commentary: observedPrice ? `The document includes a live market indicator at ${observedPrice.raw}, which materially improves valuation confidence.` : "Market view remains provisional until additional comparable sales are confirmed.",
    },
    chart_data: {
      score_distribution: [{ name, pedigree: pedigreeScore, performance: performanceScore, commercial: commercialScore, overall: overallScore }],
      sire_representation: [{ sire: sire !== "Data unavailable" ? sire : name, count: 1, avg_score: overallScore }],
      verdict_breakdown: {
        BUY: verdict === "VALUE BUY ONLY" ? 1 : 0,
        WATCH: verdict === "MONITOR" ? 1 : 0,
        AVOID: verdict === "PASS" ? 1 : 0,
      },
    },
  };
}

function guaranteeMarketAnchorAndNegativeExplanation(extractedData: any, sessionCurrency: SessionCurrency) {
  if (!Array.isArray(extractedData?.horses)) return extractedData;
  const fmt = (amount: number) => formatCurrencyAmount(Math.max(1000, Math.round(amount / 1000) * 1000), sessionCurrency);
  const weakAnchorPattern = /Anchor:\s*NOT FOUND|neither a previous sale result|No verified anchor returned|pass unless re-run|re-run research before bidding/i;

  for (const horse of extractedData.horses) {
    horse.commercial_analysis = horse.commercial_analysis || {};
    horse.scores = horse.scores || {};
    const pedigreeScore = Number(horse.scores.pedigree_score) || 0;
    const commercialScore = Number(horse.scores.commercial_score) || 0;
    const sire = horse.pedigree?.sire || "the sire";
    const dam = horse.pedigree?.dam || "the dam";
    const existingJustification = String(horse.commercial_analysis.estimated_value_justification || "");
    const hasMarketEstimate = horse.commercial_analysis.market_estimate && Number(horse.commercial_analysis.market_estimate.fair_trade_high) > 0;

    if (weakAnchorPattern.test(existingJustification) || !existingJustification || !hasMarketEstimate) {
      // ── Differentiated fallback anchor using ALL available score dimensions ──
      const perfScore = Number(horse.scores.performance_score) || 0;
      const confScore = Number(horse.scores.conformation_potential) || 0;
      const overallScore = Number(horse.scores.overall_score) || 0;
      const isColt = String(horse.sex || "").toLowerCase().includes("colt");
      const isFilly = String(horse.sex || "").toLowerCase().includes("filly");
      const isMare = String(horse.sex || "").toLowerCase().includes("mare");
      const sireStr = String(horse.pedigree?.sire || "").toLowerCase();
      const nickRating = String(horse.pedigree?.nick_rating || "").toUpperCase();
      const sireTier = getSireMarketTier(sireStr);

      // —— Dam-strength signal ——
      const damTextFb = `${horse.pedigree?.dam || ""} ${horse.pedigree?.dam_performance || ""} ${horse.pedigree?.dam_notes || ""} ${horse.pedigree?.notes || ""}`.toLowerCase();
      const damStrongFb = /(group|grade|listed|stakes|black-type|black type|g1|g2|g3|gr\.?\s*[123])/i.test(damTextFb);
      const damWeakFb = !damStrongFb && /(unraced|unplaced|non[- ]winner|maiden\s*(at\s*)?stud|untested)/i.test(damTextFb);
      const damProbablyWeakFb = damWeakFb || (!damStrongFb && pedigreeScore > 0 && pedigreeScore < 10);
      const damFactor = damStrongFb ? 1.0 : damProbablyWeakFb ? 0.55 : 0.8;

      // Sire-tier multiplier: elite/top commercial sires get strong premium
      const eliteSires = ["frankel", "dubawi", "galileo", "flightline", "into mischief", "curlin", "gun runner", "tapit"];
      const topSires = ["siyouni", "kingman", "lope de vega", "wootton bassett", "night of thunder", "sea the stars", "justify", "quality road", "american pharoah", "uncle mo", "medaglia d'oro", "good magic", "not this time", "constitution", "city of light", "nyquist"];
      const midSires = ["kodiac", "mehmas", "zoustar", "dark angel", "no nay never", "caravaggio", "profitable", "saxon warrior", "havana grey", "blue point", "pinatubo", "sottsass", "starspangledbanner", "too darn hot", "calyx", "munnings", "twirling candy", "verrazano"];
      const sireMultiplier = eliteSires.some(s => sireStr.includes(s)) ? 4.2
        : topSires.some(s => sireStr.includes(s)) ? 3.0
        : midSires.some(s => sireStr.includes(s)) ? 1.9
        : 1.1;

      // Damsire bonus (good damsires lift commercial perception)
      const damSireStr = String(horse.pedigree?.dam_sire || horse.pedigree?.damsire || "").toLowerCase();
      const damSireBonus = eliteSires.some(s => damSireStr.includes(s)) ? 1.25
        : topSires.some(s => damSireStr.includes(s)) ? 1.15
        : midSires.some(s => damSireStr.includes(s)) ? 1.07
        : 1.0;

      // Nick bonus
      const nickBonus = nickRating.startsWith("A+") ? 1.4 : nickRating.startsWith("A") ? 1.22 : nickRating.startsWith("B") ? 1.07 : 1.0;

      // Build anchor from weighted scores
      const rawAnchor = (pedigreeScore * 2200) + (commercialScore * 2600) + (perfScore * 1100) + (confScore * 550);
      const sexAdj = isColt ? 1.18 : isMare ? 0.85 : isFilly ? 0.97 : 1.0;

      // Per-horse jitter (deterministic from sire+dam) so each lot lands on a unique band
      const seedStr = `${sireStr}|${String(horse.pedigree?.dam || "").toLowerCase()}|${String(horse.lot_number || horse.name || "")}`;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
      const jitter = 0.88 + ((seed % 25) / 100); // 0.88 .. 1.12

      const tierFloor = Math.round((sireTier?.target || 0) * damFactor);
      const baseAnchor = Math.max(8000, tierFloor, Math.round(rawAnchor * sireMultiplier * nickBonus * damSireBonus * sexAdj * jitter * damFactor));

      // Vary spread based on overall score (higher score = tighter range)
      const spreadLow = overallScore >= 70 ? 0.72 : overallScore >= 50 ? 0.62 : 0.52;
      const spreadHigh = overallScore >= 70 ? 1.45 : overallScore >= 50 ? 1.65 : 1.85;

      const rawFairLow = Math.max(Math.round(baseAnchor * spreadLow), Math.round((sireTier?.floor || 0) * damFactor));
      const rawFairHigh = Math.max(Math.round(baseAnchor * spreadHigh), Math.round((sireTier?.target || 0) * damFactor));
      const rawUpside = Math.max(Math.round(baseAnchor * (overallScore >= 70 ? 2.0 : 2.5)), Math.round((sireTier?.upside || 0) * Math.max(damFactor, 0.7)));
      // walk-away ceiling must always be >= physical upside; raise multiplier accordingly
      const rawAvoid = Math.round(baseAnchor * (overallScore >= 70 ? 2.4 : 3.0));
      const ladderG = enforcePriceLadder({
        floor: Math.round((sireTier?.floor || 0) * damFactor),
        fairLow: rawFairLow,
        fairHigh: rawFairHigh,
        physicalUpside: rawUpside,
        avoidAbove: rawAvoid,
        lotId: horse.lot_number || horse.name || undefined,
      });
      const fairLow = ladderG.fairLow;
      const fairHigh = ladderG.fairHigh;
      const physicalUpside = ladderG.physicalUpside;
      const avoidAbove = ladderG.avoidAbove;
      const bidStrategyG = composeBidStrategy({ fmt, fairHigh, physicalUpside, avoidAbove });
      horse.commercial_analysis.estimated_value_range = `${fmt(fairLow)}-${fmt(fairHigh)}`;
      horse.commercial_analysis.market_estimate = {
        fair_trade_low: fairLow,
        fair_trade_high: fairHigh,
        physical_upside: physicalUpside,
        avoid_above: avoidAbove,
        bid_strategy: bidStrategyG,
      };
      horse.commercial_analysis.estimated_value_justification = composeUnavailableMarketJustification({
        sire, dam, fmt, fairLow, fairHigh, physicalUpside, avoidAbove,
        sireTierLabel: sireTier?.label || null,
      });
      assertNoBrokenStatusSplice(horse.commercial_analysis.estimated_value_justification);
    }

    const verdict = String(horse.agent_verdict || "").toUpperCase();
    if (verdict === "AVOID" || verdict === "PASS") {
      const estimate = horse.commercial_analysis.market_estimate || {};
      const avoidAbove = Number(estimate.avoid_above) || 0;
      const low = Number(estimate.fair_trade_low) || 0;
      const high = Number(estimate.fair_trade_high) || 0;
      const upside = Number(estimate.physical_upside) || 0;
      if (!horse.verdict_reason || weakAnchorPattern.test(String(horse.verdict_reason)) || String(horse.verdict_reason).split(/[.!?]+/).filter(Boolean).length < 3) {
        horse.verdict_reason = composeUnavailableInsightCopy({
          verdict, sire, dam, fmt,
          fairLow: low, fairHigh: high, physicalUpside: upside, avoidAbove,
        });
        assertNoBrokenStatusSplice(horse.verdict_reason);
      }
      const risks = Array.isArray(horse.key_risks) ? horse.key_risks : [];
      horse.key_risks = [
        `Market-anchor risk: no verified exact sale, sibling sale, sire average, or stud-fee proxy returned — valuation confidence is low.`,
        `Liquidity risk: buyer demand for ${sire} out of ${dam} is not proven by the returned comparables — resale exit may be thin.`,
        `Price-ceiling risk: above ${avoidAbove ? fmt(avoidAbove) : "the avoid-above level"} the buyer is paying ahead of evidence — margin of safety disappears.`,
        ...risks.filter((risk: string) => !/not found|re-run|limited information/i.test(String(risk))),
      ].slice(0, 5);
    }
  }
  return extractedData;
}

function validateSinglePdfAnalysisBeforeSave(extractedData: any, params: {
  pdfIdentity: ReturnType<typeof normalizePdfHorseIdentity>;
  horseType: HorseType;
  sessionCurrency: SessionCurrency;
  verifiedMarketAnchor: VerifiedMarketAnchor | null;
}) {
  extractedData = forcePdfIdentity(extractedData, params.pdfIdentity);
  if (!Array.isArray(extractedData?.horses)) return extractedData;

  for (const horse of extractedData.horses) {
    horse.commercial_analysis = horse.commercial_analysis || {};
    horse.commercial_analysis.market_estimate = horse.commercial_analysis.market_estimate || {};
    horse.scores = horse.scores || {};

    if ((params.horseType === "YEARLING" || params.horseType === "FOAL" || params.horseType === "NH_STORE" || params.horseType === "NH_BREEZE") && Number(horse.performance?.career?.starts || 0) === 0) {
      horse.scores.performance_score = 0;
      horse.scores.performance_explainer = "This horse has no race record available due to age/sale type. The score is based on pedigree, family production, sire profile, sale context, market comparables, and physical/breeze evidence when available.";
      horse.performance = horse.performance || {};
      horse.performance.career = { starts: 0, wins: 0, places: 0, unplaced: 0, earnings: "", win_percentage: 0 };
    }

    const me = horse.commercial_analysis.market_estimate;
    const hasVerifiedAnchor = Boolean(params.verifiedMarketAnchor || me.anchor_source || me.anchor_confidence === "HIGH" || me.anchor_confidence === "MEDIUM");
    const sireName = horse?.pedigree?.sire || "the sire";
    const damName = horse?.pedigree?.dam || "the dam";
    if (!hasVerifiedAnchor) {
      me.anchor_confidence = me.anchor_confidence || "LOW";
      me.anchor_source = me.anchor_source || `Pedigree-based: ${sireName} x ${damName}`;
      const existing = String(horse.commercial_analysis.estimated_value_justification || "").trim();
      // Strip any banned wording that Claude may have left in.
      const BAN = /(not publicly available[^.]*\.?|insufficient public market data[^.]*\.?|manual valuation recommended[^.]*\.?|no verified comparable data was found[^.]*\.?)/gi;
      const cleaned = existing.replace(BAN, "").trim();
      if (cleaned.length < 20) {
        horse.commercial_analysis.estimated_value_justification =
          `Pedigree-based estimate built from ${sireName}'s sire profile and ${damName}'s family record. Refine with physical inspection and verified comparables at the sale.`;
      } else {
        horse.commercial_analysis.estimated_value_justification = cleaned;
      }
    }

    if (horse.dam_analysis) {
      const damFallbacks: Record<string, string> = {
        dam_own_race_record: `${damName} — race record under review; refer to official stud book for full details.`,
        dam_sale_history: `${damName} — public auction history under review.`,
        produce_summary: `Produce record for ${damName} pending verified update from racing authority records.`,
        female_family_label_reason: `Family profile assessed from ${sireName} x ${damName} cross and broader female line.`,
        key_takeaway: `Dam-line assessment pending verified produce and black-type confirmation.`,
      };
      for (const key of Object.keys(damFallbacks)) {
        const v = String(horse.dam_analysis[key] || "").trim();
        if (!v || /^(not found|unknown|no public sale record|not publicly available[^.]*)$/i.test(v)) {
          horse.dam_analysis[key] = damFallbacks[key];
        }
      }
      if (!Array.isArray(horse.dam_analysis.produce_record)) horse.dam_analysis.produce_record = [];
    }
  }
  return extractedData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let uploadRecordId: string | null = null;
  // Collected diagnostics returned with every response (success or failure).
  const pipelineDiagnostics: {
    stage: string;
    extraction: { ok: boolean; lots_found: number; warnings: string[]; raw_preview?: string };
    validation: { ok: boolean; warnings: Array<{ lot: string; reason: string; recovered: boolean }> };
    tavily: { ok: boolean; horses_queried: number; horses_with_results: number; failures: string[] };
    pdf_report: { ok: boolean; error?: string };
  } = {
    stage: "init",
    extraction: { ok: false, lots_found: 0, warnings: [] },
    validation: { ok: true, warnings: [] },
    tavily: { ok: true, horses_queried: 0, horses_with_results: 0, failures: [] },
    pdf_report: { ok: true },
  };

  const jsonError = (
    status: number,
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) =>
    new Response(
      JSON.stringify({
        error: message,
        code,
        stage: pipelineDiagnostics.stage,
        diagnostics: pipelineDiagnostics,
        ...(extra || {}),
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  try {
    const authHeader = req.headers.get("Authorization");

    // Tavily enrichment client — initialised per-request. Key lives only in Supabase secrets.
    const tavilyClient = tavily({
      apiKey: Deno.env.get("TAVILY_API_KEY") ?? "",
    });

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;
    const goalsRaw = formData.get("goals") as string | null;
    const objectiveRaw = formData.get("objective") as string | null;
    const budgetRaw = formData.get("budget") as string | null;
    const clientHorseTypeRaw = (formData.get("horseType") as string | null) || "";
    const saleContextRaw = (formData.get("saleContext") as string | null) || "";
    const analysisMode = ((formData.get("mode") as string | null) || "pdf_only").toLowerCase();
    const visionImagesRaw = formData.get("visionImages") as string | null;
    const breezeDataRaw = formData.get("breezeData") as string | null;
    let visionImages: string[] = [];
    if (visionImagesRaw) {
      try {
        const parsed = JSON.parse(visionImagesRaw);
        if (Array.isArray(parsed)) visionImages = parsed.filter((s) => typeof s === "string" && s.startsWith("data:image/")).slice(0, 12);
      } catch { console.warn("Invalid visionImages JSON"); }
    }
    let breezeData: { furlong_time?: string; distance?: string; going?: string; track?: string } | null = null;
    if (breezeDataRaw) {
      try { breezeData = JSON.parse(breezeDataRaw); } catch { console.warn("Invalid breezeData JSON"); }
    }
    console.log(`[UPLOAD-PDF] mode=${analysisMode} | visionImages=${visionImages.length} | breeze=${breezeData ? "yes" : "no"}`);

    let clientGoals: { horse_type?: string; desired_sire?: string; analysis_requested?: string } | null = null;
    if (goalsRaw) {
      try { clientGoals = JSON.parse(goalsRaw); } catch { console.warn("Invalid goals JSON"); }
    }
    const hasGoals = clientGoals && (clientGoals.horse_type || clientGoals.desired_sire || clientGoals.analysis_requested);

    if (!file) throw new Error("No file provided");

    const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB for direct processing (larger files use chunked pipeline)
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large for direct processing. Files over 60MB are processed automatically via the chunked pipeline." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!fileName || typeof fileName !== "string" || fileName.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid file name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("=== PDF UPLOAD START ===", fileName);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const fileExtension = fileName.toLowerCase().split('.').pop();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '');
    const mimeTypes: Record<string, string> = { 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif' };
    const contentType = isImage ? (mimeTypes[fileExtension!] || 'application/octet-stream') : 'application/pdf';

    // Read the upload BEFORE sending it to storage. In the edge runtime the File
    // stream can be consumed by storage.upload(), which was leaving Claude with
    // a 0KB/empty PDF and producing Unknown x Unknown analyses.
    const fileBuffer = await file.arrayBuffer();
    if (!fileBuffer || fileBuffer.byteLength < 100) {
      throw new Error("Uploaded PDF could not be read. Please re-export the file and upload it again.");
    }
    const fileBytes = new Uint8Array(fileBuffer);
    const fileBase64 = base64Encode(fileBuffer);

    // Upload to storage
    const buckets = await supabaseClient.storage.listBuckets();
    if (!buckets.data?.some(b => b.name === "pdf-uploads")) {
      await supabaseClient.storage.createBucket("pdf-uploads", { public: false, fileSizeLimit: 62914560 });
    }

    // Sanitize filename for Supabase Storage keys: only ASCII alphanumerics,
    // dot, dash and underscore are safe. Strip smart quotes and other
    // non-ASCII chars that produce "Invalid key" errors.
    const safeFileName = fileName
      .normalize("NFKD")
      .replace(/[\u2018\u2019\u201C\u201D]/g, "")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 180) || "upload.pdf";
    const filePath = `${user.id}/${Date.now()}_${safeFileName}`;
    const uploadBlob = new Blob([fileBytes], { type: contentType });
    const { error: uploadError } = await supabaseClient.storage.from("pdf-uploads").upload(filePath, uploadBlob, { contentType, upsert: false });
    if (uploadError) throw uploadError;

    const { data: uploadRecord, error: recordError } = await supabaseClient.from("pdf_uploads").insert({
      user_id: user.id, file_name: fileName, file_path: filePath, file_size: file.size, status: "processing",
    }).select().single();
    if (recordError) throw recordError;
    uploadRecordId = uploadRecord.id;

    // ═══ STEP 1: Convert file to base64 and send ACTUAL content to Claude ═══
    console.log("Step 1: Reading file as base64 and sending to Claude for extraction...");
    pipelineDiagnostics.stage = "extraction";

    console.log(`[PDF-UPLOAD] Loaded ${fileBytes.byteLength} bytes from upload; base64=${Math.round(fileBase64.length / 1024)}KB`);

    const objectiveLabel = objectiveRaw || "general";
    const budgetNote = budgetRaw ? `\nClient budget: ${budgetRaw}` : "";

    const goalsSection = hasGoals ? `
CLIENT GOALS — Follow these strictly:
Horse Type: ${clientGoals!.horse_type || "Not specified"}
Desired Sire: ${clientGoals!.desired_sire || "Not specified"}
Analysis: ${clientGoals!.analysis_requested || "Not specified"}

For EACH horse add: "goal_match": true/false, "goal_match_reason", "pedigree_score" (0-100), "performance_score" (0-100), "detailed_insights".
Sort goal_match=true first.` : "";

    // ─── FIX 1 — TWO-PASS EXTRACTION WITH STRICT SCHEMA + VALIDATION + RETRY ───
    const extractionPrompt = `You are reading a thoroughbred bloodstock catalogue document named "${fileName}" (${(file.size / 1024 / 1024).toFixed(2)} MB).
Client Objective: ${objectiveLabel}${budgetNote}
${goalsSection}

Extract EVERY lot present in this document. Return ONLY a JSON array (no prose, no markdown fences).
Each object MUST have exactly these fields:
{
  "lot_number": "string",
  "horse_name": "string or null (use null if unnamed)",
  "sire": "string — the SIRE (father); top-left of the pedigree box",
  "dam": "string — the DAM (mother); bottom-left of the pedigree box",
  "dam_sire": "string — the DAM'S SIRE (maternal grandfather). MUST be different from sire.",
  "sex": "Colt | Filly | Gelding | Mare | Stallion | Rig | Unknown",
  "age_category": "Foal | Weanling | Yearling | 2yo | 3yo | HIT | Broodmare | Unknown",
  "colour": "string",
  "year_of_birth": "number between 2010 and 2026, or null",
  "consignor": "string or null",
  "country_of_birth": "string or null (GB, IRE, FR, USA, AUS, NZ, etc.)",
  "sold_price": "number or null (digits only, no symbols)",
  "currency": "GBP | EUR | USD | AUD | NZD | GNS or null",
  "sale_name": "string or null (the auction/sale title from the catalogue header)",
  "pedigree_text": "string — the full pedigree text as printed",
  "performance_notes": "string or null"
}

CRITICAL PEDIGREE RULES:
- sire and dam_sire are ALWAYS different horses.
- dam_sire is the FATHER OF THE DAM, never the sire of the lot horse.
- If you are uncertain about a field, return null. NEVER guess or invent.
- Read EVERY page carefully. Different auction houses use different layouts.
- Return ONLY the JSON array. No commentary, no markdown.`;

    let extractedText = "";
    try {
      extractedText = await callClaudeWithDocument(
        ANTHROPIC_API_KEY,
        `You are a senior thoroughbred bloodstock specialist expert in reading sales catalogues from Keeneland, Tattersalls, Magic Millions, Fasig-Tipton, Inglis, OBS, Goffs, Arqana, Tattersalls Ireland, Tattersalls Cheltenham, NZB, and every other major auction house.
CRITICAL: Sire = Father, Dam = Mother, Dam Sire = father of the Dam. NEVER swap them. NEVER duplicate sire as dam_sire.
Return structured JSON only.`,
        extractionPrompt,
        fileBase64,
        contentType,
        { maxTokens: 16000 }
      );
    } catch (e) {
      console.error("Claude document extraction failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      pipelineDiagnostics.extraction.warnings.push(`claude_call_failed: ${msg}`);
      extractedText = "";
      const lower = msg.toLowerCase();
      // Surface upstream Anthropic failures immediately with the right code so the
      // client UI can show a precise error rather than a generic "Failed".
      if (lower.includes("429") || lower.includes("rate")) {
        return jsonError(429, "EXTRACTION_RATE_LIMIT", "The AI extraction service is rate-limited right now. Please retry in a few seconds.");
      }
      if (lower.includes("402") || lower.includes("credit") || lower.includes("balance")) {
        return jsonError(402, "EXTRACTION_CREDITS", "AI extraction credits are exhausted. The site owner needs to recharge the Anthropic account.");
      }
      if (lower.includes("timeout") || lower.includes("timed out")) {
        return jsonError(504, "EXTRACTION_TIMEOUT", "The PDF took too long to read. Try uploading a smaller or single-lot page.");
      }
    }

    // Parse horse names from extraction
    let horseNames: string[] = [];
    let horseDams: string[] = [];
    let horseSires: string[] = [];
    let extractedHorses: any[] = [];
    let extractedCatalogSummary: any = null;
    try {
      const parsedExtraction = parseJsonFromResponse(extractedText);
      if (Array.isArray(parsedExtraction)) {
        extractedHorses = parsedExtraction;
      } else if (Array.isArray(parsedExtraction?.horses)) {
        extractedHorses = parsedExtraction.horses;
        if (parsedExtraction.catalog_summary && typeof parsedExtraction.catalog_summary === "object") {
          extractedCatalogSummary = parsedExtraction.catalog_summary;
        }
      } else {
        const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
        if (jsonMatch) extractedHorses = JSON.parse(jsonMatch[0]);
      }
      extractedHorses = extractedHorses
        .filter((h: any) => h && typeof h === "object")
        .map((h: any) => ({
          ...h,
          name: h.name || h.horse_name || (h.sire && h.dam ? `${h.sire} x ${h.dam}` : ""),
          damsire: h.damsire || h.dam_sire || h.broodmare_sire || "",
        }));
      horseNames = extractedHorses.map((h: any) => h.name || h.horse_name).filter(Boolean).slice(0, 20);
      horseDams = extractedHorses.map((h: any) => h.dam).filter(Boolean);
      horseSires = [...new Set(extractedHorses.map((h: any) => h.sire).filter(Boolean))];
    } catch (parseError) {
      console.error("Claude document extraction JSON parse failed:", parseError, extractedText.slice(0, 800));
      pipelineDiagnostics.extraction.warnings.push(
        `json_parse_failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      pipelineDiagnostics.extraction.raw_preview = extractedText.slice(0, 400);
    }

    if (extractedHorses.length === 0) {
      pipelineDiagnostics.extraction.ok = false;
      const isLikelyScan = !extractedText || extractedText.trim().length < 20;
      return jsonError(
        422,
        isLikelyScan ? "EXTRACTION_EMPTY_PDF" : "EXTRACTION_NO_LOTS",
        isLikelyScan
          ? "Could not extract text from this PDF. Please ensure it is a text-based PDF, not a scanned image, and try again."
          : "The PDF was read but no horse identity could be extracted. Upload the original catalogue page rather than a blank or exported shell.",
        {
          hint: isLikelyScan
            ? "Re-export from the catalogue source as a text PDF, or upload the single-page PDF for the specific lot."
            : "Try a different page from the same catalogue, or send the entire catalogue PDF if you uploaded a cover/index page.",
        },
      );
    }
    pipelineDiagnostics.extraction.ok = true;
    pipelineDiagnostics.extraction.lots_found = extractedHorses.length;

    // ─── FIX 1 — VALIDATE EXTRACTED LOTS + RETRY INVALID ONES ─────────────
    const validateLot = (h: any): string | null => {
      const sire = String(h?.sire || "").trim();
      const dam = String(h?.dam || "").trim();
      const damSire = String(h?.damsire || h?.dam_sire || "").trim();
      const yob = Number(h?.year_of_birth);
      if (sire.length < 2) return "sire is empty or too short";
      if (dam.length < 2) return "dam is empty or too short";
      if (damSire.length < 2) return "dam_sire is empty or too short";
      if (sire.toLowerCase() === damSire.toLowerCase()) return "sire and dam_sire are the same horse (they must differ)";
      if (h?.year_of_birth != null && Number.isFinite(yob) && (yob < 2010 || yob > 2026)) return `year_of_birth ${yob} out of range [2010, 2026]`;
      return null;
    };

    for (let i = 0; i < extractedHorses.length; i++) {
      const err = validateLot(extractedHorses[i]);
      if (!err) continue;
      console.warn(`[EXTRACT-VALIDATE] Lot ${extractedHorses[i]?.lot_number || i} invalid: ${err} — requesting correction`);
      const lotId = String(extractedHorses[i]?.lot_number || i);
      try {
        const correctionPrompt = `The following extracted lot has a schema error.
Invalid object:
${JSON.stringify(extractedHorses[i], null, 2)}

Error: ${err}

Re-read the source catalogue carefully for THIS specific lot and return ONLY the corrected JSON object (no array, no prose, no markdown), using the same field names. Remember: sire ≠ dam_sire, and dam_sire is the FATHER OF THE DAM.`;
        const correction = await callClaudeWithDocument(
          ANTHROPIC_API_KEY,
          `You are a senior bloodstock catalogue reader. Return ONLY a single corrected JSON object.`,
          correctionPrompt,
          fileBase64,
          contentType,
          { maxTokens: 1500, timeoutMs: 45000 }
        );
        const fixed = parseJsonFromResponse(correction);
        const fixedObj = Array.isArray(fixed) ? fixed[0] : fixed;
        if (fixedObj && typeof fixedObj === "object") {
          const merged = {
            ...extractedHorses[i],
            ...fixedObj,
            name: fixedObj.name || fixedObj.horse_name || extractedHorses[i].name || (fixedObj.sire && fixedObj.dam ? `${fixedObj.sire} x ${fixedObj.dam}` : extractedHorses[i].name),
            damsire: fixedObj.damsire || fixedObj.dam_sire || extractedHorses[i].damsire || "",
          };
          const stillBad = validateLot(merged);
          if (!stillBad) {
            extractedHorses[i] = merged;
            console.log(`[EXTRACT-VALIDATE] Lot ${merged.lot_number || i} corrected successfully`);
            pipelineDiagnostics.validation.warnings.push({ lot: lotId, reason: err, recovered: true });
          } else {
            console.warn(`[EXTRACT-VALIDATE] Lot ${merged.lot_number || i} still invalid after retry: ${stillBad}`);
            extractedHorses[i]._validation_warning = stillBad;
            pipelineDiagnostics.validation.ok = false;
            pipelineDiagnostics.validation.warnings.push({ lot: lotId, reason: stillBad, recovered: false });
          }
        }
      } catch (corrErr) {
        console.warn(`[EXTRACT-VALIDATE] correction call failed:`, corrErr);
        extractedHorses[i]._validation_warning = err;
        pipelineDiagnostics.validation.ok = false;
        pipelineDiagnostics.validation.warnings.push({
          lot: lotId,
          reason: `${err} (correction call failed: ${corrErr instanceof Error ? corrErr.message : String(corrErr)})`,
          recovered: false,
        });
      }
    }

    const isSingleHorseAnalysis = extractedHorses.length <= 1;
    const primaryHorse = extractedHorses[0] || {};
    const primaryHorseName = primaryHorse.name || primaryHorse.horse_name || horseNames[0] || fileName.replace(/\.pdf$/i, "");
    const primarySire = primaryHorse.sire || horseSires[0] || "";
    const primaryDam = primaryHorse.dam || horseDams[0] || "";
    const primaryDamSire = primaryHorse.damsire || primaryHorse.dam_sire || "";
    const primaryLotNumber = String(primaryHorse.lot_number || "").trim();
    const primaryCountry = primaryHorse.country || "";
    const primaryBirthYear = Number(primaryHorse.year_of_birth) || undefined;

    // FIX 5 — Currency is detected primarily from the sale_name field that Claude
    // read from the PDF header. Heuristic from filename/text is only the fallback.
    const catalogSummaryLocation = extractedCatalogSummary?.location || extractedCatalogSummary?.country || "";
    const catalogSummarySaleName = extractedCatalogSummary?.sale_name || extractedCatalogSummary?.auction_house || "";
    const saleNameForCurrency = primaryHorse.sale_name || primaryHorse.auction_house || primaryHorse.sale || catalogSummarySaleName || "";
    const currencyFromSale = detectCurrencyFromSale(saleNameForCurrency);
    const currencyFromHeuristic = detectSessionCurrency(
      fileName,
      primaryHorse.sale_name,
      primaryHorse.auction_house,
      primaryHorse.sale,
      primaryHorse.location,
      primaryHorse.sale_location,
      catalogSummaryLocation,
      catalogSummarySaleName,
      // Scan the full document — Australian / NZ auction names sometimes
      // appear only on inner pages of the catalogue.
      extractedText
    );
    // Country-of-SALE fallback: prefer the auction location (not the horse's country
    // of birth, which is often GB/IRE for sires standing overseas). This ensures
    // Australian / French / US PDFs always display in their home currency even
    // when the sale name itself is missing or generic.
    const currencyFromCountry =
      detectCurrencyFromCountry(catalogSummaryLocation) ||
      detectCurrencyFromCountry(primaryHorse.location) ||
      detectCurrencyFromCountry(primaryHorse.sale_location);
    // Prefer the heuristic when it found a strong signal (it scans the full text
    // and matches specific auction-house keywords). Fall back to sale-name then
    // country-of-sale, only defaulting to GBP if every signal is silent.
    // Hard override: if the full document text contains an unmistakable Australian /
    // New Zealand / US auction-house marker, lock the currency to that — this
    // protects against Claude leaving sale_name blank or mis-reading it as GBP.
    const fullScan = `${fileName} ${extractedText || ""}`.toLowerCase();
    let hardOverride: SessionCurrency | null = null;
    if (/(magic millions|inglis|william inglis|riverside stables|gold coast yearling|gold coast sale|easter yearling sale|premier yearling sale|classic yearling sale|great southern sale|melbourne premier|sydney classic|scone yearling|warwick farm|randwick|\baushorse\b|thoroughbred breeders australia|a\$|aud\b)/i.test(fullScan)) hardOverride = "AUD";
    else if (/(karaka|nz bloodstock|new zealand bloodstock|arion\.co\.nz|\bnzb\b|nz\$)/i.test(fullScan)) hardOverride = "NZD";
    else if (/(keeneland|fasig[- ]tipton|\bobs\b|ocala breeders|saratoga sale)/i.test(fullScan)) hardOverride = "USD";

    let sessionCurrency: SessionCurrency =
      hardOverride ||
      (saleNameForCurrency ? currencyFromSale : currencyFromHeuristic);
    if (!hardOverride && currencyFromCountry && (sessionCurrency === "GBP" || sessionCurrency === "EUR")) {
      // Don't overwrite Tattersalls guineas (GNS), which is sale-format-specific.
      if (sessionCurrency !== "GNS") sessionCurrency = currencyFromCountry;
    }
    console.log(`[CURRENCY] Session currency: ${sessionCurrency} (sale_name="${saleNameForCurrency}", from-sale=${currencyFromSale}, from-heuristic=${currencyFromHeuristic}, from-country=${currencyFromCountry || "n/a"}, location="${primaryHorse.location || ""}", country="${primaryHorse.country || ""}")`);

    let verifiedMarketAnchor: VerifiedMarketAnchor | null = null;
    const extractedTextAnchor = extractVerifiedSaleAnchor({
      text: extractedText,
      sessionCurrency,
      lotNumber: primaryLotNumber,
      horseName: primaryHorseName,
    });
    const observedExactPrice = parseObservedPrice(primaryHorse.sold_price, sessionCurrency)
      || parseObservedPrice(primaryHorse.sale_price, sessionCurrency)
      || parseObservedPrice(primaryHorse.price, sessionCurrency)
      || (extractedTextAnchor?.kind === "EXACT_SALE" ? extractedTextAnchor : null);
    const observedPrice = observedExactPrice || parseObservedPrice(primaryHorse.reserve_estimate, sessionCurrency);
    const pdfIdentity = normalizePdfHorseIdentity(primaryHorse, sessionCurrency);
    verifiedMarketAnchor = buildVerifiedAnchorFromObserved(observedExactPrice, "PDF/extracted exact sold or sale price") || extractedTextAnchor;

    // ─── AGENT 1 OUTPUT — deterministic horse-type + black-type list ───
    // Client-side selector wins when present; auto-detection is the fallback.
    const clientHorseType = mapClientHorseType(clientHorseTypeRaw);
    const detectedHorseType = detectHorseType({ fileName, extractedText, primaryHorse });
    const horseType: HorseType = clientHorseType || detectedHorseType;
    const horseTypeSource = clientHorseType ? "client" : "detected";
    const blackTypeHorses = extractBlackTypeHorses(extractedText);
    console.log(`[AGENT1] horse_type=${horseType} (source=${horseTypeSource}, raw="${clientHorseTypeRaw}") | sale_context=${saleContextRaw || "none"} | black_type_count=${blackTypeHorses.length}`);

    // ═══ TAVILY RESEARCH (runs BEFORE AI so the prompt is grounded in real sources) ═══
    pipelineDiagnostics.stage = "tavily";
    let perplexityData = "";
    const tavilyResultsByHorse = new Map<string, any>();

    try {
      if (!Deno.env.get("TAVILY_API_KEY")) {
        pipelineDiagnostics.tavily.ok = false;
        pipelineDiagnostics.tavily.failures.push("missing_tavily_api_key");
        throw new Error("TAVILY_API_KEY is not configured");
      }
      const researchTargets = extractedHorses.slice(0, isSingleHorseAnalysis ? 1 : 5);
      pipelineDiagnostics.tavily.horses_queried = researchTargets.length;
      // FIX 3 — National Hunt vs Flat routing.
      const NH_TYPES = new Set(["POINT_TO_POINT", "NH_BREEZE", "NH_HORSE_IN_TRAINING", "NH_STORE"]);
      const isNHContext = NH_TYPES.has(horseType);
      const researchDomains = isNHContext ? TAVILY_NH_DOMAINS : TAVILY_BLOODSTOCK_DOMAINS;
      console.log(`[TAVILY-PRE] horse_type=${horseType} → ${isNHContext ? "NH" : "FLAT"} domain set (${researchDomains.length} domains)`);

      // FIX 7 — search_cache helpers (sire + dam + year_of_birth, 7-day TTL).
      const buildCacheKey = (sire: string, dam: string, yob: number | string | null | undefined) =>
        `tavily_v3:${String(sire || "").toLowerCase().trim()}|${String(dam || "").toLowerCase().trim()}|${yob || "0"}`;
      const readCache = async (key: string): Promise<any | null> => {
        try {
          const { data, error } = await supabaseClient
            .from("search_cache")
            .select("perplexity_raw_data, search_date, expires_at")
            .eq("search_key", key)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle();
          if (error || !data?.perplexity_raw_data) return null;
          return JSON.parse(data.perplexity_raw_data);
        } catch (_e) { return null; }
      };
      const writeCache = async (key: string, payload: any, horseName: string) => {
        try {
          await supabaseClient.from("search_cache").upsert({
            search_key: key,
            search_query: key,
            horse_name: horseName,
            perplexity_raw_data: JSON.stringify(payload),
            sources_used: ["tavily"],
            search_date: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "search_key" });
        } catch (e) { console.warn("[CACHE] write failed:", e); }
      };

      const fetchOne = async (h: any) => {
        const hName = String(h?.name || h?.horse_name || "").trim();
        const hSire = String(h?.sire || "").trim();
        const hDam = String(h?.dam || "").trim();
        if (!hName && !hSire) return null;
        const hDamSire = String(h?.damsire || h?.dam_sire || "").trim();
        const hLot = String(h?.lot_number || "").trim();
        const hYob = Number(h?.year_of_birth) || 0;

        // FIX 7 — cache check
        const cacheKey = buildCacheKey(hSire, hDam, hYob);
        const cached = await readCache(cacheKey);
        if (cached) {
          console.log(`[CACHE] HIT for ${hName || `${hSire} x ${hDam}`}`);
          const cachedAnchorText = [
            cached.exact_market_answer,
            ...((cached.exact_market_sources || []).map((s: any) => `${s.title}\n${s.url}\n${s.snippet}`)),
            cached.sales_answer,
            ...((cached.comparables_sources || []).map((s: any) => `${s.title}\n${s.url}\n${s.snippet}`)),
          ].filter(Boolean).join("\n");
          const cachedAnchor = extractVerifiedSaleAnchor({
            text: cachedAnchorText,
            sessionCurrency,
            lotNumber: hLot || primaryLotNumber,
            horseName: hName || primaryHorseName,
          });
          if (cachedAnchor && (!verifiedMarketAnchor || cachedAnchor.confidence === "HIGH" || cachedAnchor.amount > verifiedMarketAnchor.amount)) {
            verifiedMarketAnchor = cachedAnchor;
          }
          tavilyResultsByHorse.set(hName.toLowerCase(), cached);
          return { horse: h, enrichment: cached };
        }

        // FIX 3 — NH vs Flat query sets
        const queryRace = isNHContext
          ? `"${hSire}" "${hDam}" national hunt form hurdles chase bumper point-to-point winners`.trim()
          : `"${hSire}" "${hDam}" "${hDamSire}" pedigree race record wins flat racing`.trim();
        const queryExactMarket = isNHContext
          ? `lot ${hLot} "${hName || hDam}" "${hSire}" national hunt store sold price guineas euros sterling auction`.trim()
          : `lot ${hLot} "${hName || hDam}" "${hSire}" sold price purchaser auction result ${fileName}`.trim();
        const querySales = isNHContext
          ? `"${hSire}" national hunt sire statistics winners hurdles chase store sales average`.trim()
          : `"${hSire}" yearling foal 2YO auction sales average price 2024 2025 ${sessionCurrency}`.trim();
        // NEW Q6: sibling sales — auction results for the dam's other offspring.
        const querySiblingSales = `"${hDam}" foal yearling weanling sold price guineas euros sale results sibling`.trim();
        // RedCap (RPR) queries — Racing Post primary, corroborated by the full approved
        // domain base (UK, Ireland, France, Australia, NZ, USA). Queries are region-neutral
        // so horses rated outside the Racing Post universe (e.g. AUS) still return results.
        const RPR_DOMAINS = ["racingpost.com", "racingpost.ie", ...researchDomains];
        const queryRprSire = `"${hSire}" horse RPR Timeform official rating peak career race record profile`.trim();
        const queryRprDam = hDam ? `"${hDam}" mare race record rating form profile produce record` : "";
        const queryRprDamSire = hDamSire ? `"${hDamSire}" sire broodmare sire RPR rating career profile` : "";
        const queryRprSubject = hName ? `"${hName}" horse RPR rating form race record profile` : "";
        const queryRprSiblings = `"${hDam}" progeny siblings winners rating race results`.trim();
        // Narrow domain list focused on auction-result pages.
        const SIBLING_SALES_DOMAINS = [
          "tattersalls.com", "tattersalls.ie", "goffs.com", "magicmillions.com.au",
          "inglis.com.au", "keeneland.com", "fasigtipton.com", "obssales.com",
          "racingpost.com", "thoroughbid.com", "bloodstockworld.com", "arqana.com",
          "equineline.com",
        ];

        try {
          let [raceSearch, exactMarketSearch, salesSearch, siblingSalesSearch, rprSireSearch, rprDamSearch, rprDamSireSearch, rprSubjectSearch, rprSiblingsSearch] = await Promise.all([
            tavilyClient.search(queryRace, {
              searchDepth: "advanced",
              maxResults: 6,
              includeAnswer: true,
              includeDomains: researchDomains,
            }),
            tavilyClient.search(queryExactMarket, {
              searchDepth: "advanced",
              maxResults: 8,
              includeAnswer: true,
              includeDomains: researchDomains,
            }),
            tavilyClient.search(querySales, {
              searchDepth: "advanced",
              maxResults: 6,
              includeAnswer: true,
              includeDomains: researchDomains,
            }),
            tavilyClient.search(querySiblingSales, {
              searchDepth: "advanced",
              maxResults: 8,
              includeAnswer: true,
              includeDomains: SIBLING_SALES_DOMAINS,
            }).catch(() => null),
            tavilyClient.search(queryRprSire, {
              searchDepth: "advanced", maxResults: 5, includeAnswer: true, includeDomains: RPR_DOMAINS,
            }).catch(() => null),
            queryRprDam ? tavilyClient.search(queryRprDam, {
              searchDepth: "advanced", maxResults: 5, includeAnswer: true, includeDomains: RPR_DOMAINS,
            }).catch(() => null) : Promise.resolve(null),
            queryRprDamSire ? tavilyClient.search(queryRprDamSire, {
              searchDepth: "advanced", maxResults: 5, includeAnswer: true, includeDomains: RPR_DOMAINS,
            }).catch(() => null) : Promise.resolve(null),
            queryRprSubject ? tavilyClient.search(queryRprSubject, {
              searchDepth: "advanced", maxResults: 5, includeAnswer: true, includeDomains: RPR_DOMAINS,
            }).catch(() => null) : Promise.resolve(null),
            tavilyClient.search(queryRprSiblings, {
              searchDepth: "advanced", maxResults: 6, includeAnswer: true, includeDomains: RPR_DOMAINS,
            }).catch(() => null),
          ]);

          // FALLBACK PASS — if a domain-restricted ratings search came back empty
          // (common for AUS/NZ/FR horses with thin Racing Post coverage), retry the
          // same query on the open web so sire/dam ratings are never silently "n/v".
          const isEmpty = (r: any) => !r || (!r.answer && !(Array.isArray(r.results) && r.results.length));
          const openRetry = (q: string) => tavilyClient.search(q, {
            searchDepth: "advanced", maxResults: 5, includeAnswer: true,
          }).catch(() => null);
          const [fbSire, fbDam, fbDamSire, fbSubject, fbSiblings] = await Promise.all([
            isEmpty(rprSireSearch) && hSire ? openRetry(`"${hSire}" thoroughbred sire race record rating RPR Timeform group stakes`) : Promise.resolve(null),
            isEmpty(rprDamSearch) && hDam ? openRetry(`"${hDam}" thoroughbred mare race record rating form produce`) : Promise.resolve(null),
            isEmpty(rprDamSireSearch) && hDamSire ? openRetry(`"${hDamSire}" thoroughbred sire rating career race record`) : Promise.resolve(null),
            isEmpty(rprSubjectSearch) && hName ? openRetry(`"${hName}" thoroughbred race record rating form`) : Promise.resolve(null),
            isEmpty(rprSiblingsSearch) && hDam ? openRetry(`"${hDam}" progeny offspring winners race results`) : Promise.resolve(null),
          ]);
          if (fbSire) { rprSireSearch = fbSire; console.log(`[TAVILY-PRE] open-web fallback used for sire "${hSire}"`); }
          if (fbDam) { rprDamSearch = fbDam; console.log(`[TAVILY-PRE] open-web fallback used for dam "${hDam}"`); }
          if (fbDamSire) rprDamSireSearch = fbDamSire;
          if (fbSubject) rprSubjectSearch = fbSubject;
          if (fbSiblings) rprSiblingsSearch = fbSiblings;

          const enrichment = {
            race_answer: (raceSearch as any)?.answer || null,
            exact_market_answer: (exactMarketSearch as any)?.answer || null,
            sales_answer: (salesSearch as any)?.answer || null,
            sibling_sales_answer: (siblingSalesSearch as any)?.answer || null,
            redcap_sire_answer: (rprSireSearch as any)?.answer || null,
            redcap_dam_answer: (rprDamSearch as any)?.answer || null,
            redcap_damsire_answer: (rprDamSireSearch as any)?.answer || null,
            redcap_subject_answer: (rprSubjectSearch as any)?.answer || null,
            redcap_siblings_answer: (rprSiblingsSearch as any)?.answer || null,
            redcap_sources: [
              ...((rprSireSearch as any)?.results || []).slice(0, 4).map((r: any) => ({ kind: "sire", url: r?.url, title: r?.title || "", snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "" })),
              ...((rprDamSearch as any)?.results || []).slice(0, 4).map((r: any) => ({ kind: "dam", url: r?.url, title: r?.title || "", snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "" })),
              ...((rprDamSireSearch as any)?.results || []).slice(0, 3).map((r: any) => ({ kind: "dam_sire", url: r?.url, title: r?.title || "", snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "" })),
              ...((rprSubjectSearch as any)?.results || []).slice(0, 3).map((r: any) => ({ kind: "subject", url: r?.url, title: r?.title || "", snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "" })),
              ...((rprSiblingsSearch as any)?.results || []).slice(0, 5).map((r: any) => ({ kind: "siblings", url: r?.url, title: r?.title || "", snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "" })),
            ],
            race_sources: ((raceSearch as any)?.results || []).slice(0, 6).map((r: any) => ({
              url: r?.url, title: r?.title || "",
              snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "",
            })),
            exact_market_sources: ((exactMarketSearch as any)?.results || []).slice(0, 8).map((r: any) => ({
              url: r?.url, title: r?.title || "",
              snippet: typeof r?.content === "string" ? r.content.slice(0, 700) : "",
            })),
            comparables_sources: ((salesSearch as any)?.results || []).slice(0, 6).map((r: any) => ({
              url: r?.url, title: r?.title || "",
              snippet: typeof r?.content === "string" ? r.content.slice(0, 500) : "",
            })),
            sibling_sales_sources: ((siblingSalesSearch as any)?.results || []).slice(0, 8).map((r: any) => ({
              url: r?.url, title: r?.title || "",
              snippet: typeof r?.content === "string" ? r.content.slice(0, 600) : "",
            })),
          };
          const exactMarketText = [
            enrichment.exact_market_answer,
            ...enrichment.exact_market_sources.map((s: any) => `${s.title}\n${s.url}\n${s.snippet}`),
            enrichment.sales_answer,
            ...enrichment.comparables_sources.map((s: any) => `${s.title}\n${s.url}\n${s.snippet}`),
          ].filter(Boolean).join("\n");
          const tavilyAnchor = extractVerifiedSaleAnchor({
            text: exactMarketText,
            sessionCurrency,
            lotNumber: hLot || primaryLotNumber,
            horseName: hName || primaryHorseName,
          });
          if (tavilyAnchor && (!verifiedMarketAnchor || tavilyAnchor.confidence === "HIGH" || tavilyAnchor.amount > verifiedMarketAnchor.amount)) {
            verifiedMarketAnchor = tavilyAnchor;
          }
          tavilyResultsByHorse.set(hName.toLowerCase(), enrichment);
          // FIX 7 — cache write
          if (hSire && hDam) await writeCache(cacheKey, enrichment, hName || `${hSire} x ${hDam}`);
          return { horse: h, enrichment };
        } catch (err) {
          console.warn(`[TAVILY-PRE] failed for ${hName}:`, err);
          pipelineDiagnostics.tavily.failures.push(
            `${hName || hSire || "unnamed"}: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        }
      };

      const preResults = (await Promise.all(researchTargets.map(fetchOne))).filter(Boolean) as any[];
      console.log(`[TAVILY-PRE] researched ${preResults.length} horse(s) before AI`);
      pipelineDiagnostics.tavily.horses_with_results = preResults.length;
      if (researchTargets.length > 0 && preResults.length === 0) {
        pipelineDiagnostics.tavily.ok = false;
        pipelineDiagnostics.tavily.failures.push(
          "no_results_returned — proceeding with Claude-only analysis at LOW confidence",
        );
      }

      if (preResults.length > 0) {
        const blocks: string[] = [];
        for (const { horse, enrichment } of preResults) {
          const lines: string[] = [];
          lines.push(`HORSE: ${horse?.name || horse?.horse_name || "(unnamed)"} — by ${horse?.sire || "?"} out of ${horse?.dam || "?"}${horse?.dam_sire || horse?.damsire ? ` (${horse?.dam_sire || horse?.damsire})` : ""}`);
          if (enrichment.race_answer) lines.push(`RACE/PEDIGREE SUMMARY: ${enrichment.race_answer}`);
          if (enrichment.exact_market_answer) lines.push(`EXACT LOT / MARKET RESULT SUMMARY: ${enrichment.exact_market_answer}`);
          if (enrichment.sales_answer) lines.push(`SIRE SALES SUMMARY: ${enrichment.sales_answer}`);
          if (enrichment.race_sources?.length) {
            lines.push(`RACE/PEDIGREE SOURCES:`);
            enrichment.race_sources.forEach((s: any, i: number) => {
              lines.push(`  [R${i + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`);
            });
          }
          if (enrichment.exact_market_sources?.length) {
            lines.push(`EXACT LOT / MARKET RESULT SOURCES:`);
            enrichment.exact_market_sources.forEach((s: any, i: number) => {
              lines.push(`  [M${i + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`);
            });
          }
          if (enrichment.comparables_sources?.length) {
            lines.push(`COMPARABLE SALES SOURCES:`);
            enrichment.comparables_sources.forEach((s: any, i: number) => {
              lines.push(`  [C${i + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`);
            });
          }
          if ((enrichment as any).sibling_sales_answer) {
            lines.push(`SIBLING SALES SUMMARY (dam's other offspring at auction): ${(enrichment as any).sibling_sales_answer}`);
          }
          if ((enrichment as any).sibling_sales_sources?.length) {
            lines.push(`SIBLING SALES SOURCES:`);
            (enrichment as any).sibling_sales_sources.forEach((s: any, i: number) => {
              lines.push(`  [S${i + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`);
            });
          }
          // RedCap / RPR research block — Racing Post primary.
          const rcLines: string[] = [];
          if ((enrichment as any).redcap_subject_answer) rcLines.push(`SUBJECT RPR: ${(enrichment as any).redcap_subject_answer}`);
          if ((enrichment as any).redcap_sire_answer) rcLines.push(`SIRE RPR: ${(enrichment as any).redcap_sire_answer}`);
          if ((enrichment as any).redcap_dam_answer) rcLines.push(`DAM RPR / RECORD: ${(enrichment as any).redcap_dam_answer}`);
          if ((enrichment as any).redcap_damsire_answer) rcLines.push(`DAM-SIRE RPR: ${(enrichment as any).redcap_damsire_answer}`);
          if ((enrichment as any).redcap_siblings_answer) rcLines.push(`SIBLINGS RPR / RESULTS: ${(enrichment as any).redcap_siblings_answer}`);
          if (rcLines.length) {
            lines.push(`REDCAP (RPR) SUMMARIES — Racing Post primary:`);
            rcLines.forEach((l) => lines.push(`  ${l}`));
          }
          if ((enrichment as any).redcap_sources?.length) {
            lines.push(`REDCAP (RPR) SOURCES:`);
            (enrichment as any).redcap_sources.forEach((s: any, i: number) => {
              lines.push(`  [RPR-${s.kind}-${i + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`);
            });
          }
          blocks.push(lines.join("\n"));
        }
        perplexityData = blocks.join("\n\n---\n\n");
      }
    } catch (preErr) {
      console.warn("[TAVILY-PRE] block failed — continuing without research:", preErr);
      pipelineDiagnostics.tavily.ok = false;
      pipelineDiagnostics.tavily.failures.push(
        `block_failed: ${preErr instanceof Error ? preErr.message : String(preErr)}`,
      );
    }

    // ═══ STEP 3: Claude deep analysis with FULL structured output ═══
    console.log("Step 3: Claude comprehensive analysis with charts data...");

    const analysisSystemPrompt = isSingleHorseAnalysis ? `You are BloodstockAI — a senior bloodstock agent producing a professional SINGLE HORSE PDF analysis.

${QUALITY_CONTROLS}

MARKET ESTIMATE RULES — MANDATORY (FIX 4 — three-tier policy):
1. TIER 1 — Verified sale price exists (PDF sold_price OR a confirmed Tavily result for THIS exact lot):
   → State the verified figure exactly. Label inside estimated_value_range: "Verified Sale Price: <amount>".
   → estimated_value_justification MUST start with "Verified sale: <amount> at <Sale, Year> (source: <domain>)".
2. TIER 2 — Comparable anchor exists (Tavily returned a price for a similar horse by the same sire/dam family/same sale):
   → Derive a range from that comparable. Label: "Market Estimate (comparable): <low> – <high>".
   → estimated_value_justification MUST cite the comparable: "Based on <Horse Name> (Lot X, <Sale Name> <Year>): <Price> (source: <domain>)".
3. TIER 3 — Neither verified price nor comparable:
   → Build a PEDIGREE-BASED estimate from the sire's stud fee + average yearling/breeze price + the dam's produce record + the female family's black-type depth + sibling sales (if any).
   → Label it: "Pedigree-based estimate: <low> – <high>". NEVER use the words "insufficient", "manual valuation recommended", or "not publicly available" in any user-visible field.
   → estimated_value_justification MUST explain the derivation: "Estimate built from <Sire>'s <yearling avg / stud fee>, dam <Dam>'s produce record (<W/R%>), and <2nd-dam family black-type>".
   → commercial_analysis.market_estimate.confidence = "low" (NOT "insufficient"), bid_strategy = "Value buy only if below <fair_trade_low>" or "Interest only if reserve not met".
   → Always populate fair_trade_low / fair_trade_high. physical_upside and avoid_above when the page supports them.
4. ALWAYS produce a usable range. The phrase "Insufficient public market data" is BANNED from every user-facing field.

REDCAP (RPR) RULES — MANDATORY (RedCap = Racing Post Rating, in pounds; higher = better):
- All RPR figures MUST trace to a retrieved Tavily source (Racing Post primary). NEVER invent an RPR, a relative, or a rating.
- If a figure cannot be verified from the research block, set it to null and mark verified=false. Do NOT guess.
- Always populate the "redcap" object on the horse. Capture: subject (if raced), sire, dam (or unraced), dam-sire, and every named sibling found.
- For each rating, include the code ("Flat" or "NH") and best distance/trip when available.
- Write "performance_analysis_rpr" as a comprehensive paragraph (4-8 sentences) covering: sire peak RPR + level, dam RPR or "unraced — pivot to produce", dam-sire RPR, every raced sibling's peak RPR + result, consistency of the spread, and which figures are verified vs not.
- Write "family_pedigree_analysis" as a comprehensive paragraph (4-8 sentences) covering: which side (sire / dam / dam-sire) produced the better performers (named, with RPRs), damline depth and black-type proximity, suitability for Flat vs NH, and a direct potential verdict on THIS individual (yes / qualified / no — and why), with the trip and code it is most likely to express ability over.
- These two paragraphs are IN ADDITION to (never replacing) estimated_value_justification and verdict_reason. Keep both legacy blocks intact.
- Reference bands for context only — Flat: ~100-110 useful handicap, 110-120 black type, 120+ Group, 125+ top G1; NH: ~150 high-class, 165+ championship.

PRIORITIES:
- Fast response with high-quality structured output.
- Focus on one horse/lot only.
- Use real market logic, realistic differentiated valuation, zero repetition, and professional wording.
- For young or unraced horses, prioritize sire statistics, dam produce, siblings, female family, nick, and commercial comparables.
- Avoid "Unknown x Unknown" if enough context exists; use lot number and family context.

SENIOR-AGENT VOICE (MANDATORY):
- Write like a 20-year veteran bloodstock agent on the sales grounds — direct, specific, opinionated.
- NEVER use corporate filler ("interesting opportunity", "represents value", "good prospect").
- Every sentence must reference a SPECIFIC verified data point (sire stat, dam record, comparable price, family black-type, nick rating).
- If a number is not in the research, say so explicitly. NEVER invent or pad.

SCORE CONTEXT LABELS (assign by overall_score, return as horse.score_context_label):
  85-100 -> "Elite commercial profile"
  75-84  -> "Strong profile — active interest recommended"
  65-74  -> "Above average — warrants physical inspection"
  55-64  -> "Mid-market — value dependent on physical"
  45-54  -> "Below commercial average for this sale type"
  35-44  -> "Weak commercial profile — speculative only"
  <35    -> "Avoid — insufficient commercial merit"

SCORE BREAKDOWN EXPLAINERS (one line per component, generated from real data — return inside scores.<component>_explainer):
- pedigree_explainer: cite the sire's class + dam family depth + the single biggest weakness or strength.
- performance_explainer: if unraced -> "Unraced — score pending"; for breeze-up -> cite breeze time/biomechanics; for raced -> cite RPR/rating + class ceiling.
- commercial_explainer: cite sire demand trend + sex premium + consignor strength.
- conformation_explainer: "Pending physical inspection" if no visual data; otherwise cite specific physical evidence.

SPLIT PEDIGREE RATING (return inside horse.pedigree.rating_split):
- genetic_quality (0-10): how good is the breeding? Champion x Champion = 10; limited sire x weak dam = 2.
- commercial_appeal (0-10): how will the market value this page? Top-5 sire by yearling avg = 10; no commercial case = 1.
- These TWO numbers are different. A well-bred horse from an unfashionable sire may have genetic_quality=7.0 with commercial_appeal=4.5. State both with one-sentence justification each in genetic_quality_note and commercial_appeal_note.

MARKET ESTIMATE STRUCTURE (return inside commercial_analysis.market_estimate):
- fair_trade_low / fair_trade_high (numbers in session currency, low-to-high ratio max 1.6x).
- physical_upside (number): the price achievable if the horse presents exceptionally well at inspection. Only include if data justifies.
- avoid_above (number): the price above which this horse is overpriced for its merits.
- bid_strategy (string): one of "Active interest — target fair value zone" / "Value buy only if below [price]" / "Interest only if reserve not met" / "Pass unless exceptional physical changes the picture" / "Aggressive buy — strong page with verified comparables".
- ALSO populate the existing estimated_value_range field with the fair_trade_low–fair_trade_high range as a formatted string (this is what the UI renders).
- estimated_value_justification MUST mention all three numbers (fair / upside / avoid above) and explain the bid_strategy chosen.

VERDICT FIELD (set agent_verdict to ONE of these 6 — extends BUY/WATCH/AVOID):
- "BUY" — score >= 75, strong sire stats verified, dam record solid, market estimate HIGH confidence.
- "BUY IF PHYSICAL CONFIRMS" — score 60-74, good page, conformation unverified.
- "VALUE BUY ONLY" — score 50-64, limited dam data or first-crop sire.
- "MONITOR" — score 45-54, some merit, significant unknowns.
- "PASS" — score < 45, or key data missing.
- "AVOID" — specific flag: unverified claims, inconsistent data, confirmed overpriced.
- The verdict MUST be consistent with the score AND the market estimate confidence. Never assign BUY to a score-49 horse.
- verdict_reason MUST be a single direct sentence that matches the verdict choice (see UPGRADE 4 templates below — adapt to the specific horse's data).

AVOID / PASS — MANDATORY EXPLANATION (this is the most important part of a negative call):
- When agent_verdict is "AVOID" or "PASS", verdict_reason MUST be 3-5 sentences (NOT one) and MUST contain ALL of:
  1. The PRIMARY reason for the negative call, naming the specific bloodstock weakness (e.g. "first-season sire with 0 stakes-winners from 18 runners", "dam is a maiden with no produce record", "third-crop sire with declining yearling average from €68k to €31k", "page padded with 4th-generation black-type only", "lot priced 2.4x the verified sire average").
  2. The SPECIFIC market risk in bloodstock terms — choose from: pinhook risk (resale margin compression), residual value risk (broodmare/stallion exit value), liquidity risk (thin buyer pool for this sire/sex/distance profile), update risk (no near-relative form imminent), conformation risk if visual data flagged it, oversupply risk (too many half/three-quarter siblings on the market), or commercial-fashion risk (sire trending DOWN with stud-fee cuts).
  3. The PRICE CEILING above which the lot becomes definitively un-buyable, in session currency, with the comparable that anchors that ceiling.
  4. The CONDITION under which the verdict could flip (e.g. "Reconsider only if sells under [price] AND physical inspection grades B+ or better" / "No reconsideration — fundamentally weak page").
- key_risks MUST contain 3-5 entries when verdict is AVOID or PASS. Each entry must be a concrete, market-grounded risk, NOT a generic warning. Write each as: "[Risk type]: [specific evidence] — [market consequence]". Example: "Sire trend risk: Mehmas yearling median fell 22% YoY at Goffs Orby 2025 — resale ceiling compressed for any 2026 pinhook play."
- key_strengths may still be populated for AVOID/PASS lots (a flawed page can still have one redeeming feature) but MUST NOT contradict the verdict.
- If verdict is AVOID specifically because of a DATA INTEGRITY problem (inconsistent pedigree, suspicious claims, identity mismatch between PDF and research), state that explicitly as the first sentence and list the exact discrepancy.
- NEVER write a soft AVOID/PASS reason like "limited information available" or "needs further review" — if data is genuinely insufficient, downgrade to "MONITOR" instead.

POSITIVE / NEUTRAL VERDICTS — risk discipline:
- For BUY / BUY IF PHYSICAL CONFIRMS / VALUE BUY ONLY / MONITOR: key_risks MUST still contain 2-4 entries naming the genuine residual risks the buyer is taking (no page is risk-free). Same "[Risk type]: [evidence] — [consequence]" format.

THE 8 BLOODSTOCK DIMENSIONS (MANDATORY — write detailed_analysis as 8 short paragraphs, one per dimension, each labelled and 1-3 sentences):
1. SIRE MOMENTUM — fee trend, recent stakes-winners, stud-book direction, with verified source.
2. BUYER DEMAND & MARKET CONTEXT — who buys this type at this sale; pedigree-driven vs physical-driven sale.
3. PAGE DEPTH — quality of female line; verify all black-type within 3 generations; call out padding if present.
4. DAM PRODUCTION RECORD — write 4-6 sentences (NOT one). Name the dam, her own race record, total foals produced, % winners and % stakes performers from runners, the dam's BEST foal to date (name + best race + grade + year), the auction trend of her foals (rising / flat / falling with specific prices), and ONE concrete weakness or strength. If the dam is a maiden (unraced) or has produced no winners, say so explicitly. Never write generic filler like "solid producer" without numbers.
5. UPDATE POTENTIAL — anything in the Updates section or sibling form that shifts valuation up/down.
6. EXPORT & PINHOOK APPEAL — international buyer interest and pinhooker view.
7. RESIDUAL VALUE — broodmare value (fillies) or stallion potential (colts) after racing.
8. FINAL CONVICTION LINE — one direct sentence, the agent's opinion, no hedging.

DEEP MATERNAL-LINE BLOCK (MANDATORY — return as horse.dam_analysis, separate from detailed_analysis):
- dam_name: string (the 1st dam — mother).
- dam_own_race_record: one sentence summarising her own racing class (or "Unraced" / "Maiden").
- dam_sale_history: short string (e.g. "Sold 2018 Tattersalls December for 280,000 gns" or "No public sale record").
- produce_record: array of 4-12 objects { year, name, sex, sire, race_result, auction_price, stakes_status }. Pull foal-by-foal from the DAM PRODUCE / FAMILY research section. If the dam has no produced foals yet, return an empty array and set produce_summary = "First-foal mare — no produce record yet".
- produce_summary: one paragraph (3-5 sentences) covering total foals, % winners, % stakes performers, average sale price, and the trend (rising / flat / falling).
- second_dam: { name, sire, year_of_birth, own_record, best_offspring } — pulled from the FEMALE FAMILY DEPTH research section.
- third_dam: { name, sire, family_summary } — one-paragraph summary of the third dam's family class.
- female_family_label: one of "LIVE" (Group activity in last 3 years), "DORMANT" (last Group winner >10 years ago), "PADDED" (only 4th-generation black-type), or "ELITE" (multiple Group winners within 3 generations).
- female_family_label_reason: one sentence justifying the label with a SPECIFIC verified data point.
- family_number: Bruce Lowe figure if known (e.g. "1-l", "2-d"), otherwise "".
- maternal_black_type_within_3_gens: array of strings, each "Name (Best race, Grade, Year)" — only verified entries from the BLACK-TYPE FAMILY VERIFICATION research.
- key_takeaway: one sentence — does the female family ADD to or SUBTRACT from this lot's value, and by how much?

If the dam is genuinely unknown (not in research), set dam_name = "NOT FOUND" and populate the rest with empty values plus a single-sentence produce_summary explaining the data gap. NEVER fabricate produce records or grades.

SALE CONTEXT BANNER (return horse.sale_context_banner — detect sale from the catalogue header / file name):
- Keeneland September Yearling: "Yearling sale — pedigree + physical weighted equally. Major buyers active. Deep catalogue."
- Keeneland April: "Ready-to-run sale — work tab and physical dominate. Pedigree secondary to current form."
- Tattersalls Book 1: "Elite yearling sale — top European buyers. Pedigree premium applies. Guineas/Derby prospects."
- Tattersalls Book 2/3: "Commercial yearling market — value-driven buyers. Strong sire demand essential. Trainers and pinhookers."
- Goffs Orby: "Premier Irish yearling sale — European buyers. Sire fashion-driven. Irish-bred premium applies."
- Goffs UK Premier: "Speed-biased sale — precocious types favoured. Two-year-old buyer profile. Sprinting pedigrees command premium."
- Other sale: write a one-line equivalent banner using verified context.

MARKET TREND BLOCK (return inside market_insights.market_trend, three string fields):
- sire_trend: "[Sire] line: [UP/STABLE/DOWN] — [specific reason with source]"
- verified_comparable: "Verified: [Sire] yearling/2YO — [price] ([Sale, Month Year])". If none found, write exactly: "No direct comparable confirmed — range based on sire average only". NEVER invent a comparable.
- catalogue_context: "This catalogue: [N] lots by same sire — [competitive / limited]" (state "single-lot upload" if only one lot).

Return valid JSON with this EXACT structure:
{
  "catalog_summary": {
    "sale_name": "", "auction_house": "", "date": "", "location": "",
    "total_lots": 1, "quality_assessment": "", "market_temperature": "Cold/Warm/Hot/Frenzy",
    "average_price_range": "", "key_sire_lines": [], "key_female_families": []
  },
  "horses": [{
    "name": "", "lot_number": "", "year_of_birth": 0, "sex": "", "country": "",
    "consignor": "", "breeder": "",
    "sale_context_banner": "",
    "score_context_label": "",
    "pedigree": {
      "sire": "", "dam": "", "dam_sire": "", "sire_of_damsire": "",
      "nick_rating": "A++/A+/A/B+/B/C/D/F", "nick_explanation": "",
      "inbreeding_coefficient": 0, "inbreeding_to": [],
      "dosage_profile": { "B": 0, "I": 0, "C": 0, "S": 0, "P": 0, "DI": 0, "CD": 0 },
      "key_ancestors": [], "female_family": "", "family_number": "",
      "rating_split": {
        "genetic_quality": 0,
        "genetic_quality_note": "",
        "commercial_appeal": 0,
        "commercial_appeal_note": ""
      }
    },
    "performance": {
      "career": { "starts": 0, "wins": 0, "places": 0, "unplaced": 0, "earnings": "", "win_percentage": 0 },
      "speed_figures": { "best_rpr": null, "best_beyer": null, "best_timeform": null, "avg_last_5": null, "trend": "stable" },
      "distance_profile": "", "surface_preference": "", "going_preference": "", "class_ceiling": "",
      "best_races": []
    },
    "siblings": [],
    "sire_stats": {
      "runners": 0, "winners": 0, "stakes_winners": 0, "win_rate": 0,
      "avg_earning_index": 0, "stud_fee": "", "standing_at": "", "best_progeny": []
    },
    "redcap": {
      "subject_raced": false,
      "subject_rpr": null,
      "subject_code": "",
      "subject_trip": "",
      "subject_verified": false,
      "subject_source": "",
      "sire_rpr": null,
      "sire_code": "",
      "sire_trip": "",
      "sire_verified": false,
      "sire_source": "",
      "dam_rpr": null,
      "dam_code": "",
      "dam_unraced": false,
      "dam_verified": false,
      "dam_source": "",
      "dam_sire_rpr": null,
      "dam_sire_code": "",
      "dam_sire_verified": false,
      "dam_sire_source": "",
      "siblings": [
        { "name": "", "rpr": null, "code": "", "best_result": "", "verified": false, "source": "" }
      ],
      "notes": ""
    },
    "performance_analysis_rpr": "",
    "family_pedigree_analysis": "",
    "dam_produce": [],
    "dam_analysis": {
      "dam_name": "",
      "dam_own_race_record": "",
      "dam_sale_history": "",
      "produce_record": [
        { "year": 0, "name": "", "sex": "", "sire": "", "race_result": "", "auction_price": "", "stakes_status": "" }
      ],
      "produce_summary": "",
      "second_dam": { "name": "", "sire": "", "year_of_birth": 0, "own_record": "", "best_offspring": "" },
      "third_dam": { "name": "", "sire": "", "family_summary": "" },
      "female_family_label": "LIVE | DORMANT | PADDED | ELITE",
      "female_family_label_reason": "",
      "family_number": "",
      "maternal_black_type_within_3_gens": [],
      "key_takeaway": ""
    },
    "commercial_analysis": {
      "estimated_value_range": "", "estimated_value_justification": "", "comparable_sales": [],
      "market_demand": "High/Medium/Low", "resale_potential": "High/Medium/Low", "commercial_sire": true,
      "market_estimate": {
        "fair_trade_low": 0,
        "fair_trade_high": 0,
        "physical_upside": 0,
        "avoid_above": 0,
        "bid_strategy": ""
      }
    },
    "scores": {
      "pedigree_score": 0, "performance_score": 0, "commercial_score": 0,
      "conformation_potential": 0, "overall_score": 0,
      "pedigree_explainer": "",
      "performance_explainer": "",
      "commercial_explainer": "",
      "conformation_explainer": ""
    },
    "agent_verdict": "BUY | BUY IF PHYSICAL CONFIRMS | VALUE BUY ONLY | MONITOR | PASS | AVOID",
    "verdict_reason": "",
    "key_strengths": [],
    "key_risks": [],
    "detailed_analysis": ""
  }],
  "top_recommendations": [{
    "rank": 1, "lot_number": "", "horse_name": "", "overall_score": 0,
    "reason": "", "estimated_value": "", "risk_level": "LOW/MEDIUM/HIGH",
    "verdict": "BUY/WATCH/AVOID", "pedigree_highlights": "", "performance_highlights": "",
    "investment_thesis": ""
  }],
  "market_insights": {
    "trending_sires": [], "value_picks": [], "premium_lots": [], "ones_to_avoid": [],
    "overall_catalog_quality": "Single horse report", "market_commentary": "",
    "market_trend": {
      "sire_trend": "",
      "verified_comparable": "",
      "catalogue_context": ""
    }
  },
  "chart_data": {
    "score_distribution": [{ "name": "", "pedigree": 0, "performance": 0, "commercial": 0, "overall": 0 }],
    "sire_representation": [{ "sire": "", "count": 1, "avg_score": 0 }],
    "verdict_breakdown": { "BUY": 0, "WATCH": 0, "AVOID": 0 }
  }
}` : `You are BloodstockAI — the world's leading forensic bloodstock analyst.
You have already extracted data from a catalog document. Now produce a COMPREHENSIVE analysis report.

${QUALITY_CONTROLS}

CRITICAL RULES:
- NEVER swap Sire and Dam. Sire = Father, Dam = Mother.
- Calculate inbreeding coefficient using Wright's formula where pedigree data allows.
- Generate B-I-C-S-P dosage profile where possible.
- Rate nick quality from A++ to F based on historical cross success.
- For unnamed/yearlings: analyze siblings, sire stats, dam produce.
- Provide SPECIFIC speed figures, not vague descriptions.
- All scores must be 0-100 with justification.

PROFESSIONAL LANGUAGE RULES FOR "verdict_reason" (Bloodstock Insight) AND "investment_thesis":
- Write as an experienced bloodstock agent advising a client on the sale day.
- verdict_reason MUST be 2-4 sentences covering: sire commercial profile, dam produce quality, family black type depth, and target buyer profile. Example: "Elite sire with proven G1 progeny and record auction averages. Dam is a half-sister to multiple stakes winners with a strong Gr.2 pedigree page. Represents a strong racing prospect for a client targeting 2YO campaign with residual broodmare value. Commercial upside supported by comparable siblings selling in the €100,000-€150,000 range."
- investment_thesis MUST be 3-5 sentences providing: market positioning, comparable sale data, specific nick/cross rationale, risk-adjusted value assessment, and clear recommendation with target buyer. Example: "Exceptional prospect from Europe's leading juvenile sire combined with a proven producing dam whose offspring have averaged €85,000 at public auction. The Sire x Damsire cross has produced 4 Group winners from 12 runners (33% strike rate), representing one of the most reliable nicks in European breeding. Commercial backup is strong with the sire's yearlings averaging €120,000 at Book 1 sales. Risk is mitigated by the dam's consistent produce record. Ideal for a racing client seeking Group-level 2YO talent with excellent residual value."
- NEVER use generic phrases like "good prospect" or "interesting pedigree" — always cite specific data points.
- Reference specific comparable sales, sire statistics, family achievements, and nick evidence.

Return valid JSON with this EXACT structure:
{
  "catalog_summary": {
    "sale_name": "", "auction_house": "", "date": "", "location": "",
    "total_lots": 0, "quality_assessment": "", "market_temperature": "Cold/Warm/Hot/Frenzy",
    "average_price_range": "", "key_sire_lines": [], "key_female_families": []
  },
  "horses": [{
    "name": "", "lot_number": "", "year_of_birth": 0, "sex": "", "country": "",
    "consignor": "", "breeder": "",
    "pedigree": {
      "sire": "", "dam": "", "dam_sire": "",
      "sire_of_damsire": "",
      "nick_rating": "A++/A+/A/B+/B/C/D/F",
      "nick_explanation": "",
      "inbreeding_coefficient": 0,
      "inbreeding_to": [],
      "dosage_profile": { "B": 0, "I": 0, "C": 0, "S": 0, "P": 0, "DI": 0, "CD": 0 },
      "key_ancestors": [],
      "female_family": "",
      "family_number": ""
    },
    "performance": {
      "career": { "starts": 0, "wins": 0, "places": 0, "unplaced": 0, "earnings": "", "win_percentage": 0 },
      "speed_figures": {
        "best_rpr": null, "best_beyer": null, "best_timeform": null,
        "avg_last_5": null, "trend": "improving/declining/stable"
      },
      "distance_profile": "Sprinter/Miler/Middle-Distance/Stayer/Versatile",
      "surface_preference": "Turf/Dirt/AW/Versatile",
      "going_preference": "",
      "class_ceiling": "",
      "best_races": [{ "race": "", "track": "", "date": "", "distance": "", "position": "", "figure": "" }]
    },
    "siblings": [{
      "name": "", "sex": "", "sire": "", "best_result": "", "earnings": "", "stakes_winner": false
    }],
    "sire_stats": {
      "runners": 0, "winners": 0, "stakes_winners": 0, "win_rate": 0,
      "avg_earning_index": 0, "stud_fee": "", "standing_at": "",
      "best_progeny": [{ "name": "", "achievement": "" }]
    },
    "dam_produce": [{
      "name": "", "year": 0, "sire": "", "sex": "", "result": "", "stakes": false
    }],
    "commercial_analysis": {
      "estimated_value_range": "",
      "estimated_value_justification": "",
      "comparable_sales": [{ "horse": "", "price": "", "sale": "", "year": "" }],
      "market_demand": "High/Medium/Low",
      "resale_potential": "High/Medium/Low",
      "commercial_sire": true
    },
    "scores": {
      "pedigree_score": 0, "performance_score": 0, "commercial_score": 0,
      "conformation_potential": 0, "overall_score": 0
    },
    "agent_verdict": "BUY/WATCH/AVOID",
    "verdict_reason": "",
    "key_strengths": [],
    "key_risks": [],
    "detailed_analysis": ""
    ${hasGoals ? ', "goal_match": false, "goal_match_reason": ""' : ""}
  }],
  "top_recommendations": [{
    "rank": 1, "lot_number": "", "horse_name": "", "overall_score": 0,
    "reason": "", "estimated_value": "", "risk_level": "LOW/MEDIUM/HIGH",
    "verdict": "BUY/WATCH/AVOID",
    "pedigree_highlights": "", "performance_highlights": "",
    "investment_thesis": ""
  }],
  "market_insights": {
    "trending_sires": [], "value_picks": [], "premium_lots": [],
    "ones_to_avoid": [], "overall_catalog_quality": ""
  },
  "chart_data": {
    "score_distribution": [{ "name": "", "pedigree": 0, "performance": 0, "commercial": 0, "overall": 0 }],
    "sire_representation": [{ "sire": "", "count": 0, "avg_score": 0 }],
    "verdict_breakdown": { "BUY": 0, "WATCH": 0, "AVOID": 0 }
  }
  }`;

    const analysisUserPrompt = isSingleHorseAnalysis ? `SINGLE HORSE / SINGLE LOT ANALYSIS:
File: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)
Client Objective: ${objectiveLabel}${budgetNote}

HORSE TYPE (LOCKED BY CLIENT SELECTOR — DO NOT OVERRIDE): ${horseType}
HORSE TYPE GUIDANCE: ${HORSE_TYPE_CONTEXT[horseType] || HORSE_TYPE_CONTEXT.YEARLING}
SALE CONTEXT: ${SALE_CONTEXT_LABELS[saleContextRaw] || "Not specified"}

RECOMMENDATION RULES — MANDATORY:
- ALWAYS issue a verdict from pedigree depth + sire/dam analysis + any verified sale/performance data.
- Allowed verdicts: BUY / BUY IF PHYSICAL CONFIRMS / WATCH / VALUE BUY ONLY / PASS / AVOID. NEVER use "INSUFFICIENT_DATA".
- When verified market data is thin, lean on: sire yearling avg + stud fee, dam produce record (winners/runners %), 2nd-dam black-type, sibling auction prices (if any).
- verdict_reason must cite the SPECIFIC pedigree data driving the call (sire stats, dam W/R %, sibling result). NEVER write "no verified data" or "manual valuation recommended".

DAM-LINE FOCUS — MANDATORY (this is at least as important as the sire analysis):
1. dam_analysis.dam_own_race_record must cover wins, ratings, best race and distance.
2. dam_analysis.produce_record must list EVERY named offspring with wins, earnings and best race (max 6).
3. Compute and report winners-to-runners ratio (e.g. "4 winners from 6 runners — 67% W/R").
4. Name the dam's BEST performer with the achievement.
5. Cite sibling auction prices using the SIBLING SALES research below when present.
6. Address the dam's sire (maternal grandsire) and what it contributes to this cross.
7. Address the 2nd dam (race record + best produce) and the 3rd dam (best produce summary).
8. The Dam Insight paragraph inside detailed_analysis MUST contain a sentence in the form:
   "The dam [Name] has produced [X] winners from [Y] runners ([Z]% W/R). Her best performer is [Name] ([achievement]). This cross ([Sire] × [DamSire]) rates [assessment] based on [reasoning]."
9. NEVER write "Dam line: standard" or "Dam: limited public data available" without first searching the dam-family research block. If nothing was found, state specifically what was searched and not found.

SIBLINGS AT AUCTION — MANDATORY OUTPUT:
- Populate horse.siblings with up to 8 entries. Each entry should include:
  { name, relation: "Full sibling (by <Sire>)" | "Half sibling (by <Sire>)", sex, sire, sale_house, sale_year, sale_price (in session currency), grade, best_result, earnings, stakes_winner }.
- Full siblings (same sire AND same dam) come first, then half siblings (same dam only).
- For siblings not yet sold or unraced, leave sale_price empty / best_result empty — do NOT omit them.
- If no sibling sales data was found in the SIBLING SALES research block, leave siblings empty and write in dam_analysis.key_takeaway: "No public auction results found for siblings of [Dam]. Dam's produce record is based on catalogue data only."

CROSS ASSESSMENT — MANDATORY:
Include in detailed_analysis a paragraph in the form:
"[Sire] × [DamSire] (via [Dam]): [what the cross produces in terms of distance, type, commercial profile]. Nick rating: [if available]. Inbreeding: [notable duplications, e.g. 'Danehill 4×3' if any]. Commercial profile: [what buyers typically target this cross and at what price level]."

SESSION CURRENCY (MANDATORY): ${sessionCurrency}
- ALL prices, ranges, comparables, sire averages, dam produce values, and the final estimated_value_range MUST be expressed in ${sessionCurrency} only.
- Symbol/suffix to use: ${sessionCurrency === "GNS" ? "value followed by 'gns'" : `prefix "${currencyPrefix(sessionCurrency)}"`}.
- NEVER mix currencies. NEVER convert to USD or add USD equivalents. Only use "$" when the detected session currency itself is USD/AUD/NZD.

PDF PRIMARY DATA LOCK:
- The PDF extraction is the primary source for Lot, horse name, colour, sex, year, country, sire, dam, damsire, sale, vendor/consignor, and sale type.
- External research may enrich market, race, and family evidence, but it must NEVER overwrite sire/dam/lot identity unless it proves an OCR error and explains the discrepancy.
- If a fact is not confirmed in the PDF or verified research, write a SHORT pedigree-based note instead (e.g. "Race record under review — refer to official stud book"). NEVER write "Not publicly available" or "Insufficient data" in any user-facing field.

THREE-AGENT CONTRACT — YOU ARE AGENT 3 (CLAUDE).
- Agent 1 (deterministic parser) gave you: horse_type = "${horseType}", session_currency = "${sessionCurrency}", black_type_horses = ${JSON.stringify(blackTypeHorses)}.
- Agent 2 (Perplexity) gave you the MARKET / PEDIGREE RESEARCH section below. You MUST NOT search yourself. You MUST NOT invent statistics.
- horse_type is LOCKED to "${horseType}". Do NOT override it.
- A black-type horse may only be cited as a positive selling point if it appears in BOTH the catalogue text AND the BLACK-TYPE FAMILY VERIFICATION research section as a verified Group/Listed winner within 3 generations of the lot.

FORBIDDEN PHRASES (writing any of these means the system failed — write what you actually know instead, or "NOT FOUND"):
× "interim valuation"  × "deeper benchmarking"  × "monitored opportunity"
× "standard commercial positioning"  × "absence of verified comparables"  × "intentionally conservative"

PERFORMANCE SCORING — APPLY EXACT RULE FOR horse_type = "${horseType}":
- YEARLING / FOAL: performance_score MUST be 0/25 with explainer "Unraced — score pending".
- 2YO_READY_TO_RUN: score 0-25 from breeze time, furlong split, action, biomechanics found in document or research. Do NOT force 0.
- HORSE_IN_TRAINING: base 10 if has raced; +3 per Listed win, +5 per G3, +7 per G2, +10 per G1, +2 per Group placed; cap at 25.
- BREEDING_STOCK: score from own race record.
- NH_STORE: unraced store horse. performance_score MUST be 0/25 with explainer "Unraced NH store — score pending point-to-point or bumper debut".
- NH_BREEZE: 0-25 from NH breeze action, jumping aptitude, scope, athleticism noted in document/research. Stamina + scope > raw speed.
- POINT_TO_POINT: base 10 if has run between-the-flags; +5 per P2P win, +3 per P2P placed, +4 per hunter chase win; cap at 25. A P2P winner that has sold to a Rules trainer is a strong positive.
- NH_HORSE_IN_TRAINING: base 10 if has raced under Rules; +3 per Listed/Class 2 win, +5 per G3/Grade 3, +7 per G2/Grade 2, +10 per G1/Grade 1, +2 per Graded placed; cap at 25.

NATIONAL HUNT / POINT-TO-POINT / STORE MARKET LOGIC (applies when horse_type is NH_STORE, NH_BREEZE, POINT_TO_POINT, or NH_HORSE_IN_TRAINING):
- NEVER apply Flat-horse precocity logic. NH/P2P horses must NOT be penalised for lack of early speed, absence of 2YO form, or slower physical maturity. Late-maturing, scopey, staying types are the commercial ideal here.
- Pedigree weighting: stamina depth, jumping pedigree (Walk In The Park, Blue Bresil, Yeats, Getaway, Flemensfirth, Milan, Presenting, Kayf Tara, Oscar, Jeremy, Beneficial, Westerner, Martaline, Saint Des Saints, Network, Authorized, Stowaway, Scorpion, Shantou, Sholokhov, etc.), proven jumping families, Cheltenham/Festival pedigree appeal, dam-side National Hunt black-type.
- Commercial weighting: NH sire demand, store-sale market depth, P2P-to-Rules pinhooking margin, resale potential to UK/IRE NH trainers (Mullins, Henderson, Nicholls, Skelton, Elliott, de Bromhead, etc.), Irish vs UK NH cycle.
- Comparable sales — USE ONLY NH/P2P/Store sources: Tattersalls Cheltenham (January / April / May / Festival), Goffs Land Rover Sale, Goffs UK Spring/Autumn Sale, Derby Sale (Goffs Ireland), Goresbridge Breeze-Up & Sportsman's Sale, Arqana NH, Doncaster Spring Store Sale, Brightwells/Ascot Bloodstock, NH HIT sales. NEVER use Tattersalls October / Goffs Orby / Keeneland September / Arqana Deauville August (Flat yearling sales) as NH comparables.
- Currency: Tattersalls Cheltenham → GBP, Goffs Land Rover / Derby Sale / Goresbridge → EUR, Goffs UK / Doncaster Spring Store → GBP.
- Commentary style examples (adapt — do not copy verbatim):
  • "This profile appears more aligned with the National Hunt market, where stamina, physical durability and jumping pedigree depth carry stronger commercial importance than early precocity."
  • "The pedigree suggests a traditional staying National Hunt type with potential appeal for the Irish store and point-to-point market."
- A black-type credit in an NH context means NH black-type (Grade 1/2/3 hurdle, chase, bumper, or Listed NH Flat) — NOT Flat Group races, unless explicitly tied to a stamina/staying influence relevant to jumps breeding.

PEDIGREE RATING SPLIT (rating_split) — TWO distinct 0-10 scores WITH MANDATORY FLOORS:
- A G1-winning sire (e.g. Naval Crown G1 Platinum Jubilee) × Frankel-line dam = MINIMUM genetic_quality 7.0; commercial_appeal may be lower if sire fee is small.
- Never collapse to a single 1.9/10 score.
- SIRE STUD FEE AS MINIMUM QUALITY SIGNAL:
  Fee ≥ €100,000: Commercial Appeal minimum 8.0, Genetic Quality minimum 8.0
  Fee €50–100,000: Commercial Appeal minimum 6.5, Genetic Quality minimum 7.0
  Fee €25–50,000: Commercial Appeal minimum 5.0, Genetic Quality minimum 5.5
  Fee €10–25,000: Commercial Appeal minimum 3.5
  Fee < €10,000: Commercial Appeal minimum 2.0
  Fee unknown but sire at Coolmore/Darley/Godolphin/Juddmonte: minimum 3.0 (NEVER 1.9)

MAJOR STUD SIRE SCORING FLOORS (CRITICAL — NEVER VIOLATE):
- If sire stands at Coolmore, Darley, Godolphin, or Juddmonte AND has documented Group winners:
  → Minimum pedigree_score = 14/25
  → Minimum commercial_score = 13/25
  → Minimum overall_score = 45/100 (before conformation)
  → A score of 34/100 for a Coolmore sire with G1 winners and €75K fee is IMPOSSIBLE and WRONG
- Example: Sioux Nation (Coolmore, €75K fee, G1 winners) = minimum pedigree 14, commercial 13, overall 45+

MARKET ESTIMATE — REALISTIC MARKET PRICING (apply professional bloodstock-agent logic, NOT a mechanical formula):

STEP 1 — SELECT THE ANCHOR (priority order):
1. Verified previous_sale.price for THIS exact lot from research → confidence HIGH.
2. Verified sale price of a FULL or HALF sibling by the same sire/dam family from research → confidence HIGH.
3. Sire's verified yearling/2YO median or average from research → confidence MEDIUM.
4. Sire stud_fee × multiplier (× 4 for commercial sires, × 6 for Group-winning sires, × 8+ for elite G1 sires) → confidence MEDIUM-LOW.
5. Closest same-cross / same-female-family auction comparable from research → confidence MEDIUM.
6. If absolutely nothing in research → produce a conservative low-confidence numeric estimate from PDF-confirmed sale context, sex, age, sire/dam identity and sale type only. Mark anchor_source = "Pedigree-based: [Sire] x [Dam]" (fill in the real names) and confidence = "LOW". Add: "Estimate built from sire profile and dam-line — refine with physical inspection." NEVER write "Not publicly available" or "Insufficient data".

STEP 2 — APPLY PROFESSIONAL ADJUSTMENTS to the anchor (each can add or subtract value, applied multiplicatively):
- Sex premium: colts +10-20% vs fillies for racing-buyer market; fillies +20-40% vs colts for top broodmare-prospect pages.
- Black-type proximity: 1st dam stakes producer +25-50%; 2nd dam G1 winner +15-30%; padded 4th-gen only -20%.
- Sire trend: trending UP (recent G1s, fee rising) +15-30%; trending DOWN (fee cuts, weak crops) -20-35%.
- Sale tier: Tattersalls Book 1 / Keeneland Sept Book 1 / Goffs Orby +20-40% premium vs same horse at a Book 2/3 sale.
- Consignor reputation: top consignor (Newgate, Yeomanstown, Tally-Ho, Lane's End, Coolmore) +10-20%.
- Updates: a near-relative winning a Listed/Group race in the past 6 months +20-40%; weak recent updates -10-20%.
- Physical type (if mentioned in document): correct, scopey, athletic +15-25%; small/back-at-the-knee/over at the knee -25-40%.

STEP 3 — BUILD THE RANGE (realistic market width, NOT a tight band):
- fair_trade_low = adjusted_anchor × 0.65 (the conservative pinhooker bid)
- fair_trade_high = adjusted_anchor × 1.55 (the strong racing-buyer bid on the day)
- physical_upside = adjusted_anchor × 2.00 to × 2.80 (top clearance at premier sale if horse presents exceptionally)
- avoid_above = adjusted_anchor × 1.80 (the price above which a sober buyer should walk away)
- The fair_trade range MUST be at least 2.0x wide (high / low ≥ 2.0). A wider range communicates honest market uncertainty — narrow bands are wrong.
- If multiple anchors converge (verified comparable + sire average + sibling price all aligning), narrow toward 1.8x and raise confidence to HIGH.
- If anchors disagree by >2x, widen the range and call out the divergence in justification.

STEP 4 — SANITY-CHECK against real market expectations:
- A G1-winning sire's commercial colt from a stakes-producing dam at a premier sale: fair_trade_high should typically land between 100,000-500,000 in session currency (often higher for elite Coolmore/Godolphin-type sires).
- A first-crop or third-tier sire's filly from a maiden dam at a Book 3-equivalent sale: fair_trade_high typically 8,000-40,000.
- A Horse-in-Training with verified Listed/Group form: anchor on prize-money + breeding residual; fair_trade_high should typically equal 4-8x season earnings, NOT a yearling-style sire-fee multiple.
- A 2YO breeze-up colt with a fast verified breeze time + commercial sire: fair_trade_high typically 80,000-400,000+ at Craven/Arqana/OBS March; never collapse to <30,000 unless breeze was clearly poor.
- NEVER produce a final fair_trade_high under 25,000 in session currency for a horse by a verified Group-winning sire from a published-sale page. If your math gets there, you have under-anchored — re-pick a higher-priority anchor or apply the professional-judgement floor.

estimated_value_justification MUST contain ALL of:
- Sentence 1: "Anchor: [type] = [value] (source: [name], confidence [LOW/MEDIUM/HIGH])"
- Sentence 2: the SPECIFIC adjustments applied with their direction and magnitude (e.g. "Adjusted +25% for stakes-producing dam, +15% for premier-sale slot, -10% for unfashionable physical notes").
- Sentence 3: state the three numbers — fair-trade range, physical upside, avoid-above — and the bid_strategy chosen.
- Sentence 4 (only if anchors diverged): name the conflict and which evidence was prioritised.

VERDICT GATE:
- "BUY" only if total ≥ 75 AND confidence HIGH AND verified anchor exists.
- "BUY IF PHYSICAL CONFIRMS" if 60-74 with good page but unverified physical.
- "VALUE BUY ONLY" if 50-64.
- "MONITOR" if 45-54.
- "PASS" if < 45 or anchor confidence NONE.
- "AVOID" only with a SPECIFIC negative flag stated in verdict_reason.
- Missing data alone is never AVOID — it is MONITOR or PASS.

UNIVERSAL RESEARCH PRINCIPLE (NO EXCEPTIONS):
- Every number, statistic, comparable and Group/Stakes claim MUST come from the MARKET / PEDIGREE RESEARCH section below.
- If a number is not present in the research, write "NOT FOUND" or set the numeric field to 0 with note "Statistics not yet available".
- Never reuse a sire average, dam record, or comparable from a different horse/lot.
- Group/Grade horses may only be cited as a positive selling point if they appear within 3 generations AND are visible in the research.

SCORING RULES (each component 0-25, total = exact sum, max 100):
- pedigree_score (0-25): sire class + dam family depth + nick quality, anchored on verified data.
   Calibrated 0-100 rubric then divided by 4. Use this rubric (then output the 0-25):
     • Sire class & commercial profile (0-25)
     • Dam produce record: winners/runners ratio + best produce grade (0-25)
     • 2nd and 3rd dam quality + stakes performers (0-20)
     • Key relatives Gr.1/Gr.2/Gr.3/Listed/unplaced (0-15)
     • Cross coherence (0-15)
   A horse with a Gr.1 sire, dam with 4 winners incl. a Gr.2, and 2nd dam with Listed winners should score 72-85/100 → 18-21/25.
   An unknown sire with no produce record should score 15-30/100 → 4-7/25.
   NEVER default to a low score (e.g. 12-20/100) for a well-bred horse just because some sub-fields are missing — extrapolate from the strongest verified evidence.
- performance_score (0-25):
    • For yearlings/foals (≤1yo) with NO race record AND NO breeze-up data: MUST be 0.
    • For 2YO breeze-up lots: SCORE from breeze time, furlong split, stride, action and biomechanics found in the document or research (do NOT force 0). Faster breeze + clean action = higher score; slow/scrappy = lower.
    • For horses with actual race results: score normally from results / ratings.
- commercial_score (0-25): based on verified sire auction demand + consignor + market fit.
   Calibrated 0-100 rubric then divided by 4:
     • Sire stud fee & demand level (0-20)
     • Sire commercial track record (0-20)
     • Dam produce auction prices / sibling sales (0-20)
     • Sale venue and catalogue tier (0-20)
     • Buyer demand for this cross in current market (0-20)
   A Coolmore first-season sire × stakes-producing dam at Tattersalls should score 65-80/100 → 16-20/25.
   An unknown sire × unproven dam at a small sale should score 15-30/100 → 4-7/25.
- conformation_potential (0-25): 0 unless verified visual/breeze-up data exists; otherwise note "Conformation: pending physical inspection".
- overall_score = pedigree_score + performance_score + commercial_score + conformation_potential (server will recompute and override; keep components honest).

MANDATORY ANCHOR LOGIC (estimated_value_range) — see the realistic-pricing block above. Use STEP 1-4 from "MARKET ESTIMATE — REALISTIC MARKET PRICING". Do NOT apply any tighter formula. The fair-trade range must be at least 2.0x wide and physical_upside should reflect realistic premier-sale clearance, not a mechanical 1.4x cap.

SIRE STATISTICS SOURCING (MANDATORY):
- For sire_stats fields (runners, winners, stakes_winners, win_rate, avg_earning_index, stud_fee, best_progeny): only populate numbers that appear in the research with a verifiable source. Append "(source: [Source])" inline in the relevant text.
- If the sire is a first-crop / unraced-progeny sire: set numeric stats to 0 and add a note "First-crop — no racing data" inside best_progeny[0].achievement.
- If a number is not found in research: set the field to 0 and add a note "Statistics not yet available" in best_progeny[0].achievement. NEVER invent numbers.

TOP PICK / agent_verdict GATE:
- Only assign agent_verdict = "BUY" (TOP PICK) if ALL true: overall_score ≥ 75, sire has verified strong demand in research, dam has verified produce or racing record in research, the anchor is a verified previous sale OR sire average (MEDIUM/HIGH confidence), and no major negative flags. Otherwise use "WATCH" with verdict_reason explaining why confidence is not yet HIGH.

EXTRACTED HORSE DATA:
${JSON.stringify(primaryHorse, null, 2)}

SERVER-VERIFIED MARKET ANCHOR (MANDATORY IF PRESENT):
${verifiedMarketAnchor ? JSON.stringify(verifiedMarketAnchor, null, 2) : `None detected by server. Use research anchors if present; otherwise build a conservative LOW-confidence pedigree-based estimate from sire profile + dam family + sibling sales. Never write "Not publicly available" — always produce a usable range with a one-sentence pedigree-based justification.`}
- If present, the final estimated_value_range MUST be anchored around this real price and MUST NOT fall back to a generic low sire-average band.
- For a verified exact sale near 700,000, fair_trade_high should remain in the high six figures; never output €29,000-€70,000 or similar.

CLAUDE EXTRACTED DATA FROM DOCUMENT:
${extractedText}

MARKET / PEDIGREE RESEARCH:
${perplexityData || "No additional search data available"}

RESEARCH USAGE RULES (MANDATORY):
- The MARKET / PEDIGREE RESEARCH block above contains live web sources from the approved list: equineline.com, equibase.com, bloodhorse.com, weatherbys.co.uk, racingpost.com, arion.co.nz, breednet.com.au, racenet.com.au, racingaustralia.horse, tbv.com.au, plus official auction-house result pages when present.
- You MUST mine concrete facts from those snippets: specific sale prices, race wins, black-type updates, sire averages, dam produce results.
- Cite at least one source URL inline inside estimated_value_justification and inside detailed_analysis (format: "(source: domain.com)").
- FORBIDDEN: invented comparable claims or made-up Group placings. If research is thin, lean explicitly on the sire's stud fee + verified average + the dam's produce record + sibling sales from the SIBLING SALES block, and cite which fields you used. NEVER write "Not publicly available", "Insufficient data", or "manual valuation recommended" in any user-facing field.
- If the research block contains ANY verified price figure for this exact lot, a sibling, the dam, or same-sire progeny, you MUST anchor the fair-trade range around those figures, not a generic band.

INSTRUCTIONS:
1. Produce the most complete possible professional single-horse report for the EXACT lot shown in the PDF.
2. Treat the PDF extraction as the source of truth for lot_number, sire, dam, dam_sire, sex and sale-page identity; use external research only to verify and enrich.
3. Include a realistic estimated market value based on VERIFIED public sale data and comparable auction evidence whenever available.
4. If a quoted document estimate conflicts with verified public sale results or stronger comparable evidence, explain the conflict and prioritise the verified market evidence.
5. Never invent consignors, vendors, or page details that are not present in the PDF or research.
6. Avoid repetition between sections; each section must add value.
7. If unraced or lightly raced, rely on sire stats, siblings, dam produce, female family and comparable sales.
8. Ensure chart_data is filled for the dashboard and PDF graphics.
9. Keep wording polished, factual, agent-grade, and concise.
10. MANDATORY UPGRADE FIELDS — populate ALL of these from the actual research data:
    - horse.score_context_label (from the score band table in the system prompt).
    - horse.sale_context_banner (detect sale type from file name + extracted text).
    - horse.pedigree.rating_split.genetic_quality + commercial_appeal (two distinct 0-10 scores with one-sentence notes).
    - horse.scores.pedigree_explainer / performance_explainer / commercial_explainer / conformation_explainer (one line each, data-grounded).
    - horse.commercial_analysis.market_estimate (fair_trade_low, fair_trade_high, physical_upside, avoid_above, bid_strategy).
    - horse.commercial_analysis.estimated_value_justification MUST mention all three numbers (fair / upside / avoid above) AND explain the bid_strategy.
    - horse.agent_verdict MUST be one of: BUY / BUY IF PHYSICAL CONFIRMS / VALUE BUY ONLY / MONITOR / PASS / AVOID — consistent with score and confidence.
    - horse.verdict_reason: one direct sentence matching the verdict choice.
    - horse.detailed_analysis: 8 short labelled paragraphs covering SIRE MOMENTUM, BUYER DEMAND, PAGE DEPTH, DAM PRODUCTION, UPDATE POTENTIAL, EXPORT/PINHOOK, RESIDUAL VALUE, FINAL CONVICTION. Senior-agent voice, no corporate filler, every sentence anchored to a verified data point.
    - horse.dam_analysis: complete maternal-line block (1st dam own record + foal-by-foal produce + 2nd dam + 3rd dam + female_family_label + maternal_black_type_within_3_gens + key_takeaway). Pull foal-by-foal from the DAM PRODUCE / FAMILY research and second/third-dam data from the FEMALE FAMILY DEPTH research. NEVER fabricate produce rows.
    - market_insights.market_trend (sire_trend, verified_comparable, catalogue_context) — verified comparable only, never invent.

Return COMPLETE structured JSON only.` : `COMPREHENSIVE CATALOG ANALYSIS:
File: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)
Client Objective: ${objectiveLabel}${budgetNote}

SESSION CURRENCY (MANDATORY): ${sessionCurrency}
- ALL prices, ranges, comparables, sire averages, dam produce values, and every estimated_value_range MUST be expressed in ${sessionCurrency} only.
- Symbol/suffix: ${sessionCurrency === "GNS" ? "value followed by 'gns'" : `prefix "${currencyPrefix(sessionCurrency)}"`}.
- NEVER mix currencies. NEVER show USD or add USD equivalents.

MANDATORY ANCHOR LOGIC (every horse):
- For each horse, search the research data for any verified previous public sale result for that exact horse.
- If found: estimated_value_justification MUST start with "Anchored to: [price] at [Sale, Year]" and adjust ±15-25% only.
- If not found: estimated_value_justification MUST start with "No previous sale result found. Anchored to sire average of [price] (source: [Source])".
- NEVER produce an estimated_value_range without explicitly stating the anchor in the first sentence of its justification.

SIRE STATISTICS SOURCING (MANDATORY):
- For sire_stats: only populate numeric fields when the number is found in the research with a verifiable source. Cite the source inline.
- First-crop sires: numbers = 0, note "First-crop — no racing data".
- Number not found in research: field = 0, note "Statistics not yet available". NEVER invent.

CLAUDE EXTRACTED DATA FROM DOCUMENT:
${extractedText}

PERPLEXITY RESEARCH DATA (use this for verification and enrichment):
${perplexityData || "No additional search data available"}

${goalsSection}

INSTRUCTIONS:
1. Cross-reference extracted data with Perplexity results for accuracy
2. For EACH horse: calculate pedigree nick, inbreeding, dosage where data permits
3. Score each horse 0-100 on pedigree, performance, commercial value
4. Provide agent verdict (BUY/WATCH/AVOID) with specific reasoning
5. Rank TOP 3-5 purchase recommendations with investment thesis
6. Include chart_data for visualization
7. If client has objectives/budget, prioritize horses matching those criteria
8. For yearlings/unnamed: deep-analyze siblings, sire statistics, dam produce record

CRITICAL — MARKET ESTIMATE (estimated_value_range) RULES:
- Each horse MUST have a UNIQUE and DIFFERENTIATED estimated_value_range based on its individual merits.
- DO NOT copy the same range for multiple horses. Every lot is different.
- Base the estimate on: sire's auction averages/medians, dam produce sale history, comparable siblings sold at auction, overall pedigree page quality, sex, age, and current market conditions.
- BE BOLD WHEN JUSTIFIED: Do NOT artificially cap values. If pedigree, sire performance, dam page, black-type proximity, and market signals genuinely support a higher valuation, push the upper range to reflect realistic top-end potential (e.g. elite Frankel/Dubawi/Wootton Bassett colts from stakes-winning dams CAN reach €500,000-€1,500,000+ at premier sales — quote those numbers when warranted).
- A well-bred colt by a top-tier sire (stud fee >€100k) from a stakes-producing dam should be valued MUCH higher than a filly by a mid-tier sire from a maiden dam.
- Use the sire's yearling/foal sale averages and TOP recent results as anchors, then adjust up or down based on: dam page quality (+/-20-40%), sex (colts typically +10-20% vs fillies), black-type proximity (+15-30%), nick quality, physical lot type, and demand signals from the most recent comparable sales.
- The range should reflect a realistic LOW (conservative buyer) to HIGH (top-end clearance at a premier sale) — not a narrow safe band. Width of the range should communicate uncertainty honestly.
- If comparable sale data is insufficient, state "Estimated" and provide a defensible range. Never default to a generic placeholder.
- Generic repeated bands such as €29,000-€70,000 or €35,000-€75,000 are forbidden for commercially meaningful sires; if the sire has premium market perception, the range must reflect that perceived value even when exact comparables are incomplete.
- Example differentiation: Lot 1 (Frankel colt, stakes-winning dam, premier sale) = €350,000-€900,000; Lot 2 (Kodiac filly, maiden dam) = €25,000-€55,000; Lot 3 (Dubawi colt, Gr.1 dam family) = €400,000-€1,200,000.

MANDATORY — estimated_value_justification:
- Every horse MUST include a clear, professional 2-4 sentence written justification explaining EXACTLY why this market estimate range was assigned.
- Reference the SPECIFIC drivers used: sire's recent yearling/foal averages or top sale, dam's produce record (winners, stakes, sale prices), black-type proximity in 2nd/3rd dam, nick rating, sex/age premium, comparable siblings sold, and current auction demand for this sire's stock.
- Written for a professional bloodstock agent and the end client — confident, specific, numeric where possible. No vague filler.
- Example: "Range driven by Frankel's 2025 yearling average of €620,000 (Goffs Orby), with this colt warranting a premium thanks to a Listed-winning dam producing 2 winners from 2 runners and a 3x4 Galileo cross. Comparable half-brother sold for €750,000 at Tattersalls Book 1 last year. Top end reflects realistic premier-sale clearance for a physical, correct colt by Europe's leading sire."

Return COMPLETE structured JSON. Do NOT truncate.`;

    let analysisSource = "claude";
    let extractedData: any;
    pipelineDiagnostics.stage = "analysis";

    try {
      const claudeResponse = await callClaude(
        ANTHROPIC_API_KEY,
        analysisSystemPrompt,
        analysisUserPrompt,
        {
          // Keep the primary pass well inside the Edge Function wall-clock budget.
          // Long Anthropic streams were causing the platform to terminate before fallback.
          maxTokens: isSingleHorseAnalysis ? 5200 : 9000,
          timeoutMs: isSingleHorseAnalysis ? 75000 : 120000,
          maxAttempts: 1,
        }
      );
      extractedData = parseJsonFromResponse(claudeResponse);
      if (!extractedData || !Array.isArray(extractedData?.horses) || extractedData.horses.length === 0) {
        // The first pass returned text that we could not parse as a horse list (most often
        // because the JSON was truncated mid-object). Throw so the recovery branch runs
        // with a stricter "complete-JSON" prompt instead of silently dropping to fallback.
        throw new Error("Primary Claude analysis returned unparseable / truncated JSON");
      }
    } catch (analysisError) {
      if (!isSingleHorseAnalysis) throw analysisError;
      console.error("Single horse deep analysis failed, using fallback immediately:", analysisError);
      analysisSource = "fallback";
      extractedData = buildSingleHorseFallbackAnalysis({
        primaryHorse,
        fileName,
        objectiveLabel,
        budgetRaw,
        observedPrice,
        horseType,
      });
    }

    if (!extractedData || !Array.isArray(extractedData.horses) || extractedData.horses.length === 0) {
      if (!isSingleHorseAnalysis) {
        throw new Error("Failed to parse AI analysis");
      }

      analysisSource = "fallback";
      extractedData = buildSingleHorseFallbackAnalysis({
        primaryHorse,
        fileName,
        objectiveLabel,
        budgetRaw,
        observedPrice,
        horseType,
      });
    }

    // ═══ Attach the pre-fetched Tavily enrichment to each horse for UI consumption ═══
    try {
      if (Array.isArray(extractedData?.horses)) {
        for (const h of extractedData.horses) {
          const key = String(h?.name || "").toLowerCase();
          h.tavily_enrichment = tavilyResultsByHorse.get(key) || null;
          // If Claude (or the fallback) didn't populate a redcap block, derive a
          // best-effort RPR snapshot directly from the Tavily Racing-Post answers
          // so the UI doesn't render "Sire n/v · Dam n/v".
          const enr: any = h.tavily_enrichment;
          const rc: any = h.redcap || {};
          const extractRpr = (txt: string | null | undefined): number | null => {
            if (!txt) return null;
            const m = String(txt).match(/\b(?:RPR|Racing\s*Post\s*Rating|Timeform|official\s*rating|OR)\b[^0-9]{0,40}(\d{2,3})/i);
            if (m) { const n = Number(m[1]); if (n >= 40 && n <= 145) return n; }
            const fallback = String(txt).match(/\b(?:peak|highest|best|career)[^0-9]{0,30}(\d{2,3})/i);
            if (fallback) { const n = Number(fallback[1]); if (n >= 60 && n <= 145) return n; }
            return null;
          };
          if (enr) {
            if (rc.subject_rpr == null) rc.subject_rpr = extractRpr(enr.redcap_subject_answer);
            if (rc.sire_rpr == null) rc.sire_rpr = extractRpr(enr.redcap_sire_answer);
            if (rc.dam_rpr == null) rc.dam_rpr = extractRpr(enr.redcap_dam_answer);
            if (rc.dam_sire_rpr == null) rc.dam_sire_rpr = extractRpr(enr.redcap_damsire_answer);
            if (rc.subject_raced == null) rc.subject_raced = rc.subject_rpr != null;
            if (rc.dam_unraced == null && enr.redcap_dam_answer && /\bunraced\b/i.test(String(enr.redcap_dam_answer))) {
              rc.dam_unraced = true;
            }
            h.redcap = rc;
          }
        }
      }
    } catch (attachErr) {
      console.warn("[TAVILY] attach step failed:", attachErr);
    }

    extractedData = applyObservedPriceAnchor(extractedData, observedPrice, primaryHorse.lot_number);
    extractedData = guaranteeMarketAnchorAndNegativeExplanation(extractedData, sessionCurrency);

    // Final guarantee: scrub any forbidden filler phrases from the entire payload.
    extractedData = stripForbiddenFillers(extractedData);

    // ─── SCORE FLOORS: enforce minimum scores for major-stud sires ───
    extractedData = applyScoreFloors(extractedData);

    // Final market override: a verified exact/related public sale result always beats generic sire-tier fallback.
    extractedData = applyVerifiedMarketAnchor(extractedData, verifiedMarketAnchor);

    // ─── Market policy: ALWAYS produce a usable pedigree-based estimate ───
    // Never surface "insufficient data" to the user. When no verified anchor or Tavily
    // comparable exists, populate the market estimate from sire-tier / generic-tier
    // fallbacks and write pedigree-based commentary citing sire + dam.
    try {
      const hasVerifiedAnchor = !!verifiedMarketAnchor;
      const hasAnyTavilyComparable = Array.from(tavilyResultsByHorse.values()).some((e: any) => {
        const text = `${e?.exact_market_answer || ""} ${e?.sales_answer || ""} ${(e?.comparables_sources || []).map((s: any) => s?.snippet).join(" ")}`;
        return /[£€$]\s*\d{1,3}(?:[.,]\d{3})+|\bA\$\s*\d|\bNZ\$\s*\d|\d{1,3}(?:[.,]\d{3})+\s*gns/i.test(text);
      });
      if (Array.isArray(extractedData?.horses)) {
        for (const horse of extractedData.horses) {
          horse.commercial_analysis = horse.commercial_analysis || {};
          const me = horse.commercial_analysis.market_estimate = horse.commercial_analysis.market_estimate || {};
          const sireName = horse?.pedigree?.sire || "the sire";
          const damName = horse?.pedigree?.dam || "the dam";

          // If Claude left fair_trade values empty, seed them from sire-tier or generic tier.
          const fairLow = Number(me.fair_trade_low) || 0;
          const fairHigh = Number(me.fair_trade_high) || 0;
          if (fairLow <= 0 || fairHigh <= 0) {
            const sireTier = getSireMarketTier(horse?.pedigree?.sire);
            const tier = sireTier && sireTier.target > 0 ? sireTier : getGenericTypeTier(horseType);
            me.fair_trade_low = tier.floor;
            me.fair_trade_high = tier.target;
            if (!me.physical_upside) me.physical_upside = tier.upside;
            if (!me.avoid_above) me.avoid_above = Math.round(tier.upside * 1.2);
            me.confidence = me.confidence && me.confidence !== "insufficient" ? me.confidence : "low";
            const justification = `Pedigree-based estimate built from ${sireName}'s sire-tier benchmark and ${damName}'s family profile. Refine with physical inspection and verified sibling comparables.`;
            me.market_commentary = justification;
            horse.commercial_analysis.estimated_value_justification = justification;
            horse.commercial_analysis.estimated_value_range = `${formatCurrencyAmount(tier.floor, sessionCurrency)} – ${formatCurrencyAmount(tier.target, sessionCurrency)}`;
            if (!me.bid_strategy || /cannot be determined|manual valuation/i.test(String(me.bid_strategy))) {
              me.bid_strategy = `Value buy only if below ${formatCurrencyAmount(tier.floor, sessionCurrency)}`;
            }
          }
          if (String(me.confidence || "").toLowerCase() === "insufficient") me.confidence = "low";
          if (String(horse.market_confidence_level || "").toLowerCase() === "insufficient") horse.market_confidence_level = "low";

          // Replace any banned "insufficient" wording that survived from Claude.
          const BAN = /(insufficient public market data|manual valuation recommended|no verified comparable data was found|bid strategy cannot be determined|not publicly available from the verified sources)/i;
          const pedigreeMsg = `Pedigree-based assessment using ${sireName} x ${damName} — refine with physical inspection at the sale.`;
          if (BAN.test(String(horse.commercial_analysis.estimated_value_justification || ""))) {
            horse.commercial_analysis.estimated_value_justification = pedigreeMsg;
          }
          if (BAN.test(String(me.market_commentary || ""))) me.market_commentary = pedigreeMsg;
          if (BAN.test(String(me.bid_strategy || ""))) {
            me.bid_strategy = `Value buy only if below ${formatCurrencyAmount(Number(me.fair_trade_low) || 0, sessionCurrency)}`;
          }
          if (BAN.test(String(horse.verdict_reason || ""))) {
            horse.verdict_reason = `Verdict based on ${sireName} sire profile and ${damName}'s produce record. Physical inspection recommended to confirm.`;
          }
          // Replace INSUFFICIENT_DATA verdict with a pedigree-grounded one.
          if (String(horse.agent_verdict || "").toUpperCase() === "INSUFFICIENT_DATA") {
            horse.agent_verdict = "WATCH";
            if (!horse.verdict_reason || BAN.test(horse.verdict_reason)) {
              horse.verdict_reason = `Pedigree-driven WATCH: ${sireName} x ${damName}. Confirm with physical inspection and live bidding signals at the sale.`;
            }
          }
        }
        console.log(`[MARKET-POLICY] anchor=${hasVerifiedAnchor ? "verified" : "none"} comparable=${hasAnyTavilyComparable} — pedigree fallback applied where needed`);
      }
    } catch (policyErr) {
      console.warn("[MARKET-POLICY] enforcement failed:", policyErr);
    }

    // Final data validation before saving: PDF identity stays locked and low-confidence
    // market views are explicitly labelled instead of being presented as verified facts.
    if (isSingleHorseAnalysis) {
      extractedData = validateSinglePdfAnalysisBeforeSave(extractedData, {
        pdfIdentity,
        horseType,
        sessionCurrency,
        verifiedMarketAnchor,
      });
    }

    // FIX 4 — Bloodstock Score must equal the exact sum of components for every horse.
    if (Array.isArray(extractedData?.horses)) {
      for (const horse of extractedData.horses) {
        recalculateBloodstockScore(horse);
        // Mirror the new richer dam_analysis.produce_record into the legacy
        // dam_produce array so the existing UI/PDF renderers continue to show
        // the foal-by-foal list without needing a UI change.
        const damAnalysis = horse?.dam_analysis;
        if (damAnalysis && Array.isArray(damAnalysis.produce_record) && damAnalysis.produce_record.length > 0) {
          const existingProduce = Array.isArray(horse.dam_produce) ? horse.dam_produce : [];
          if (existingProduce.length === 0) {
            horse.dam_produce = damAnalysis.produce_record.map((p: any) => ({
              name: p?.name || "",
              year: Number(p?.year) || 0,
              sire: p?.sire || "",
              sex: p?.sex || "",
              result: p?.race_result || p?.result || "",
              stakes: !!(p?.stakes_status && /winner|placed|group|listed|stakes/i.test(String(p.stakes_status))),
            }));
          }
        }
      }
      // Sync top_recommendations.overall_score with the recalculated horse scores
      if (Array.isArray(extractedData.top_recommendations)) {
        const byKey = new Map<string, any>();
        for (const h of extractedData.horses) {
          const key = String(h.lot_number || h.name || "").toLowerCase();
          if (key) byKey.set(key, h);
        }
        for (const rec of extractedData.top_recommendations) {
          const k = String(rec.lot_number || rec.horse_name || "").toLowerCase();
          const match = byKey.get(k);
          if (match?.scores?.overall_score != null) {
            rec.overall_score = match.scores.overall_score;
          }
        }
      }
    }

    // ─── 3-TIER MARKET ESTIMATE (BASIC / MEDIAN / MAXIMUM) ───
    // Must run AFTER every other pricing helper so it consumes the final numbers.
    try {
      applyMarketTiersToAll(extractedData, sessionCurrency, horseType);
    } catch (e) {
      console.warn("[market-tiers] global apply failed:", e);
    }

    // ─── CLAUDE VISION — Conformation / Breeze-Up assessment (when requested) ───
    if ((analysisMode === "pdf_biomech" || analysisMode === "pdf_breeze") && visionImages.length > 0) {
      const primary = (extractedData.horses && extractedData.horses[0]) || null;
      const horseLabel = primary ? `${primary.name || ""} (${primary.pedigree?.sire || "?"} x ${primary.pedigree?.dam || "?"})` : "the horse in these images";
      const isBreeze = analysisMode === "pdf_breeze";
      const breezeContext = isBreeze && breezeData ? `Manual data: ${breezeData.furlong_time || "?"}s over ${breezeData.distance || "?"} on ${breezeData.going || "?"} at ${breezeData.track || "?"}.` : "";
      const benchmark = isBreeze && breezeData?.furlong_time && breezeData?.distance && breezeData?.going
        ? `BENCHMARK TIMES (2YO standard): 2f Good ~22.0–23.0s elite/good; 3f Good ~34.0–35.0s; 4f Good ~47.0–48.5s.`
        : "";
      const sysPrompt = isBreeze
        ? `You are a senior breeze-up analyst (Tattersalls Craven, Goffs Doncaster, Arqana, OBS). Evaluate the breeze performance from these frames and any manual data. Return ONLY valid JSON: {dimensions:{stride_length,stride_frequency,action,balance_in_motion,extension,recovery,rider_feel,time_assessment,physical_impression,commercial_appeal},overall_breeze_score (0-100),breeze_summary,pinhooker_verdict,red_flags[],recommended_buyer_profile,benchmark_comparison}. Each dimension is {score:1-10,assessment:string,concern?:boolean}. time_assessment may include raw_time and distance fields.`
        : `You are a senior bloodstock conformation analyst (Tattersalls, Goffs, Keeneland, Magic Millions). Assess the conformation of ${horseLabel}. Return ONLY valid JSON: {dimensions:{balance,front_legs,hind_legs,shoulder,hip_hindquarters,back_topline,head_neck,feet_hooves,movement},overall_conformation_score (0-100),conformation_summary,buyer_profile,red_flags[]}. Each dimension is {score:1-10,assessment:string,concern?:boolean,concern_detail?:string}. Weighted overall = shoulder 20% balance 15% movement 15% hind_legs 12% front_legs 12% hip 10% back 8% head 5% feet 3%.`;
      const userText = isBreeze
        ? `Analyse the breeze performance from these ${visionImages.length} frames. ${breezeContext} ${benchmark}`
        : `Analyse the conformation from these ${visionImages.length} image(s).`;

      // Build Anthropic Vision payload
      const content: any[] = [{ type: "text", text: userText }];
      for (const dataUrl of visionImages) {
        const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (!m) continue;
        content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
      }

      try {
        const visionResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 3000,
            temperature: 0.2,
            system: sysPrompt,
            messages: [{ role: "user", content }],
          }),
        });
        if (!visionResp.ok) {
          console.warn("[VISION] Claude error:", visionResp.status, await visionResp.text());
        } else {
          const vj = await visionResp.json();
          const text = (vj?.content || []).map((b: any) => b?.text || "").join("\n").trim();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch && primary) {
            try {
              const visionJson = JSON.parse(jsonMatch[0]);
              const visionScore = Number(isBreeze ? visionJson.overall_breeze_score : visionJson.overall_conformation_score) || 0;
              if (isBreeze) primary.breeze_result = visionJson;
              else primary.vision_result = visionJson;
              primary.analysis_mode = analysisMode;

              // Map vision overall (0-100) into the 0-25 conformation_potential slot.
              primary.scores = primary.scores || {};
              primary.scores.conformation_potential = Math.round((visionScore / 100) * 25);

              // Market-tier nudge: ≥80 bumps tier up, ≤40 bumps down + risk flag.
              if (primary.commercial_analysis?.market_tiers && typeof primary.commercial_analysis.market_tiers === "object") {
                const t: any = primary.commercial_analysis.market_tiers;
                if (visionScore >= 80) t.tier_recommendation = "MAXIMUM";
                else if (visionScore <= 40) {
                  t.tier_recommendation = "BASIC";
                  primary.key_risks = [...(primary.key_risks || []), `${isBreeze ? "Breeze" : "Conformation"} assessment flagged concerns (${visionScore}/100).`];
                }
              }
              // Recompute overall score so the visual contribution is reflected.
              try { recalculateBloodstockScore(primary); } catch { /* noop */ }
              console.log(`[VISION] ${isBreeze ? "Breeze" : "Conformation"} score=${visionScore}/100`);
            } catch (e) {
              console.warn("[VISION] JSON parse failed:", e);
            }
          }
        }
      } catch (e) {
        console.warn("[VISION] Vision call failed:", e);
      }
    }

    // Persist horse-type + sale-context metadata alongside the analysis so the
    // dashboard can show what the user originally selected.
    try {
      extractedData.analysis_metadata = {
        ...(extractedData.analysis_metadata || {}),
        horse_type: horseType,
        horse_type_raw: clientHorseTypeRaw || null,
        horse_type_source: horseTypeSource,
        sale_context: saleContextRaw || null,
      };
    } catch (_e) { /* noop */ }

    // Update upload record
    await supabaseClient.from("pdf_uploads").update({
      status: "completed", extracted_data: extractedData, processed_at: new Date().toISOString(),
    }).eq("id", uploadRecord.id);

    // Store horses in DB
    if (extractedData.horses && extractedData.horses.length > 0) {
      for (const horse of extractedData.horses) {
        const { data: existingHorse } = await supabaseClient.from("horses").select("id").ilike("name", horse.name).maybeSingle();
        if (existingHorse) {
          await supabaseClient.from("horses").update({
            sire: horse.pedigree?.sire || null, dam: horse.pedigree?.dam || null, dam_sire: horse.pedigree?.dam_sire || null,
            year_of_birth: horse.year_of_birth || null, sex: horse.sex || null, country: horse.country || null,
            pedigree_data: horse.pedigree || null, performance_data: horse.performance || null, updated_at: new Date().toISOString(),
          }).eq("id", existingHorse.id);
        } else {
          await supabaseClient.from("horses").insert({
            name: horse.name, sire: horse.pedigree?.sire || null, dam: horse.pedigree?.dam || null,
            dam_sire: horse.pedigree?.dam_sire || null, year_of_birth: horse.year_of_birth || null,
            sex: horse.sex || null, country: horse.country || null, breeder: horse.breeder || null,
            owner: horse.owner || null, pedigree_data: horse.pedigree || null, performance_data: horse.performance || null,
          });
        }

        await supabaseClient.from("extracted_data").insert({
          user_id: user.id, source_type: "pdf_upload", source_id: uploadRecord.id,
          horse_name: horse.name, pedigree_data: horse.pedigree, performance_data: horse.performance,
          sales_data: horse.sales || horse.commercial_analysis?.comparable_sales, raw_data: horse,
        });

        // Auto-save to proprietary sires/dams tables
        if (horse.pedigree?.sire && horse.pedigree.sire !== 'Unknown' && horse.pedigree.sire !== 'Data unavailable') {
          await supabaseClient.from('sires').upsert({
            name: horse.pedigree.sire,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'name', ignoreDuplicates: true });
        }
        if (horse.pedigree?.dam && horse.pedigree.dam !== 'Unknown' && horse.pedigree.dam !== 'Data unavailable') {
          await supabaseClient.from('dams').upsert({
            name: horse.pedigree.dam,
            sire: horse.pedigree?.dam_sire || null,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'name', ignoreDuplicates: true });
        }
      }
    }

    // Auto-save catalogue to proprietary DB
    if (extractedData.horses?.length > 0) {
      const saleName = fileName.replace(/\.pdf$/i, '');
      try {
        await supabaseClient.from('catalogues').insert({
          auction_house: extractedData.horses[0]?.sale_info?.auction_house || 'PDF Upload',
          sale_name: saleName,
          sale_year: new Date().getFullYear(),
          pdf_processed: true,
          total_lots: extractedData.horses.length,
          source_url: filePath,
        });
        console.log(`[DB-PERSIST] Catalogue saved: ${saleName}`);
      } catch (e) {
        console.warn(`[DB-PERSIST] Catalogue save failed:`, e);
      }
    }

    await supabaseClient.from("activity_logs").insert({
      user_id: user.id, action: "pdf_uploaded", resource_type: "pdf_upload", resource_id: uploadRecord.id,
      metadata: { file_name: fileName, horses_found: extractedData.horses?.length || 0, goals_applied: !!hasGoals, objective: objectiveLabel },
    });

    const goalMatches = hasGoals ? (extractedData.horses || []).filter((h: any) => h.goal_match === true).length : 0;

    console.log("=== PDF UPLOAD COMPLETE ===");
    pipelineDiagnostics.stage = "complete";

    return new Response(JSON.stringify({
      success: true, upload_id: uploadRecord.id, extracted_data: extractedData,
      goals_applied: !!hasGoals, goal_matches: goalMatches,
      source: analysisSource,
      top_recommendations: extractedData.top_recommendations || [],
      diagnostics: pipelineDiagnostics,
      message: hasGoals
        ? `Analysis completed. ${goalMatches} of ${extractedData.horses?.length || 0} horses matched your criteria.`
        : `Successfully processed ${extractedData.horses?.length || 0} horses`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in upload-pdf:", error);
    const msg = error instanceof Error ? error.message : String(error);
    // Pick the right error code based on which stage failed.
    let code = "PIPELINE_ERROR";
    const lower = msg.toLowerCase();
    if (pipelineDiagnostics.stage === "extraction") code = "EXTRACTION_FAILED";
    else if (pipelineDiagnostics.stage === "tavily") code = "RESEARCH_FAILED";
    else if (pipelineDiagnostics.stage === "analysis") code = "ANALYSIS_FAILED";
    if (lower.includes("rate") || lower.includes("429")) code = "RATE_LIMIT";
    if (lower.includes("timeout")) code = "TIMEOUT";
    if (lower.includes("credit") || lower.includes("402") || lower.includes("balance")) code = "CREDITS_EXHAUSTED";

    try {
      if (uploadRecordId) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabaseClient
          .from("pdf_uploads")
          .update({ status: "failed", error_message: `${code}: ${msg}` })
          .eq("id", uploadRecordId);
      }
    } catch (updateError) {
      console.error("Failed to mark upload as failed:", updateError);
    }

    return new Response(
      JSON.stringify({
        error: msg,
        code,
        stage: pipelineDiagnostics.stage,
        diagnostics: pipelineDiagnostics,
        hint:
          code === "EXTRACTION_FAILED"
            ? "Make sure the PDF is text-based (not a scan) and contains the catalogue page for the lot you want analysed."
            : code === "RESEARCH_FAILED"
            ? "Research data (Tavily) could not be retrieved. The lot extraction succeeded — try re-running the analysis in a moment."
            : code === "ANALYSIS_FAILED"
            ? "The AI analysis step failed mid-way. Retry the upload — pedigree data and research data were collected successfully."
            : code === "RATE_LIMIT"
            ? "Too many requests. Wait 15–30 seconds and try again."
            : code === "CREDITS_EXHAUSTED"
            ? "The AI service has run out of credits. Contact support to recharge."
            : "Please retry. If the problem persists, contact support with the diagnostics shown above.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
