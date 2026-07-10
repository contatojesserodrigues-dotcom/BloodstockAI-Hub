import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { callClaude, callClaudeWithDocument, parseJsonFromResponse } from "../_shared/ai-clients.ts";
import { tavily } from "npm:@tavily/core";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE ANALYSIS — Claude Sonnet + Tavily ONLY
// Inputs: { horse_name?, country?, year_of_birth?, pedigree_pdf_base64?, pedigree_pdf_mime? }
// Either input alone is sufficient. If both, PDF roster is merged with typed subject.
// ═══════════════════════════════════════════════════════════════

const APPROVED_DOMAINS = [
  "racingpost.com", "racingpost.ie",
  "equibase.com", "racing.com", "racingaustralia.horse",
  "racenet.com.au", "punters.com.au", "racingnsw.com.au", "studbook.org.au",
  "attheraces.com", "sportinglife.com", "timeform.com", "racingtv.com",
  "irishracing.com", "hri.ie",
  "jra.go.jp", "france-galop.com", "geny.com", "paris-turf.com", "france-sire.com",
  "breednet.com.au",
  "pedigreequery.com", "allbreedpedigree.com", "tbheritage.com",
  "trc-global-rankings.com", "thoroughbreddailynews.com", "bloodhorse.com",
  "jockeyclubbrasileiro.com.br",
];

type RosterEntry = {
  role: string;
  name: string;
  country?: string;
  year_of_birth?: number;
  sire?: string;
  dam?: string;
};

