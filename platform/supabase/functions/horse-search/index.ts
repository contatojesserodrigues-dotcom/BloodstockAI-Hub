import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  searchPerplexity,
  callClaude,
  parseJsonFromResponse,
  QUALITY_CONTROLS,
  UNNAMED_HORSE_PROMPT,
} from "../_shared/ai-clients.ts";
import { tavilySearch, formatTavilyContext, citationsFromTavily } from "../_shared/tavily-client.ts";
import { persistHorseData } from "../_shared/data-persistence.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// TAVILY + CLAUDE PIPELINE — Tavily searches, Claude analyzes
// Perplexity retained as legacy fallback when Tavily/Anthropic unavailable
// ═══════════════════════════════════════════════════════════════

const INTERNAL_NOT_FOUND_REGEX = /not found in verified sources(?:\s*[-—]\s*checked:[^\n]*)?/gi;
const INTERNAL_CHECKED_REGEX = /checked:\s*[^\n]+/gi;
const INTERNAL_SOURCE_LIST_REGEX = /(?:verified\s+sources?|sources?)\s*:[^\n]*/gi;
const INTERNAL_ERROR_TOKEN_REGEX = /\b(?:PERPLEXITY|CLAUDE)_[A-Z0-9_:-]+\b/gi;
const GENERIC_FAILURE_VALUE_REGEX = /unable to retrieve data\. please try again\.?/gi;
const RAW_URL_LIST_REGEX = /^(?:https?:\/\/[^\s,]+\s*,?\s*){2,}$/i;

function sanitizeUserString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cleaned = value
    .replace(INTERNAL_NOT_FOUND_REGEX, "Data unavailable")
    .replace(INTERNAL_CHECKED_REGEX, "")
    .replace(INTERNAL_SOURCE_LIST_REGEX, "")
    .replace(INTERNAL_ERROR_TOKEN_REGEX, "")
    .replace(GENERIC_FAILURE_VALUE_REGEX, "Data unavailable")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned || RAW_URL_LIST_REGEX.test(cleaned)) return "Data unavailable";
  return cleaned;
}

function sanitizePayload<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizePayload(val);
    }
    return output as T;
  }
  return sanitizeUserString(value) as T;
}

function isLikelyUnnamedHorse(horseName: string): boolean {
  return /(?:^unnamed\b|yearling|weanling|colt by|filly by|unraced)/i.test(horseName);
}

function buildCatalogueSection(catalogueData?: { sire?: string; dam?: string; damSire?: string; isYoung?: boolean }): string {
  if (!catalogueData?.sire) return "";
  return `
Known catalogue data (use as ground truth):
- Sire: ${catalogueData.sire}
- Dam: ${catalogueData.dam || "Unknown"}
- Dam Sire: ${catalogueData.damSire || "Unknown"}
${catalogueData.isYoung ? "This is a young/unraced horse. Focus on family analysis, sire stats, dam produce record, and siblings." : ""}`;
}

