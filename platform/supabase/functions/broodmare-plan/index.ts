import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import { callClaude, parseJsonFromResponse, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// CLAUDE SONNET ONLY — No Perplexity
// Claude uses training knowledge for broodmare plans
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

    const BroodmareSchema = z.object({
      mare_id: z.string().uuid().optional(),
      mare_name: z.string().min(2).max(100).optional(),
      file_data: z.string().max(10_000_000).optional(),
      file_name: z.string().max(255).optional(),
      breeding_goals: z.string().max(1000).optional(),
      filters: z.object({
        stud_fee_min: z.number().min(0).max(1_000_000).optional(),
        stud_fee_max: z.number().min(0).max(1_000_000).optional(),
        country: z.string().max(50).optional(),
        type: z.string().max(50).optional(),
        commercial_only: z.boolean().optional(),
      }).optional(),
    });

    const rawBody = await req.json();
    const parseResult = BroodmareSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const requestBody = parseResult.data;
    let { mare_id, breeding_goals, filters } = requestBody;
    let mare_name = requestBody.mare_name;

    console.log("=== BROODMARE PLAN START (CLAUDE SONNET ONLY) ===", { mare_id, mare_name });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let mareData: any = null;
    let fileExtractedData = "";

    if (mare_id) {
      const { data: dbMare } = await supabaseClient.from("horses").select("*").eq("id", mare_id).single();
      if (dbMare) mareData = dbMare;
    }

    // Extract from uploaded file using Claude
    if (requestBody.file_data && requestBody.file_name) {
      console.log("Extracting data from uploaded file with Claude...");
      try {
        const extractionResponse = await callClaude(ANTHROPIC_API_KEY,
          "You are a document data extraction specialist. Extract all mare information from the provided document data.",
          `Extract all mare information from this document named "${requestBody.file_name}". Return JSON: { "mare_name": "", "pedigree": { "sire": "", "dam": "", "dam_sire": "", "siblings": [] }, "performance": [], "year_of_birth": 0, "sex": "", "country": "" }\n\nDocument data: ${requestBody.file_data.substring(0, 50000)}`,
          { maxTokens: 3000 }
        );
        fileExtractedData = extractionResponse;
        const parsed = parseJsonFromResponse(extractionResponse);
        if (parsed && !mare_name && parsed.mare_name) {
          mare_name = parsed.mare_name;
        }
      } catch (e) {
        console.error("File extraction failed:", e);
      }
    }

    const searchName = mare_name || mareData?.name;

    // Get available stallions from DB
    let stallionsQuery = supabaseClient.from("stallions").select("*, horses(*)").order("success_rate", { ascending: false });
    if (filters?.stud_fee_min) stallionsQuery = stallionsQuery.gte("stud_fee", filters.stud_fee_min);
    if (filters?.stud_fee_max) stallionsQuery = stallionsQuery.lte("stud_fee", filters.stud_fee_max);
    const { data: stallions } = await stallionsQuery.limit(20);

    const stallionsList = (stallions || []).map(s => ({
      id: s.id, name: s.horses?.name, sire: s.horses?.sire, dam: s.horses?.dam,
      success_rate: s.success_rate, stud_fee: s.stud_fee, winners: s.winners, stakes_winners: s.stakes_winners, farm: s.farm,
    }));

    // ═══ CLAUDE SONNET ONLY — uses training knowledge ═══
    const systemPrompt = `You are BloodstockAI broodmare specialist with 40 years experience.
Complete knowledge of bloodlines and breeding patterns.
Use ONLY your training knowledge. Never mention Claude, Anthropic, or AI.

Create a comprehensive breeding plan based on your encyclopedic knowledge of thoroughbred bloodlines.

CRITICAL RULES:
1. Calculate COI accurately using Wright's formula for each proposed mating.
2. Calculate Dosage Index (DI), Centre of Distribution (CD) and full B-I-C-S-P profile.
3. Nick Rating: A++ to F scale with statistical basis from real historical cross data.
4. Identify all bloodline concentrations and common ancestors with generational positions.
5. Project foal racing style: Frontrunner / Stalker / Closer / Versatile.
6. Cite comparable sales from ALL auction houses.

${QUALITY_CONTROLS}

Return valid JSON:
{
  "mare_analysis": {
    "pedigree_summary": "", "performance_summary": "", "progeny_record": "",
    "coi_percentage": 0, "genetic_strengths": [], "genetic_considerations": [],
    "key_strengths": [], "key_weaknesses": [], "commercial_value": "", "breeding_potential": "", "conformation_notes": ""
  },
  "recommended_stallions": [{
    "stallion_id": "", "stallion_name": "", "matching_score": 0,
    "nick_rating": "A++/A+/A/B+/B/C/D/F",
    "nick_justification": "",
    "inbreeding_analysis": {
      "present": true, "pattern": "", "coefficient": 0.0,
      "assessment": "Beneficial/Acceptable/Cautionary/Excessive", "explanation": ""
    },
    "dosage_analysis": {
      "dosage_index": 0.0, "centre_of_distribution": 0.0,
      "dosage_profile": { "brilliant": 0, "intermediate": 0, "classic": 0, "solid": 0, "professional": 0 },
      "interpretation": ""
    },
    "bloodline_concentrations": [
      { "ancestor": "", "occurrences": "3x4", "effect": "Enhancing/Neutral/Diluting", "genetic_strength": "" }
    ],
    "genetic_compatibility": { "strengths": [], "nick_rating": "", "dosage_profile": "", "inbreeding_coefficient": "" },
    "race_type_projection": {
      "primary_distance": "", "secondary_distance": "", "likely_surface": "",
      "peak_age": "", "race_style": "Frontrunner/Stalker/Closer/Versatile"
    },
    "commercial_projection": { "estimated_yearling_value": "", "target_market": "", "sales_potential": "", "hip_potential": "", "comparable_sales": [] },
    "racing_projection": { "likely_aptitude": "", "distance_range": "", "surface_preference": "" },
    "roi_analysis": { "stud_fee": 0, "expected_value": "", "risk_level": "" },
    "conformation_projection": "",
    "key_strengths": [], "key_risks": [], "reasoning": ""
  }],
  "breeding_strategy": { "primary_goal": "", "timeline": [], "recommended_approach": "" },
  "expected_outcomes": { "best_case": "", "likely_case": "", "considerations": [] },
  "advanced_performance_female_line_intelligence": {
    "performance_progression": { "distance_by_age": { "two_yo": "", "three_yo": "", "four_yo_plus": "" }, "progression_pattern": "", "surface_influence": "", "hidden_stamina_detected": false, "late_maturing_pattern": false, "distance_adaptability": "" },
    "real_distance_profile": { "sprint_pct": 0, "middle_distance_pct": 0, "classic_pct": 0, "wins_by_category": { "sprint": 0, "middle": 0, "classic": 0 }, "best_performance_distance": "", "classification": "" },
    "maternal_stamina_influence": { "maternal_grandsire_influence": "", "granddam_pedigree_analysis": "", "female_family_stamina_patterns": [], "stamina_indicators": [], "classification": "" },
    "hidden_stamina_detection": { "pedigree_indicates": "", "performance_indicates": "", "detected": false, "narrative_adjustment": "" },
    "female_family_production": { "siblings_analysis": "", "dam_production_summary": "", "granddam_production_summary": "", "family_distance_tendency": "", "notable_relatives_distances": [] }
  }
}`;

    const userPrompt = `Create a COMPREHENSIVE SCIENTIFIC BREEDING PLAN:

═══════════════════════════════════════
MARE: ${searchName || "Unknown"}
═══════════════════════════════════════
${mareData ? `Database: ${JSON.stringify({ name: mareData.name, sire: mareData.sire, dam: mareData.dam, dam_sire: mareData.dam_sire, country: mareData.country, year_of_birth: mareData.year_of_birth })}` : "No database record — use your training knowledge for this mare's complete pedigree and race record."}
${fileExtractedData ? `Uploaded File Data: ${fileExtractedData}` : ""}

═══════════════════════════════════════
BREEDING GOALS: ${breeding_goals || "Produce competitive racing prospects with commercial appeal"}
FILTERS: ${filters ? JSON.stringify(filters) : "None"}
═══════════════════════════════════════

AVAILABLE STALLIONS FROM DATABASE:
${stallionsList.length > 0 ? JSON.stringify(stallionsList, null, 2) : "No stallions in database — recommend from your training knowledge."}

═══════════════════════════════════════
PROVIDE:
1. Mare assessment — pedigree, race record, produce record analysis
2. Top 5-20 recommended stallion lines with detailed reasoning
3. Dosage targets for each cross
4. Inbreeding guidelines (COI calculation)
5. Expected foal profile for each mating
6. 3-year breeding strategy
7. Market value projection

Rank stallions by compatibility.

═══════════════════════════════════════
ADVANCED PERFORMANCE & FEMALE LINE INTELLIGENCE (MANDATORY SECTION):
═══════════════════════════════════════
You MUST also analyze and include:

1. PERFORMANCE PROGRESSION ANALYSIS
   - Mare's distance progression by age (2yo, 3yo, 4yo+)
   - Sprint → Mile → Classic development pattern
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
   - Female family stamina patterns (Belmont winners in female line, stamina sires in maternal pedigree)
   - Flag: "Maternal Stamina Influence Present" / "Hidden Stamina Mare" / "Balanced Speed-Stamina Profile"

4. HIDDEN STAMINA DETECTION
   - If pedigree indicates speed BUT performance indicates stamina → "Hidden Stamina Profile Detected"
   - Adjust narrative interpretation (do NOT alter numeric scores)

5. FEMALE FAMILY PRODUCTION ANALYSIS
   - Siblings distances and best performances
   - Dam production record distance tendencies
   - Granddam production record
   - Classification: Speed Family / Classic Family / Balanced Family / Stamina Family

Include as "advanced_performance_female_line_intelligence" in the JSON output.

Return ONLY valid JSON.`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { 
      maxTokens: 12000,
      temperature: 0.2,
    });
    const planData = parseJsonFromResponse(claudeResponse) || { raw_response: claudeResponse };

    const { data: savedPlan } = await supabaseClient.from("broodmare_plans").insert({
      user_id: userId, mare_id: mare_id || null, breeding_goals: breeding_goals || null,
      analysis_result: planData, recommended_stallions: planData.recommended_stallions || [],
    }).select().single();

    await Promise.all([
      supabaseClient.from("search_history").insert({ user_id: userId, search_type: "broodmare_plan", search_query: { mare_name: searchName, breeding_goals }, results_data: planData }),
      supabaseClient.from("activity_logs").insert({ user_id: userId, action: "broodmare_plan", resource_type: "breeding", metadata: { mare_name: searchName, stallions_count: planData.recommended_stallions?.length || 0, engine: "claude_sonnet_only" } }),
    ]);

    console.log("=== BROODMARE PLAN COMPLETE (CLAUDE SONNET ONLY) ===");

    return new Response(JSON.stringify({ plan: savedPlan, mare: mareData, analysis: planData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in broodmare-plan:", rawMessage);
    const isClaude = /Claude API error|credit balance is too low/i.test(rawMessage);
    const safeMessage = isClaude
      ? "AI service temporarily unavailable. Your credit was not used. Please try again."
      : `Analysis failed. Your credit was not used. Please try again.`;
    return new Response(JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