function dedupeRoster(list: RosterEntry[]): RosterEntry[] {
  const seen = new Map<string, RosterEntry>();
  for (const e of list) {
    if (!e?.name) continue;
    const key = `${e.name.toLowerCase().trim()}|${(e.country || "").toLowerCase()}|${e.year_of_birth || ""}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return Array.from(seen.values());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const Schema = z.object({
      horse_name: z.string().trim().max(120).optional(),
      country: z.string().trim().max(8).optional(),
      year_of_birth: z.number().int().min(1900).max(2100).optional(),
      pedigree_pdf_base64: z.string().optional(),
      pedigree_pdf_mime: z.string().optional(),
    }).refine((v) => (v.horse_name && v.horse_name.length >= 2) || v.pedigree_pdf_base64, {
      message: "Provide horse_name or pedigree_pdf_base64",
    });
    const body = await req.json();
    const parseResult = Schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { horse_name, country, year_of_birth, pedigree_pdf_base64, pedigree_pdf_mime } = parseResult.data;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");
    const tavilyClient = tavily({ apiKey: TAVILY_API_KEY });

    const today = new Date().toISOString().split("T")[0];
    console.log("=== PERFORMANCE ANALYSIS START (Claude + Tavily) ===", { horse_name, hasPdf: !!pedigree_pdf_base64 });

    // ═══ STEP 1 — Build the master roster (exhaustive, deduped) ═══
    let roster: RosterEntry[] = [];
    if (horse_name && horse_name.length >= 2) {
      roster.push({ role: "subject", name: horse_name.trim(), country, year_of_birth });
    }

    if (pedigree_pdf_base64) {
      try {
        const mime = pedigree_pdf_mime || "application/pdf";
        const extractionPrompt = `You are a thoroughbred pedigree document parser.
Read the ENTIRE document, every page. Extract EVERY named horse you can see, across all generations and listings:
- subject horse (the main lot/page)
- sire, dam, dam-sire
- ancestors by generation (sire's sire, sire's dam, dam's dam, dam's dam-sire, etc.) as deep as shown
- full siblings, half siblings (by sire), half siblings (by dam)
- produce / progeny (if the subject is a stallion or broodmare)

Preserve country suffix (e.g. (IRE), (GB), (FR), (USA)) and year of birth EXACTLY as printed.
Do NOT invent horses, do NOT add horses not on the page. Return ONLY this JSON:
{
  "subject": { "name": "", "country": "", "year_of_birth": 0, "sex": "", "sire": "", "dam": "", "dam_sire": "" },
  "roster": [
    { "role": "subject|sire|dam|dam_sire|sire_of_sire|dam_of_sire|sire_of_dam|dam_of_dam|sire_of_damsire|full_sibling|half_sibling_by_sire|half_sibling_by_dam|produce|ancestor",
      "name": "", "country": "", "year_of_birth": 0, "sire": "", "dam": "" }
  ]
}`;
        const extracted = await callClaudeWithDocument(
          ANTHROPIC_API_KEY,
          "You parse pedigree PDFs exhaustively. Return ONLY valid JSON.",
          extractionPrompt,
          pedigree_pdf_base64,
          mime,
          { maxTokens: 6000, temperature: 0.1, timeoutMs: 180000 },
        );
        const parsed = parseJsonFromResponse(extracted);
        if (parsed?.roster && Array.isArray(parsed.roster)) {
          for (const e of parsed.roster) {
            if (e?.name) {
              roster.push({
                role: e.role || "ancestor",
                name: String(e.name).trim(),
                country: e.country || undefined,
                year_of_birth: e.year_of_birth || undefined,
                sire: e.sire || undefined,
                dam: e.dam || undefined,
              });
            }
          }
        }
      } catch (e) {
        console.warn("[PERF] PDF roster extraction failed:", e instanceof Error ? e.message : e);
      }
    }

    roster = dedupeRoster(roster);
    if (roster.length === 0) {
      return new Response(JSON.stringify({ error: "No horses identified from input." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard cap to stay within reasonable latency, but stay exhaustive in priority order.
    const ROSTER_CAP = 25;
    if (roster.length > ROSTER_CAP) {
      const priority = ["subject", "sire", "dam", "dam_sire", "sire_of_sire", "dam_of_sire", "sire_of_dam", "dam_of_dam",
        "full_sibling", "half_sibling_by_sire", "half_sibling_by_dam", "produce", "sire_of_damsire", "ancestor"];
      roster.sort((a, b) => (priority.indexOf(a.role) >>> 0) - (priority.indexOf(b.role) >>> 0));
      roster = roster.slice(0, ROSTER_CAP);
    }

    console.log(`[PERF] Roster built: ${roster.length} horse(s)`);

    // ═══ STEP 2 — Tavily research per horse (Racing Post primary) ═══
    const researchResults: Array<{ entry: RosterEntry; answer: string | null; sources: any[] }> = [];
    await Promise.all(roster.map(async (entry) => {
      try {
        const nameQ = entry.country ? `"${entry.name} ${entry.country}"` : `"${entry.name}"`;
        const yrPart = entry.year_of_birth ? ` ${entry.year_of_birth}` : "";
        const query = `${nameQ}${yrPart} thoroughbred RPR Timeform rating form profile career race record black type`;
        let res: any = await tavilyClient.search(query, {
          searchDepth: "advanced",
          maxResults: 5,
          includeAnswer: true,
          includeDomains: APPROVED_DOMAINS,
        });
        // Open-web fallback when the approved-domain search returns nothing
        // (frequent for AUS/NZ/FR-registered horses).
        if (!res?.answer && !(Array.isArray(res?.results) && res.results.length)) {
          res = await tavilyClient.search(
            `${nameQ}${yrPart} thoroughbred race record rating form career`,
            { searchDepth: "advanced", maxResults: 5, includeAnswer: true },
          ).catch(() => res);
        }
        researchResults.push({
          entry,
          answer: res?.answer || null,
          sources: (res?.results || []).slice(0, 5).map((r: any) => ({
            url: r?.url, title: r?.title || "",
            snippet: typeof r?.content === "string" ? r.content.slice(0, 600) : "",
          })),
        });
      } catch (e) {
        console.warn(`[PERF-TAVILY] failed for ${entry.name}:`, e instanceof Error ? e.message : e);
        researchResults.push({ entry, answer: null, sources: [] });
      }
    }));

    // ═══ STEP 3 — Claude synthesis ═══
    const researchBlock = researchResults.map((r, i) => {
      const head = `[H${i + 1}] role=${r.entry.role} | name="${r.entry.name}"${r.entry.country ? ` ${r.entry.country}` : ""}${r.entry.year_of_birth ? ` (${r.entry.year_of_birth})` : ""}${r.entry.sire ? ` | sire=${r.entry.sire}` : ""}${r.entry.dam ? ` | dam=${r.entry.dam}` : ""}`;
      const ans = r.answer ? `  ANSWER: ${r.answer}` : "  ANSWER: (none)";
      const srcs = r.sources.length
        ? r.sources.map((s, j) => `  [S${j + 1}] ${s.title || s.url}\n      ${s.url}\n      ${s.snippet}`).join("\n")
        : "  SOURCES: (none)";
      return [head, ans, srcs].join("\n");
    }).join("\n\n---\n\n");

    const subjectEntry = roster.find(e => e.role === "subject") || roster[0];

    const systemPrompt = `You are BloodstockAI Performance Analyst. You produce a forensic, evidence-only performance analysis.

HARD RULES:
- NEVER invent an RPR, a relative, a record, a black-type or a sale. If unverifiable in the research block, mark "Not verified" (n/v).
- For pre-RPR-era / very old ancestors: mark RPR "n/a (era)" and substitute verified status (champion sire, classic winner, leading broodmare sire) only if retrievable.
- For unraced horses: "Unraced — pivot to produce / black-type relatives".
- For foreign records not on RP: "RPR n/v" + equivalent verified figure from another approved source clearly labelled.
- Identity disambiguation is MANDATORY before attaching any figure: confirm via country suffix + year, OR sire+dam, OR exact RP profile that matches family. If ambiguous, return "Not verified — multiple matches".
- Reference bands for context only — Flat: ~100-110 useful handicap, 110-120 black type, 120+ Group, 125+ top G1; NH: ~150 high-class, 165+ championship.
- Language: English. Output: ONLY valid JSON.
- Beyond raw figures, you must produce ELITE BLOODSTOCK CONSULTANCY commentary — the kind expected by professional breeders, trainers, owners, syndicates and bloodstock agents at Coolmore, Godolphin, Juddmonte, Shadwell, Wertheimer level.
- All commercial/valuation figures are PROBABILISTIC estimates anchored in current market data and must be flagged as such.
- Score every dimension 0-100 with conservative integrity: when data is weak, score the confidence low and the dimension proportionally.`;

    const userPrompt = `TODAY: ${today}
SUBJECT: "${subjectEntry.name}"${subjectEntry.country ? ` ${subjectEntry.country}` : ""}${subjectEntry.year_of_birth ? ` (${subjectEntry.year_of_birth})` : ""}
ROSTER SIZE: ${roster.length} horse(s)

TAVILY RESEARCH BLOCK (Racing Post primary, approved domains only):
${researchBlock}

Return EXACTLY this JSON (fill every horse from the roster; do not omit any):
{
  "horse_name": "${subjectEntry.name}",
  "country": "",
  "year_of_birth": 0,
  "status": "",
  "subject_disambiguation": "verified | not_verified_multiple_matches | not_found",
  "career": { "starts": 0, "wins": 0, "places": 0, "unplaced": 0, "earnings": "", "win_percentage": 0 },
  "speed_figures": { "best_rpr": null, "best_beyer": null, "best_timeform": null, "current_rpr": null, "best_figure": "", "avg_last_5": null, "trend": "" },
  "recent_form": [{ "date": "", "race": "", "track": "", "distance": "", "going": "", "surface": "", "position": "", "margin": "", "figure": "", "jockey": "", "comment": "" }],
  "roster": [
    {
      "role": "subject|sire|dam|dam_sire|...",
      "name": "",
      "country": "",
      "year_of_birth": 0,
      "peak_rpr": null,
      "rpr_status": "verified | n/v | n/a (era) | unraced | not_verified_multiple_matches",
      "code": "Flat | NH | ",
      "trip": "",
      "record_summary": "",
      "black_type": "",
      "source_url": ""
    }
  ],
  "synthesis": {
    "stronger_side": "sire_line | dam_line | dam_sire — name the verified performers carrying it",
    "exact_cross_read": "What the siblings' actual RPRs say about this exact mating",
    "trip_and_code": "Trip and code the family expresses ability over",
    "subject_potential": "Reasoned verdict on the subject's potential — grounded ONLY in verified figures"
  },
  "evidence_quality": {
    "verified_count": 0,
    "not_verified_count": 0,
    "note": "How many figures are verified vs n/v and how that bounds the conclusions"
  },
  "scores": { "speed_rating": 0, "consistency": 0, "class_level": "", "distance_profile": "", "surface_pref": "", "going_preference": "", "form_trend": "", "data_confidence": "High | Medium | Low" },
  "insights": [],
  "recommendation": "",
  "report_text": "Comprehensive performance summary in English (200+ words), grounded ONLY in the research block.",

  "executive_summary": {
    "age": "",
    "current_racing_level": "",
    "future_potential": "",
    "commercial_rating": "",
    "consistency_rating": "",
    "improvement_trend": "",
    "performance_confidence": "High | Medium | Low",
    "risk_rating": "Low | Medium | High",
    "overall_performance_score": 0
  },

  "performance_timeline": [
    { "season": "", "starts": 0, "wins": 0, "peak_rpr": null, "avg_rpr": null, "class_level": "", "note": "" }
  ],

  "race_by_race": [
    { "date": "", "course": "", "country": "", "distance": "", "surface": "", "going": "", "class": "", "position": "", "field_size": null, "weight": "", "jockey": "", "trainer": "", "official_rating": null, "race_rating": null, "comment": "" }
  ],

  "distance_buckets": [
    { "label": "5f", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "6f", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "7f", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "1m", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "8-9f", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "10-12f", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "14f+", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 },
    { "label": "NH", "starts": 0, "wins": 0, "places": 0, "best_rpr": null, "score": 0 }
  ],
  "distance_recommendation": "",

  "surface_buckets": [
    { "label": "Turf", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Dirt", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Synthetic", "starts": 0, "wins": 0, "score": 0 },
    { "label": "All Weather", "starts": 0, "wins": 0, "score": 0 },
    { "label": "National Hunt", "starts": 0, "wins": 0, "score": 0 }
  ],

  "going_buckets": [
    { "label": "Firm", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Good to Firm", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Good", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Good to Soft", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Soft", "starts": 0, "wins": 0, "score": 0 },
    { "label": "Heavy", "starts": 0, "wins": 0, "score": 0 }
  ],

  "pace_profile": {
    "early_speed": 0,
    "cruising_speed": 0,
    "acceleration": 0,
    "finishing_strength": 0,
    "running_style": "Leader | Prominent | Stalker | Closer | Versatile",
    "commentary": ""
  },

  "consistency_analysis": {
    "consistency_score": 0,
    "rating_variability": "",
    "standard_deviation": null,
    "average_performance": null,
    "peak_performance": null,
    "worst_performance": null,
    "reliability_score": 0
  },

  "competition_analysis": {
    "avg_opponent_rating": null,
    "vs_black_type": "",
    "vs_group_horses": "",
    "under_pressure": "",
    "opposition_strength_score": 0
  },

  "trainer_analysis": { "current_trainer": "", "trend_with_trainer": "", "trainer_pattern": "", "score": 0 },
  "jockey_analysis": { "primary_jockeys": [], "win_rates": "", "consistency_note": "", "score": 0 },

  "pedigree_vs_performance": {
    "expected_distance": "",
    "expected_surface": "",
    "development_pattern": "",
    "verdict": "Above pedigree | As expected | Below pedigree",
    "commentary": ""
  },

  "commercial_intelligence": {
    "racing_prospect_value_usd": "",
    "broodmare_value_usd": "",
    "stallion_prospect_value_usd": "",
    "export_value_usd": "",
    "nh_value_usd": "",
    "commercial_appeal": 0,
    "auction_demand": "",
    "future_potential": "",
    "roi_projection": "",
    "disclaimer": "All valuations are probabilistic estimates based on available data and historical market trends — not guaranteed market prices."
  },

  "future_projection": {
    "rating_ceiling": "",
    "black_type_potential": "",
    "listed_potential": "",
    "group_potential": "",
    "classic_potential": "",
    "nh_potential": "",
    "best_campaign": "",
    "ideal_distance": "",
    "ideal_surface": "",
    "career_recommendation": ""
  },

  "bloodstock_scores": {
    "performance": 0,
    "pedigree": 0,
    "commercial": 0,
    "consistency": 0,
    "distance_suitability": 0,
    "surface_suitability": 0,
    "improvement": 0,
    "future_potential": 0,
    "market_appeal": 0,
    "roi_potential": 0,
    "risk": 0,
    "overall": 0
  },

  "professional_commentary": "Elite international bloodstock consultancy commentary (400-600 words). Cover: what the horse has demonstrated, where it is improving, limitations, commercial implications, future racing recommendations, breeding value. Grounded only in verified evidence."
}`;

    let result: any = null;
    try {
      const claudeText = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, {
        maxTokens: 16000, temperature: 0.2, timeoutMs: 240000,
      });
      result = parseJsonFromResponse(claudeText);
    } catch (e) {
      console.error("[PERF] Claude synthesis failed:", e instanceof Error ? e.message : e);
    }

    if (!result) {
      // Minimal envelope so the UI still renders the roster.
      result = {
        horse_name: subjectEntry.name,
        country: subjectEntry.country || "",
        year_of_birth: subjectEntry.year_of_birth || 0,
        status: "Unknown",
        subject_disambiguation: "not_found",
        career: { starts: 0, wins: 0, places: 0, unplaced: 0, earnings: "", win_percentage: 0 },
        speed_figures: { best_rpr: null, best_beyer: null, best_timeform: null, current_rpr: null, best_figure: "", avg_last_5: null, trend: "" },
        recent_form: [],
        roster: roster.map(r => ({
          role: r.role, name: r.name, country: r.country || "", year_of_birth: r.year_of_birth || 0,
          peak_rpr: null, rpr_status: "n/v", code: "", trip: "", record_summary: "", black_type: "", source_url: "",
        })),
        synthesis: { stronger_side: "n/v", exact_cross_read: "n/v", trip_and_code: "n/v", subject_potential: "Insufficient verified data — synthesis not produced." },
        evidence_quality: { verified_count: 0, not_verified_count: roster.length, note: "Synthesis unavailable; only roster captured." },
        scores: { speed_rating: 0, consistency: 0, class_level: "", distance_profile: "", surface_pref: "", going_preference: "", form_trend: "", data_confidence: "Low" },
        insights: [],
        recommendation: "",
        report_text: "Performance synthesis unavailable. Roster captured from input.",
      };
    }

    // Collect citations from research sources
    const citations = Array.from(new Set(
      researchResults.flatMap(r => r.sources.map(s => s.url).filter(Boolean)),
    )).slice(0, 50);
    result.citations = citations;

    await supabaseClient.from("activity_logs").insert({
      user_id: user.id, action: "performance_analysis", resource_type: "horse",
      metadata: { horse_name: subjectEntry.name, engine: "claude_tavily", roster_size: roster.length, citations_count: citations.length },
    });

    console.log("=== PERFORMANCE ANALYSIS COMPLETE ===", { roster: roster.length, citations: citations.length });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in performance-analysis:", rawMessage);
    const safeMessage = "Analysis temporarily unavailable. Your credit was not used. Please try again in a moment.";
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