// ═══ TAVILY + CLAUDE — primary pipeline ═══
async function searchHorseWithTavilyAndClaude(
  horseName: string,
  anthropicKey: string,
  filters: any,
  catalogueData?: { sire?: string; dam?: string; damSire?: string; isYoung?: boolean },
): Promise<{ searchResultsData: any; isLikelyUnnamed: boolean; citations: string[] }> {
  const isUnnamed = isLikelyUnnamedHorse(horseName) || !!catalogueData?.isYoung;
  const sireHint = catalogueData?.sire ? ` by ${catalogueData.sire}` : "";
  const damHint = catalogueData?.dam ? ` out of ${catalogueData.dam}` : "";
  const searchName = `${horseName}${sireHint}${damHint}`;

  console.log(`[PIPELINE] Tavily + Claude search for: ${searchName}`);

  const [pedigreeRes, performanceRes, salesRes] = await Promise.all([
    tavilySearch(`"${searchName}" thoroughbred complete pedigree sire dam dam-sire siblings progeny inbreeding dosage`, "HORSE_PEDIGREE"),
    tavilySearch(`"${searchName}" thoroughbred race record career statistics owner trainer breeder earnings RPR Timeform black type`, "HORSE_PERFORMANCE"),
    tavilySearch(`"${searchName}" thoroughbred auction sales history Keeneland Tattersalls Goffs price buyer seller`, "HORSE_SALES"),
  ]);

  const researchResults = [pedigreeRes, performanceRes, salesRes];
  const researchContext = formatTavilyContext(researchResults);
  const citations = citationsFromTavily(researchResults);
  const catalogueSection = buildCatalogueSection(catalogueData);
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are BloodstockAI, the world's leading thoroughbred research analyst.
Use ONLY the web research provided. Never fabricate data.
Calculate dosage, inbreeding coefficient, nick analysis, and all scores from verified facts.
${QUALITY_CONTROLS}
${isUnnamed ? UNNAMED_HORSE_PROMPT : ""}
Return ONLY valid JSON. Never mention AI vendors or search tools.`;

  const userPrompt = `Analyze thoroughbred "${horseName}" using research collected on ${today}.

${researchContext}
${catalogueSection}
${filters ? `Search context: ${JSON.stringify(filters)}` : ""}
${isUnnamed ? UNNAMED_HORSE_PROMPT : ""}

CRITICAL — find owner, trainer, breeder from research. Fill complete 5-generation pedigree where data exists.

Return this JSON structure:
{
  "horses": [{
    "name": "${horseName}",
    "year_of_birth": 0, "sex": "", "country": "", "color": "",
    "current_owner": "", "breeder": "", "trainer": "", "score": 0,
    "pedigree": { "sire": "", "dam": "", "dam_sire": "", "siblings": [], "progeny": [], "generation_3": [], "generation_4": [], "generation_5": [] },
    "inbreeding": { "pattern": "", "coefficient": "", "assessment": "", "details": "" },
    "dosage": { "profile": "", "dosage_index": "", "center_of_distribution": "", "distance_aptitude": "", "details": "" },
    "nick_analysis": { "cross": "", "rating": "", "stakes_winners_from_cross": "", "justification": "" },
    "performance": [],
    "career_stats": { "starts": 0, "wins": 0, "seconds": 0, "thirds": 0, "earnings": 0, "earnings_currency": "", "win_rate": "", "best_speed_figure": "", "best_distance": "", "best_surface": "", "highest_class": "" },
    "sales": [],
    "siblings_analysis": { "total_foals": 0, "total_raced": 0, "total_winners": 0, "stakes_winners": 0, "stakes_percentage": "", "best_sibling": "", "dam_rating": "", "details": [] },
    "chart_data": { "performance_by_race": [], "distance_breakdown": [], "class_breakdown": [], "sales_history_chart": [] },
    "scores": { "pedigree_quality": 0, "performance_rating": 0, "nick_score": 0, "dosage_score": 0, "overall": 0, "potential_rating": "", "data_confidence": "High|Medium|Low" },
    "genetic_profile": { "dosage_index": 0, "centre_of_distribution": 0, "dosage_profile": { "brilliant": 0, "intermediate": 0, "classic": 0, "solid": 0, "professional": 0 }, "dominant_bloodlines": [], "racing_type": "", "breeding_potential": "", "key_ancestors": [] },
    "ai_report": { "summary": "", "strengths": [], "concerns": [], "racing_prospects": "", "breeding_value": "", "market_assessment": "", "recommended_distance": "", "recommended_surface": "" },
    "data_quality": { "overall_score": 0, "pedigree_complete": false, "performance_verified": false, "sources_used": [], "missing_fields": [] },
    "key_insights": [],
    "recommendation": "",
    "insight": ""
  }]
}

SCORING: G1=85-95, G2=75-85, G3=65-75, Listed=55-65, Maiden=40-55, Unraced=30-40, minimum=25.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const claudeResponse = await callClaude(anthropicKey, systemPrompt, userPrompt, {
        maxTokens: 12000,
        temperature: 0.15,
      });
      let parsed = parseJsonFromResponse(claudeResponse);
      if (!parsed?.horses?.length) {
        const jsonMatch = claudeResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
        }
      }
      if (parsed?.horses?.length) {
        parsed.horses = parsed.horses.map((horse: any) => normalizeHorse(horse, horseName, citations));
        return { searchResultsData: sanitizePayload(parsed), isLikelyUnnamed: isUnnamed, citations };
      }
      console.warn(`[PIPELINE] Tavily+Claude attempt ${attempt}: JSON parse failed`);
    } catch (e) {
      console.warn(`[PIPELINE] Tavily+Claude attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  // Structured parse failed — return research-enriched fallback
  return {
    searchResultsData: sanitizePayload({
      horses: [normalizeHorse({
        name: horseName,
        ai_report: {
          summary: `Research collected for ${horseName}. Review pedigree and performance data below.`,
          racing_prospects: performanceRes.answer || pedigreeRes.answer || "Data unavailable",
          market_assessment: salesRes.answer || "Data unavailable",
        },
        data_quality: { overall_score: 35, pedigree_complete: false, performance_verified: !!performanceRes.answer, sources_used: citations, missing_fields: ["structured_parse"] },
      }, horseName, citations)],
    }),
    isLikelyUnnamed: isUnnamed,
    citations,
  };
}

// ═══ PERPLEXITY STRUCTURED SEARCH — legacy fallback ═══

async function searchHorseWithPerplexity(
  horseName: string,
  perplexityKey: string,
  filters: any,
  catalogueData?: { sire?: string; dam?: string; damSire?: string; isYoung?: boolean }
): Promise<{ searchResultsData: any; isLikelyUnnamed: boolean; citations: string[] }> {
  const isUnnamed = isLikelyUnnamedHorse(horseName) || !!catalogueData?.isYoung;
  const sireHint = catalogueData?.sire ? ` by ${catalogueData.sire}` : "";
  const damHint = catalogueData?.dam ? ` out of ${catalogueData.dam}` : "";
  const searchName = `${horseName}${sireHint}${damHint}`;

  console.log(`[PIPELINE] Perplexity-only search for: ${searchName}`);

  const catalogueSection = buildCatalogueSection(catalogueData);

  const today = new Date().toISOString().split("T")[0];

  // Single comprehensive Perplexity query requesting structured JSON
  const structuredQuery = `Find COMPLETE data for the thoroughbred horse "${horseName}".
${catalogueSection}
${filters ? `Context: ${JSON.stringify(filters)}` : ""}
${isUnnamed ? UNNAMED_HORSE_PROMPT : ""}

CRITICAL PRIORITY — CONNECTIONS DATA:
You MUST find and return the following information. Search deeply across all sources:
1. **OWNER / CURRENT OWNER**: The registered owner or racing syndicate. Check racingpost.com horse pages, equibase.com entries, racing.com.au, jra.go.jp. If the horse has been sold or retired, list the LAST KNOWN OWNER. If the horse is a stallion at stud, the stud farm owner counts as owner.
2. **TRAINER**: The current or most recent trainer. Even if the horse is retired, return the last trainer who trained it during its racing career. Check racingpost.com, equibase.com, racing.com.au.
3. **BREEDER**: The person, entity, or stud farm that bred the horse. Check racingpost.com, pedigreequery.com, keeneland.com sales records, tattersalls.com, equibase.com.

These three fields are HIGH PRIORITY. Do NOT return "Data unavailable" unless you have exhausted all sources.

Search pedigreequery.com, allbreedpedigree.com, racingpost.com, equibase.com, breednet.com.au, racingaustralia.horse, bloodhorse.com, france-galop.com, keeneland.com, tattersalls.com, fasigtipton.com, magicmillions.com.au, arqana.com, thoroughbreddailynews.com.

TODAY: ${today}

Return ALL available data in this EXACT JSON format. Fill every field you can find. Use "Data unavailable" ONLY as a last resort for fields you truly cannot find:

\`\`\`json
{
  "horses": [{
    "name": "${horseName}",
    "year_of_birth": 0,
    "sex": "",
    "country": "",
    "color": "",
    "current_owner": "",
    "breeder": "",
    "trainer": "",
    "score": 0,
...
    "recommendation": "",
    "insight": ""
  }]
}
\`\`\`

SCORING STANDARDS:
- G1 winner = 85-95, G2 = 75-85, G3 = 65-75, Listed = 55-65
- Maiden winner = 40-55, Unraced = 30-40, Minimum = 25

Fill the complete 5-generation pedigree (all 62 ancestors). Calculate dosage, inbreeding, and nick analysis. Include ALL race records and sales history found. Return ONLY the JSON.`;

  const sources = [
    "pedigreequery.com",
    "allbreedpedigree.com",
    "racingpost.com",
    "equibase.com",
    "breednet.com.au",
    "racingaustralia.horse",
    "bloodhorse.com",
    "france-galop.com",
    "keeneland.com",
    "tattersalls.com",
    "thoroughbreddailynews.com",
  ];

  let result: { content: string; citations: string[] };
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await searchPerplexity(perplexityKey, structuredQuery, sources, "HORSE_SEARCH_STRUCTURED");
      
      let parsed = parseJsonFromResponse(result.content);
      
      if (!parsed || !Array.isArray(parsed.horses) || parsed.horses.length === 0) {
        // Try to extract just the JSON block
        const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
        }
      }

      if (parsed && Array.isArray(parsed.horses) && parsed.horses.length > 0) {
        // Normalize output
        parsed.horses = parsed.horses.map((horse: any) => normalizeHorse(horse, horseName, result.citations));
        parsed = sanitizePayload(parsed);
        return { searchResultsData: parsed, isLikelyUnnamed: isUnnamed, citations: result.citations };
      }

      console.warn(`[PIPELINE] Attempt ${attempt}: JSON parse failed, retrying...`);
    } catch (e) {
      lastError = e;
      console.warn(`[PIPELINE] Attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
    }

    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  // If structured query failed, try simpler approach with parallel searches
  console.log("[PIPELINE] Structured query failed, falling back to parallel raw searches...");
  return await fallbackRawSearches(horseName, perplexityKey, isUnnamed, catalogueData);
}

async function fallbackRawSearches(
  horseName: string,
  perplexityKey: string,
  isUnnamed: boolean,
  catalogueData?: { sire?: string; dam?: string; damSire?: string; isYoung?: boolean }
): Promise<{ searchResultsData: any; isLikelyUnnamed: boolean; citations: string[] }> {
  const sireHint = catalogueData?.sire ? ` by ${catalogueData.sire}` : "";
  const damHint = catalogueData?.dam ? ` out of ${catalogueData.dam}` : "";
  const searchName = `${horseName}${sireHint}${damHint}`;

  const [pedigreeResult, performanceResult, salesResult] = await Promise.all([
    searchPerplexity(perplexityKey,
      `Complete pedigree, race record, performance data and sales history for thoroughbred horse "${searchName}". Include sire, dam, dam sire, full 5-generation pedigree, siblings, progeny, inbreeding patterns, dosage.`,
      ["pedigreequery.com", "allbreedpedigree.com", "racingpost.com", "equibase.com", "breednet.com.au", "racingaustralia.horse", "bloodhorse.com"],
      "HORSE_PEDIGREE_RAW"
    ).catch(() => ({ content: "", citations: [] as string[] })),
    searchPerplexity(perplexityKey,
      `Complete race record, career statistics, speed figures, earnings for thoroughbred "${searchName}". CRITICAL: Find the CURRENT OWNER (or last known owner/syndicate), the TRAINER (current or most recent during racing career), and the BREEDER. These are high priority fields.`,
      ["racingpost.com", "equibase.com", "racingaustralia.horse", "breednet.com.au", "bloodhorse.com"],
      "HORSE_PERF_RAW"
    ).catch(() => ({ content: "", citations: [] as string[] })),
    searchPerplexity(perplexityKey,
      `Auction and sales history for thoroughbred "${searchName}". Include price, date, auction house, buyer, seller.`,
      ["keeneland.com", "tattersalls.com", "fasigtipton.com", "magicmillions.com.au", "arqana.com", "thoroughbreddailynews.com"],
      "HORSE_SALES_RAW"
    ).catch(() => ({ content: "", citations: [] as string[] })),
  ]);

  const allCitations = [...pedigreeResult.citations, ...performanceResult.citations, ...salesResult.citations]
    .filter((c, i, a) => a.indexOf(c) === i);

  // Build a basic horse object from raw text
  const horse = {
    name: horseName,
    year_of_birth: 0,
    sex: "",
    country: "",
    color: "",
    current_owner: "Data unavailable",
    breeder: "Data unavailable",
    trainer: "Data unavailable",
    score: 50,
    pedigree: { sire: "Data unavailable", dam: "Data unavailable", dam_sire: "Data unavailable", siblings: [], progeny: [], generation_3: [], generation_4: [], generation_5: [] },
    inbreeding: { pattern: "See raw data", coefficient: "", assessment: "", details: pedigreeResult.content.substring(0, 500) },
    dosage: { profile: "", dosage_index: "", center_of_distribution: "", distance_aptitude: "", details: "" },
    nick_analysis: { cross: "", rating: "", stakes_winners_from_cross: "", justification: "" },
    performance: [],
    career_stats: { starts: 0, wins: 0, seconds: 0, thirds: 0, earnings: 0, earnings_currency: "", win_rate: "", best_speed_figure: "", best_distance: "", best_surface: "", highest_class: "" },
    sales: [],
    siblings_analysis: { total_foals: 0, total_raced: 0, total_winners: 0, stakes_winners: 0, stakes_percentage: "", best_sibling: "", dam_rating: "", details: [] },
    chart_data: { performance_by_race: [], distance_breakdown: [], class_breakdown: [], sales_history_chart: [] },
    scores: { pedigree_quality: 50, performance_rating: 50, nick_score: 50, dosage_score: 50, overall: 50, potential_rating: "Balanced", data_confidence: "Low" },
    genetic_profile: { dosage_index: 0, centre_of_distribution: 0, dosage_profile: { brilliant: 0, intermediate: 0, classic: 0, solid: 0, professional: 0 }, dominant_bloodlines: [], racing_type: "", breeding_potential: "", key_ancestors: [] },
    ai_report: {
      summary: `Research data collected for ${horseName}. Pedigree: ${pedigreeResult.content.substring(0, 300)}...`,
      strengths: [],
      concerns: [],
      racing_prospects: performanceResult.content.substring(0, 500) || "Data unavailable",
      breeding_value: "See pedigree data above",
      market_assessment: salesResult.content.substring(0, 500) || "Data unavailable",
      recommended_distance: "", recommended_surface: "",
    },
    data_quality: {
      overall_score: 30,
      pedigree_complete: false,
      performance_verified: performanceResult.content.length > 100,
      sources_used: allCitations.length > 0 ? allCitations : ["Web search data"],
      missing_fields: ["structured_data"],
    },
    key_insights: ["Data collected from web sources. Some fields may require manual review."],
    recommendation: "Data available — review raw research below.",
    insight: `Research completed for ${horseName} from ${allCitations.length} sources.`,
  };

  return {
    searchResultsData: sanitizePayload({ horses: [horse] }),
    isLikelyUnnamed: isUnnamed,
    citations: allCitations,
  };
}

function normalizeHorse(horse: any, horseName: string, citations: string[]): any {
  return {
    ...horse,
    name: horse.name || horseName,
    current_owner: horse.current_owner || "Data unavailable",
    breeder: horse.breeder || "Data unavailable",
    trainer: horse.trainer || "Data unavailable",
    score: Math.max(25, Number(horse.score || horse?.scores?.overall || 60)),
    insight: horse.insight || horse?.ai_report?.summary || "Analysis complete.",
    pedigree: horse.pedigree || { sire: "Data unavailable", dam: "Data unavailable", dam_sire: "Data unavailable", siblings: [], progeny: [] },
    performance: Array.isArray(horse.performance) ? horse.performance : [],
    sales: Array.isArray(horse.sales) ? horse.sales : [],
    chart_data: horse.chart_data || { performance_by_race: [], distance_breakdown: [], class_breakdown: [], sales_history_chart: [] },
    scores: {
      pedigree_quality: Math.max(25, Number(horse?.scores?.pedigree_quality || 50)),
      performance_rating: Math.max(25, Number(horse?.scores?.performance_rating || 50)),
      nick_score: Math.max(25, Number(horse?.scores?.nick_score || 50)),
      dosage_score: Math.max(25, Number(horse?.scores?.dosage_score || 50)),
      overall: Math.max(25, Number(horse?.scores?.overall || horse.score || 60)),
      potential_rating: horse?.scores?.potential_rating || "Balanced",
      data_confidence: horse?.scores?.data_confidence || "Medium",
    },
    genetic_profile: horse.genetic_profile || {
      dosage_index: 0, centre_of_distribution: 0,
      dosage_profile: { brilliant: 0, intermediate: 0, classic: 0, solid: 0, professional: 0 },
      dominant_bloodlines: [], racing_type: "Classic", breeding_potential: "Data unavailable", key_ancestors: [],
    },
    ai_report: horse.ai_report || {
      summary: horse.insight || "Data unavailable", strengths: horse.key_insights || [], concerns: [],
      racing_prospects: "Data unavailable", breeding_value: "Data unavailable", market_assessment: "Data unavailable",
      recommended_distance: horse?.career_stats?.best_distance || "Data unavailable", recommended_surface: horse?.career_stats?.best_surface || "Any",
    },
    data_quality: horse.data_quality || {
      overall_score: calculateDataQualityScore(horse),
      pedigree_complete: !!(horse.pedigree?.sire && horse.pedigree?.dam && horse.pedigree?.dam_sire),
      performance_verified: Array.isArray(horse.performance) && horse.performance.length > 0,
      sources_used: citations.length > 0 ? citations : ["Web search data"],
      missing_fields: getMissingFields(horse),
    },
  };
}

function calculateDataQualityScore(horse: any): number {
  let score = 0;
  if (horse.pedigree?.sire && horse.pedigree.sire !== "Data unavailable") score += 15;
  if (horse.pedigree?.dam && horse.pedigree.dam !== "Data unavailable") score += 15;
  if (horse.pedigree?.dam_sire && horse.pedigree.dam_sire !== "Data unavailable") score += 10;
  if (horse.pedigree?.generation_3?.length >= 4) score += 10;
  if (horse.pedigree?.generation_4?.length >= 8) score += 10;
  if (horse.pedigree?.generation_5?.length >= 16) score += 10;
  if (Array.isArray(horse.performance) && horse.performance.length > 0) score += 15;
  if (horse.career_stats?.starts > 0) score += 5;
  if (horse.career_stats?.best_speed_figure) score += 5;
  if (Array.isArray(horse.sales) && horse.sales.length > 0) score += 5;
  return Math.min(score, 100);
}

function getMissingFields(horse: any): string[] {
  const missing: string[] = [];
  if (!horse.pedigree?.sire || horse.pedigree.sire === "Data unavailable") missing.push("sire");
  if (!horse.pedigree?.dam || horse.pedigree.dam === "Data unavailable") missing.push("dam");
  if (!horse.pedigree?.dam_sire || horse.pedigree.dam_sire === "Data unavailable") missing.push("dam_sire");
  if (!horse.pedigree?.generation_4?.length || horse.pedigree.generation_4.length < 16) missing.push("generation_4");
  if (!horse.pedigree?.generation_5?.length || horse.pedigree.generation_5.length < 32) missing.push("generation_5");
  if (!Array.isArray(horse.performance) || horse.performance.length === 0) missing.push("performance_data");
  if (!horse.career_stats?.starts) missing.push("career_stats");
  if (!Array.isArray(horse.sales) || horse.sales.length === 0) missing.push("sales_history");
  return missing;
}

// ═══ MAIN HANDLER ═══
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();

    // ═══ SERVICE-LAYER ROUTE (legacy compatibility) ═══
    if (body.query && body.queryType) {
      return await handleServiceQuery(body, supabaseClient, user.id);
    }

    // ═══ MAIN HORSE SEARCH ═══
    const horseSearchSchema = z.object({
      horse_name: z.string().min(2).max(100).trim(),
      country: z.string().max(10).optional(),
      birth_year: z.number().optional(),
      sire: z.string().max(100).optional(),
      dam: z.string().max(100).optional(),
      dam_sire: z.string().max(100).optional(),
      is_young_horse: z.boolean().optional(),
      filters: z.object({
        race_type: z.string().max(50).optional(),
        auction_class: z.string().max(50).optional(),
        goal: z.string().max(200).optional(),
        country: z.string().max(10).optional(),
      }).optional(),
    });

    const parseResult = horseSearchSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { horse_name: horseName, filters, sire: catalogueSire, dam: catalogueDam, dam_sire: catalogueDamSire, is_young_horse: isYoungHorse } = parseResult.data;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const tavilyKey = Deno.env.get("TAVILY_API_KEY");
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!anthropicKey || !tavilyKey) {
      if (!perplexityKey) throw new Error("Analysis service is not configured");
    }

    console.log("=== HORSE SEARCH START (Tavily + Claude) ===", horseName);

    const catalogueCtx = catalogueSire ? { sire: catalogueSire, dam: catalogueDam, damSire: catalogueDamSire, isYoung: isYoungHorse } : undefined;
    const { searchResultsData, isLikelyUnnamed, citations } = anthropicKey && tavilyKey
      ? await searchHorseWithTavilyAndClaude(horseName, anthropicKey, filters, catalogueCtx)
      : await searchHorseWithPerplexity(horseName, perplexityKey!, filters, catalogueCtx);

    // ═══ AUTO-SAVE: Persist data ═══
    const persistPromises: Promise<any>[] = [];
    for (const horse of (searchResultsData.horses || [])) {
      persistPromises.push(
        persistHorseData(supabaseClient, horse.name || horseName, horse, { pedigree: "", performance: "", sales: "" }, JSON.stringify(searchResultsData), citations)
      );
    }

    await Promise.all([
      ...persistPromises,
      supabaseClient.from("search_history").insert({
        user_id: user.id, search_type: "horse_search",
        search_query: { horse_name: horseName, filters },
        results_data: { horses: searchResultsData.horses },
      }),
      ...(searchResultsData.horses || []).map((horse: any) =>
        supabaseClient.from("extracted_data").insert({
          user_id: user.id, source_type: "horse_search",
          horse_name: horse.name, pedigree_data: horse.pedigree,
          performance_data: horse.performance, sales_data: horse.sales,
          progeny_data: horse.pedigree?.progeny, siblings_data: horse.pedigree?.siblings,
          raw_data: horse,
        })
      ),
      supabaseClient.from("activity_logs").insert({
        user_id: user.id, action: "horse_search", resource_type: "horse",
        metadata: {
          horse_name: horseName, filters,
          results_count: searchResultsData.horses?.length || 0,
          engine: anthropicKey && tavilyKey ? "tavily_claude" : "perplexity_fallback",
          citations_count: citations.length,
          unnamed_horse: isLikelyUnnamed,
        },
      }),
    ]);

    console.log("=== HORSE SEARCH COMPLETE ===");

    return new Response(JSON.stringify(searchResultsData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in horse-search:", rawMessage);

    const isUpstreamError = /API error|Rate limit|PERPLEXITY|timeout|401|429|500|502|503/i.test(rawMessage);
    const safeMessage = isUpstreamError
      ? "AI service temporarily unavailable. Your credit was not used. Please try again."
      : `Search temporarily unavailable. Your credit was not used. Please try again in a moment.`;

    return new Response(
      JSON.stringify({ error: safeMessage, horses: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══ SERVICE-LAYER QUERY HANDLER (legacy) ═══
async function handleServiceQuery(
  body: { query: string; sites?: string[]; queryType: string },
  supabaseClient: any,
  userId: string
): Promise<Response> {
  console.log(`=== SERVICE QUERY (${body.queryType}) ===`);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const tavilyKey = Deno.env.get("TAVILY_API_KEY");

  if (anthropicKey && tavilyKey) {
    const research = await tavilySearch(body.query, `SERVICE_${body.queryType}`);
    const context = formatTavilyContext([research]);
    const claudeResponse = await callClaude(
      anthropicKey,
      "You are a thoroughbred research assistant. Return structured JSON when possible.",
      `Query: ${body.query}\n\nResearch:\n${context}\n\nReturn JSON if applicable, otherwise concise text.`,
      { maxTokens: 4000, temperature: 0.1 },
    );
    const parsed = parseJsonFromResponse(claudeResponse);
    const citations = citationsFromTavily([research]);
    if (parsed) {
      return new Response(JSON.stringify({ ...parsed, citations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ content: claudeResponse, citations, confidence: 0.85 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!perplexityKey) throw new Error("Analysis service is not configured");

  let result = { content: "", citations: [] as string[] };
  if (body.sites && body.sites.length > 0) {
    try {
      result = await searchPerplexity(perplexityKey, body.query, body.sites, `SERVICE_${body.queryType}`);
    } catch (e) {
      console.warn("[SERVICE] Perplexity search failed");
    }
  }

  const parsed = parseJsonFromResponse(result.content);
  if (parsed) {
    return new Response(JSON.stringify({ ...parsed, citations: result.citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ content: result.content, citations: result.citations, confidence: 0.8 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
