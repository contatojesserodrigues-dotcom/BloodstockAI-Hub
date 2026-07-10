import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import { callClaude, parseJsonFromResponse, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";
import { tavilySearch, formatTavilyContext } from "../_shared/tavily-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// TAVILY + CLAUDE — Tavily collects live data, Claude analyzes matings
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const userId = roleCheck.userId;

    const MatingSchema = z.object({
      mare_name: z.string().min(2).max(100).trim(),
      stallion_names: z.array(z.string().min(2).max(100)).min(1).max(10),
      goals: z.object({
        race_type: z.string().max(50).optional(),
        auction_class: z.string().max(50).optional(),
        breeding_goal: z.string().max(500).optional(),
      }).optional(),
    });

    const rawBody = await req.json();
    const parseResult = MatingSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { mare_name, stallion_names, goals } = parseResult.data;

    console.log("=== MATING ANALYSIS START (Tavily + Claude) ===", { mare_name, stallion_names });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!Deno.env.get("TAVILY_API_KEY")) throw new Error("TAVILY_API_KEY is not configured");

    // Check mare in DB for any existing data
    const sanitizedMareName = mare_name.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const { data: mareDB } = await supabaseClient.from("horses").select("*, races(*), sales(*)").ilike("name", `%${sanitizedMareName}%`).limit(1).maybeSingle();

    // ═══ STEP 1 — Tavily research for mare + stallions ═══
    const researchQueries = [
      { query: `"${mare_name}" broodmare pedigree produce record racing record dam family`, label: "MATING_MARE" },
      ...stallion_names.map((s, i) => ({
        query: `"${s}" stallion progeny statistics nick patterns stud fee black type group winners`,
        label: `MATING_STALLION_${i + 1}`,
      })),
    ];
    const researchResults = await Promise.all(
      researchQueries.map(({ query, label }) => tavilySearch(query, label)),
    );
    const researchContext = formatTavilyContext(researchResults);

    // ═══ STEP 2 — Claude synthesis ═══
    const systemPrompt = `You are BloodstockAI, the world's leading mating specialist.
Use the web research provided PLUS your bloodstock knowledge. Prioritize verified research data.
Never mention AI vendors or search tools.

CRITICAL RULES:
1. Calculate COI accurately using Wright's formula for each proposed mating.
2. Calculate Dosage Index (DI), Centre of Distribution (CD) and full B-I-C-S-P dosage profile for each projected foal.
3. Nick Rating: A++ to F scale based on REAL historical cross success data. Include statistical basis.
4. Assess bloodline concentrations — identify all common ancestors and their generational positions (e.g. "3x4").
5. Project foal racing style: Frontrunner / Stalker / Closer / Versatile.
6. Include commercial assessment with comparable sales from real auctions.

${QUALITY_CONTROLS}

MATING CHART DATA (for frontend visualization):
Include a "chart_data" object:
- "compatibility_radar": [{ "stallion": "name", "genetic": N, "nick": N, "commercial": N, "racing": N, "inbreeding_safe": N }] — radar chart per stallion (0-100 scale)
- "projected_value": [{ "stallion": "name", "yearling_value": N, "2yo_value": N }] — bar chart

Return valid JSON:
{
  "mare": { "name": "", "pedigree_summary": "", "strengths": [], "race_history": "", "produce_record": "" },
  "stallions_analysis": [{
    "stallion_name": "", "mating_score": 0, "genetic_compatibility": 0,
    "nick_rating": "A++/A+/A/B+/B/C/D/F",
    "nick_justification": "",
    "inbreeding_analysis": {
      "present": true,
      "pattern": "e.g. Northern Dancer 4x4x5",
      "coefficient": 0.0,
      "assessment": "Beneficial/Acceptable/Cautionary/Excessive",
      "explanation": ""
    },
    "dosage_analysis": {
      "dosage_index": 0.0,
      "centre_of_distribution": 0.0,
      "dosage_profile": { "brilliant": 0, "intermediate": 0, "classic": 0, "solid": 0, "professional": 0 },
      "interpretation": ""
    },
    "bloodline_concentrations": [
      { "ancestor": "", "occurrences": "3x4", "effect": "Enhancing/Neutral/Diluting", "genetic_strength": "" }
    ],
    "expected_race_aptitude": { "sprint": 0, "middle_distance": 0, "long_distance": 0 },
    "race_type_projection": {
      "primary_distance": "", "secondary_distance": "", "likely_surface": "",
      "peak_age": "", "race_style": "Frontrunner/Stalker/Closer/Versatile"
    },
    "predicted_foal_profile": { "speed": 0, "stamina": 0, "temperament": "", "best_distance": "", "best_going": "" },
    "pedigree_cross": { "notable_ancestors": [], "dominant_bloodlines": [], "rare_bloodlines": [], "strengths": [], "concerns": [] },
    "progeny_potential": { "racing_success_probability": 0, "estimated_yearling_value": 0, "estimated_2yo_value": 0, "roi_potential": "high/medium/low" },
    "market_analysis": { "auction_class_fit": "select/book1/book2", "buyer_interest_level": "high/medium/low", "comparable_sales": [], "hip_potential": "Headline Hip/Book 1/Book 2/Lower" },
    "conformation_projection": "",
    "recommendation": "HIGHLY_RECOMMENDED/RECOMMENDED/ACCEPTABLE/CAUTION/NOT_RECOMMENDED",
    "recommendations": [],
    "key_strengths": [],
    "key_risks": [],
    "alternative_stallions": ["stallion name - reason"]
  }],
  "chart_data": {
    "compatibility_radar": [],
    "projected_value": []
  },
  "ranking": [{ "stallion_name": "", "rank": 0, "reason": "" }],
  "overall_recommendations": [],
  "alternative_sires": [{ "name": "", "reason": "" }],
  "broodmare_3year_plan": { "year_1": "", "year_2": "", "year_3": "" },
  "advanced_performance_female_line_intelligence": {
    "performance_progression": { "distance_by_age": { "two_yo": "", "three_yo": "", "four_yo_plus": "" }, "progression_pattern": "", "surface_influence": "", "hidden_stamina_detected": false, "late_maturing_pattern": false, "distance_adaptability": "" },
    "real_distance_profile": { "sprint_pct": 0, "middle_distance_pct": 0, "classic_pct": 0, "wins_by_category": { "sprint": 0, "middle": 0, "classic": 0 }, "best_performance_distance": "", "classification": "" },
    "maternal_stamina_influence": { "maternal_grandsire_influence": "", "granddam_pedigree_analysis": "", "female_family_stamina_patterns": [], "stamina_indicators": [], "classification": "" },
    "hidden_stamina_detection": { "pedigree_indicates": "", "performance_indicates": "", "detected": false, "narrative_adjustment": "" },
    "female_family_production": { "siblings_analysis": "", "dam_production_summary": "", "granddam_production_summary": "", "family_distance_tendency": "", "notable_relatives_distances": [] }
  }
}`;

    const userPrompt = `Analyse this mating using the live research below:

═══ WEB RESEARCH (Tavily) ═══
${researchContext}

═══════════════════════════════════════
MARE: ${mare_name}
═══════════════════════════════════════
${mareDB ? `Database info: ${JSON.stringify({ name: mareDB.name, sire: mareDB.sire, dam: mareDB.dam, dam_sire: mareDB.dam_sire, country: mareDB.country, year_of_birth: mareDB.year_of_birth })}` : "No database record — use research data for this mare's pedigree."}

${goals ? `BREEDING GOALS:
Target Race Type: ${goals.race_type || "Not specified"}
Target Auction Class: ${goals.auction_class || "Not specified"}
Breeding Goal: ${goals.breeding_goal || "Produce competitive racing prospect with commercial appeal"}` : ""}

═══════════════════════════════════════
STALLIONS TO ANALYZE:
═══════════════════════════════════════
${stallion_names.map((name, i) => `${i + 1}. ${name}`).join("\n")}

═══════════════════════════════════════
ANALYSIS REQUIRED FOR EACH STALLION:
═══════════════════════════════════════
1. Nick Analysis — sire line × dam sire line cross history and success rate
2. Dosage Profile — B-I-C-S-P for the foal
3. Dosage Index and Centre of Distribution
4. Inbreeding — all duplicated ancestors within 5 generations
5. Distance Aptitude — projected optimal distance
6. Surface Preference — turf/dirt/all-weather
7. Key Strengths of this cross
8. Key Risks
9. Notable horses from similar crosses
10. VERDICT: HIGHLY RECOMMENDED / RECOMMENDED / ACCEPTABLE / NOT RECOMMENDED

Include chart_data for frontend visualization.

═══════════════════════════════════════
ADVANCED PERFORMANCE & FEMALE LINE INTELLIGENCE (MANDATORY SECTION):
═══════════════════════════════════════
For each stallion AND for the mare, you MUST also provide:

1. PERFORMANCE PROGRESSION ANALYSIS
   - Distance progression by age (2yo, 3yo, 4yo+)
   - Sprint → Mile → Classic distance development pattern
   - Performance improvement at longer distances
   - Surface influence (turf/dirt/synthetic)
   - Flag: hidden stamina development, late-maturing patterns, distance adaptability

2. REAL RACE DISTANCE PROFILE
   - % of races sprint (≤7f), middle distance (8f–9f), classic distance (9f+)
   - Wins by distance category
   - Best performance distance
   - Classification: Sprinter / Speed-Mile / Middle Distance / Classic / Stayer

3. MATERNAL STAMINA INFLUENCE DETECTION
   - Maternal grandsire influence on stamina
   - Granddam pedigree stamina indicators
   - Female family stamina patterns (e.g. Belmont winners in female line, stamina sires in maternal pedigree)
   - Flag: "Maternal Stamina Influence Present" / "Hidden Stamina Mare" / "Balanced Speed-Stamina Profile"

4. HIDDEN STAMINA DETECTION
   - If pedigree indicates speed BUT performance indicates stamina → flag as "Hidden Stamina Profile Detected"
   - Adjust narrative interpretation accordingly (do NOT alter numeric scores)

5. FEMALE FAMILY PRODUCTION ANALYSIS
   - Siblings analysis (race distances, best performances)
   - Dam production record (distance tendencies)
   - Granddam production record
   - Family classification: Speed Family / Classic Family / Balanced Family / Stamina Family

Include this as "advanced_performance_female_line_intelligence" in the JSON output.

Return ONLY valid JSON.`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { 
      maxTokens: 12000,
      temperature: 0.2,
    });
    const analysisData = parseJsonFromResponse(claudeResponse);

    if (!analysisData) throw new Error("Failed to parse AI analysis");

    const savedMatings = await Promise.all(
      (analysisData.stallions_analysis || []).map(async (sa: any) => {
        const { data: matingRecord } = await supabaseClient.from("matings").insert({
          user_id: userId, stallion_id: null, mare_id: mareDB?.id || null,
          compatibility_score: sa.genetic_compatibility, success_probability: sa.progeny_potential?.racing_success_probability,
          estimated_value: sa.progeny_potential?.estimated_yearling_value, genetic_analysis: sa.pedigree_cross,
          recommendations: sa.recommendations,
        }).select().maybeSingle();
        return { ...matingRecord, stallion_name: sa.stallion_name, analysis: sa };
      })
    );

    await Promise.all([
      supabaseClient.from("search_history").insert({ user_id: userId, search_type: "mating_analysis", search_query: { mare_name, stallion_names, goals }, results_data: analysisData }),
      supabaseClient.from("activity_logs").insert({ user_id: userId, action: "mating_analysis", resource_type: "mating", metadata: { mare_name, stallion_names, stallions_count: stallion_names.length, engine: "tavily_claude" } }),
    ]);

    console.log("=== MATING ANALYSIS COMPLETE (Tavily + Claude) ===");

    return new Response(JSON.stringify({ success: true, analysis: analysisData, matings: savedMatings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in mating-analysis:", rawMessage);
    const isClaude = /Claude API error|credit balance is too low/i.test(rawMessage);
    const safeMessage = isClaude
      ? "AI service temporarily unavailable. Your credit was not used. Please try again."
      : `Analysis failed. Your credit was not used. Please try again.`;
    return new Response(JSON.stringify({ error: safeMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
