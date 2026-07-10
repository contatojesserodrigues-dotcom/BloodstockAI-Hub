import { PIPELINE_CONFIG, SITE_TIERS } from "@/config/pipeline";
import { bloodstockCache } from "./cacheService";
import { supabase } from "@/integrations/supabase/client";

export interface HorseIdentifier {
  name: string;
  country: string;
  birthYear?: number;
  registryId?: string;
  sex?: "colt" | "filly" | "horse" | "mare" | "gelding";
}

export interface PedigreeData {
  sire: { name: string; country: string; birthYear: number; registryId?: string };
  dam: { name: string; country: string; birthYear: number; registryId?: string };
  damSire: { name: string; country: string };
  generation3: string[];
  generation4: string[];
  inbreeding: string[];
  sourceUrl: string;
  sourceName: string;
  collectedAt: string;
  confidence: number;
}

export interface PerformanceData {
  totalStarts: number;
  wins: number;
  places: number;
  shows: number;
  earnings: { local: number; currency: string; usd: number };
  bestRating: { value: number; system: string };
  raceClass: string;
  bestDistance: string;
  preferredGoing: string;
  trackType: string;
  last5Races: RaceResult[];
  sourceUrl: string;
  confidence: number;
}

export interface RaceResult {
  date: string;
  track: string;
  country: string;
  position: number;
  distance: string;
  going: string;
  class: string;
  rating?: number;
}

export async function searchHorsePedigree(horse: HorseIdentifier): Promise<PedigreeData | null> {
  const cacheKey = bloodstockCache.buildKey(horse.name, horse.country, "pedigree");
  const cached = bloodstockCache.get<PedigreeData>(cacheKey, "pedigree");
  if (cached) return cached;

  const query = buildPedigreeQuery(horse);

  for (const site of SITE_TIERS.pedigree.tier1) {
    const result = await queryPerplexityViaEdgeFunction(query, [site], "pedigree");
    if (result && result.confidence >= PIPELINE_CONFIG.search.confidenceThreshold) {
      const validated = validateAndNormalizePedigree(result, horse);
      if (validated) {
        bloodstockCache.set(cacheKey, validated, "pedigree", site);
        return validated;
      }
    }
  }

  console.warn(`[BloodstockAI] Tier1 failed for ${horse.name} — trying Tier2`);

  for (const site of SITE_TIERS.pedigree.tier2) {
    const result = await queryPerplexityViaEdgeFunction(query, [site], "pedigree");
    if (result && result.confidence >= 0.75) {
      const validated = validateAndNormalizePedigree(result, horse);
      if (validated) {
        bloodstockCache.set(cacheKey, validated, "pedigree", site);
        return validated;
      }
    }
  }

  return null;
}

export async function searchHorsePerformance(horse: HorseIdentifier): Promise<PerformanceData | null> {
  const cacheKey = bloodstockCache.buildKey(horse.name, horse.country, "performance");
  const cached = bloodstockCache.get<PerformanceData>(cacheKey, "performance");
  if (cached) return cached;

  const query = buildPerformanceQuery(horse);

  for (const site of SITE_TIERS.performance.tier1) {
    const result = await queryPerplexityViaEdgeFunction(query, [site], "performance");
    if (result && result.confidence >= 0.80) {
      bloodstockCache.set(cacheKey, result, "performance", site);
      return result;
    }
  }

  for (const site of SITE_TIERS.performance.tier2) {
    const result = await queryPerplexityViaEdgeFunction(query, [site], "performance");
    if (result && result.confidence >= 0.70) {
      bloodstockCache.set(cacheKey, result, "performance", site);
      return result;
    }
  }

  return null;
}

async function queryPerplexityViaEdgeFunction(
  query: string,
  sites: string[],
  queryType: string
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke("horse-search", {
      body: { query, sites, queryType },
    });
    if (error) return null;
    if (data?.error) return null;
    return data;
  } catch (err) {
    console.error(`[horseSearch] Edge function error for ${sites[0]}:`, err);
    return null;
  }
}

function buildPedigreeQuery(horse: HorseIdentifier): string {
  return `Find the COMPLETE and ACCURATE pedigree for this specific thoroughbred horse:
Horse Name: "${horse.name}"
Country of Registration: ${horse.country}
Year of Birth: ${horse.birthYear || "unknown"}
Registry ID: ${horse.registryId || "not provided"}
Sex: ${horse.sex || "unknown"}

CRITICAL INSTRUCTIONS:
1. Search ONLY for this exact horse — do not confuse with horses of similar names
2. If multiple horses exist with this name, match by country + birth year
3. Return data from official Stud Book or racing registry ONLY
4. If uncertain about any field use null — NEVER guess

Return ONLY this JSON:
{
  "sire": { "name": "", "country": "", "birthYear": 0, "registryId": "" },
  "dam": { "name": "", "country": "", "birthYear": 0, "registryId": "" },
  "damSire": { "name": "", "country": "" },
  "generation3": ["paternal grandsire", "paternal granddam sire", "maternal grandsire", "maternal granddam sire"],
  "generation4": [],
  "inbreeding": ["e.g. Northern Dancer 4x4"],
  "sourceUrl": "exact URL",
  "sourceName": "site name",
  "collectedAt": "ISO date",
  "confidence": 0.0
}
If horse not found with certainty return: { "error": "NOT_FOUND", "reason": "explanation" }`;
}

function buildPerformanceQuery(horse: HorseIdentifier): string {
  return `Find COMPLETE race performance data for this specific thoroughbred:
Horse Name: "${horse.name}"
Country: ${horse.country}
Birth Year: ${horse.birthYear || "unknown"}
Registry ID: ${horse.registryId || "not provided"}

CRITICAL: Return data for THIS horse only. Verify name + country + year match before returning.

Return ONLY this JSON:
{
  "totalStarts": 0,
  "wins": 0,
  "places": 0,
  "shows": 0,
  "earnings": { "local": 0, "currency": "GBP", "usd": 0 },
  "bestRating": { "value": 0, "system": "Timeform/BHA/Beyer" },
  "raceClass": "G1/G2/G3/Listed/Handicap",
  "bestDistance": "1m2f",
  "preferredGoing": "Good to Firm",
  "trackType": "Turf/Dirt/Synthetic",
  "last5Races": [
    { "date": "", "track": "", "country": "", "position": 0, "distance": "", "going": "", "class": "", "rating": 0 }
  ],
  "sourceUrl": "exact URL",
  "confidence": 0.0
}
If not found with certainty: { "error": "NOT_FOUND" }`;
}

function validateAndNormalizePedigree(data: any, horse: HorseIdentifier): PedigreeData | null {
  if (!data.sire?.name || !data.dam?.name) {
    console.error(`[Validation] Missing sire or dam for ${horse.name}`);
    return null;
  }
  if (!data.sourceUrl) {
    console.warn(`[Validation] No source URL for ${horse.name} — data may be unreliable`);
  }
  return {
    sire: data.sire,
    dam: data.dam,
    damSire: data.damSire || { name: "Unknown", country: "" },
    generation3: data.generation3 || [],
    generation4: data.generation4 || [],
    inbreeding: data.inbreeding || [],
    sourceUrl: data.sourceUrl || "",
    sourceName: data.sourceName || "",
    collectedAt: data.collectedAt || new Date().toISOString(),
    confidence: data.confidence || 0,
  };
}
