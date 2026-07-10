import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import { searchPerplexity, searchWithTiers, callClaude, parseJsonFromResponse, SITE_TIERS, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// PIPELINE: Perplexity (stud fees/availability) + Claude Sonnet (compatibility)
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const userId = roleCheck.userId;

    const InputSchema = z.object({
      mare_name: z.string().max(100).trim().optional(),
      query: z.string().max(200).trim().optional(),
      influence_tags: z.array(z.string().max(40)).max(10).optional(),
      breeding_goals: z.string().max(1000).optional(),
      budget_max: z.number().min(0).max(10_000_000).optional(),
      preferred_surface: z.enum(["turf", "dirt", "aw", "any"]).optional(),
      preferred_distance: z.enum(["sprint", "middle", "staying", "any"]).optional(),
      country_preference: z.string().max(50).optional(),
    });

    const rawBody = await req.json();
    const parseResult = InputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { breeding_goals, budget_max, preferred_surface, preferred_distance, country_preference, query, influence_tags } = parseResult.data;
    const mare_name = parseResult.data.mare_name && parseResult.data.mare_name.toLowerCase() !== "any mare" 
      ? parseResult.data.mare_name : null;
    const isFilterOnly = !mare_name;
    const tagList = (influence_tags || []).join(", ");

    console.log("=== STALLION SUGGESTION START (Perplexity fees + Claude compatibility) ===", { mare_name });

    // ═══ STEP 1: Perplexity — stud fees and availability ═══
    const budgetFilter = budget_max ? `stud fee under $${budget_max.toLocaleString()}` : "";
    const surfaceFilter = preferred_surface && preferred_surface !== "any" ? `${preferred_surface} specialist` : "";
    const distanceFilter = preferred_distance && preferred_distance !== "any" ? `${preferred_distance} distance` : "";
    const countryFilter = country_preference ? `standing in ${country_preference}` : "";

    const stallionDataSearch = await searchPerplexity(PERPLEXITY_API_KEY,
      `Current 2025/2026 stud fees and availability for thoroughbred stallions. ${query ? `Focus: ${query}.` : ""} ${tagList ? `Profile: ${tagList}.` : ""} ${surfaceFilter} ${distanceFilter} ${budgetFilter} ${countryFilter}. Include stud fee, farm, country, address, age, colour, sire/dam/damsire, sire line, career record, group/grade/listed wins, AEI, runners, winners, stakes winners, group winners, average and median yearling price, highest sale price.${mare_name ? ` Mare: ${mare_name}` : ""}`,
      ["coolmore.com", "darleyusa.com", "godolphin.com", "bloodhorse.com", "thoroughbreddailynews.com", ...SITE_TIERS.marketInsights.tier1],
      "STALLION_FEES");

    // ═══ Tavily — richer real-time bloodstock research ═══
    async function tavilyResearch(q: string): Promise<string> {
      if (!TAVILY_API_KEY) return "";
      try {
        const r = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: q,
            search_depth: "advanced",
            max_results: 6,
            include_answer: true,
          }),
        });
        if (!r.ok) return "";
        const j = await r.json();
        const out: string[] = [];
        if (j.answer) out.push(`Summary: ${j.answer}`);
        for (const res of (j.results || []).slice(0, 6)) {
          out.push(`- ${res.title} (${res.url}): ${(res.content || "").slice(0, 320)}`);
        }
        return out.join("\n");
      } catch { return ""; }
    }

    const tavilyContext = await Promise.all([
      tavilyResearch(`Thoroughbred stallion ${query || tagList || "leading sires"} 2025 stud fee farm location ${country_preference || ""} ${budgetFilter}`),
      tavilyResearch(`Stallion progeny statistics black type group winners stakes winners ${query || tagList || "proven sires"} 2024 2025`),
      tavilyResearch(`Stallion yearling sales results average median highest price ${query || tagList || "commercial sires"} Keeneland Tattersalls Goffs Arqana Inglis Magic Millions`),
    ]).then(arr => arr.filter(Boolean).join("\n\n═══════\n\n"));

    // If mare provided, also search mare pedigree via Perplexity
    let marePedigreeData = "";
    if (mare_name) {
      try {
        const marePedigreeSearch = await searchWithTiers(PERPLEXITY_API_KEY,
          `"${mare_name}" thoroughbred pedigree sire dam damsire 4-generation pedigree tree`,
          SITE_TIERS.pedigree, "MARE_PEDIGREE");
        marePedigreeData = marePedigreeSearch.content;
      } catch (e) {
        console.warn("[STALLION] Mare pedigree search failed, Claude will use training knowledge");
      }
    }

    // Check DB for stallions
    let stallionsQuery = supabaseClient.from("stallions").select("*, horses(*)").order("success_rate", { ascending: false });
    if (budget_max) stallionsQuery = stallionsQuery.lte("stud_fee", budget_max);
    const { data: dbStallions } = await stallionsQuery.limit(30);
    const dbStallionsList = (dbStallions || []).map(s => ({
      name: s.horses?.name, sire: s.horses?.sire, dam: s.horses?.dam,
      success_rate: s.success_rate, stud_fee: s.stud_fee, winners: s.winners,
      stakes_winners: s.stakes_winners, farm: s.farm, location: s.standing_location,
    }));

    // ═══ STEP 2: Claude Sonnet — genetic compatibility analysis ═══
    const modeDescription = isFilterOnly
      ? `Your task: Based on the user's filter criteria and the stallion data from Perplexity, recommend the TOP 10 BEST STALLIONS currently available. Since no specific mare was provided, focus on general stallion quality, sire statistics, progeny performance, and commercial value. Set mare_profile to null.`
      : `Your task: Evaluate genetic compatibility between the mare and available stallions. Use your encyclopedic knowledge of bloodlines for nick analysis, inbreeding, and dosage calculations.`;

    const systemPrompt = `You are BloodstockAI — an elite international bloodstock advisor with the standard of Coolmore, Darley, Juddmonte and leading bloodstock agencies.
Use your encyclopedic training knowledge plus the Tavily + Perplexity research provided. Never invent stud fees; if uncertain, set the field to null or "n/a".
Never mention Claude, Anthropic, or AI.

${modeDescription}

CRITICAL RULES:
1. Use the supplied research (Perplexity + Tavily) for current stud fees, farms, countries and statistics.
${isFilterOnly ? "" : `2. Calculate inbreeding coefficient (COI) for each proposed mating using Wright's formula.
3. Assess nick compatibility based on real historical cross data.`}
4. Consider: ${isFilterOnly ? "progeny stats, stud fee value, surface/distance aptitude, commercial appeal, black type depth, market demand" : "pedigree complementarity, distance aptitude, surface preference, commercial value, genetic diversity, black type influence"}.
5. Every recommendation must include a concise professional comment — evidence-based, commercial and breeding-relevant — in the voice of an elite bloodstock advisor.
6. All numeric scores (commercial_score, pedigree_score, race_record_score, stud_performance_score, black_type_influence, market_demand, future_breeding_value, national_hunt_suitability, flat_suitability, risk_score, expected_roi) are 0-100 integers. risk_score: higher = riskier.
7. country_flag = ISO country emoji flag for stallion's country of standing (e.g. 🇮🇪 🇺🇸 🇬🇧 🇫🇷 🇦🇺 🇯🇵 🇳🇿).

${QUALITY_CONTROLS}

Return valid JSON with this structure:
{
  "mare_profile": ${isFilterOnly ? "null" : '{ "name": "", "sire": "", "dam": "", "dam_sire": "", "racing_summary": "", "produce_record": "", "pedigree_strengths": [], "pedigree_weaknesses": [], "conformation_traits": [], "genetic_profile": "", "ideal_stallion_traits": [] }'},
  "suggested_stallions": [
    {
      "rank": 1, "stallion_name": "", "sire_line": "", "sire": "", "dam": "", "dam_sire": "",
      "second_dam": "", "third_dam": "", "female_family": "", "colour": "", "age": 0,
      "year_of_birth": 0, "country": "", "country_flag": "", "stud_fee": "", "stud_fee_currency": "USD",
      "standing_at": "", "stud_address": "", "farm": "",
      "first_crop_year": 0,
      "compatibility_score": 0, "overall_score": 0,
      "commercial_score": 0, "pedigree_score": 0, "race_record_score": 0, "stud_performance_score": 0,
      "black_type_influence": 0, "market_demand": 0, "future_breeding_value": 0,
      "national_hunt_suitability": 0, "flat_suitability": 0, "risk_score": 0, "expected_roi": 0,
      "black_type_summary": "", "champion_titles": [], "champion_ancestors": [], "elite_family_highlights": [],
      "nick_rating": "A++/A+/A/B+/B/C/D/F", "nick_justification": "",
      "inbreeding_coefficient": "", "inbreeding_assessment": "Favorable/Acceptable/Concerning",
      "career_record": "", "career_highlights": "", "earnings": "",
      "starts": 0, "wins": 0, "places": 0, "group_wins": 0, "grade_wins": 0, "listed_wins": 0,
      "best_distance": "", "preferred_surface": "", "peak_performance": "",
      "best_progeny": [],
      "progeny_stats": { "runners": 0, "winners": 0, "stakes_winners": 0, "group_winners": 0, "grade_winners": 0, "group_1_winners": 0, "win_percentage": "", "average_earnings_per_runner": "", "average_yearling_price": "", "median_yearling_price": "", "highest_sale_price": "" },
      "dosage_analysis": { "combined_profile": "", "dosage_index": "", "center_of_distribution": "", "interpretation": "" },
      "genetic_compatibility": { "strengths": [], "concerns": [], "complementary_traits": [] },
      "predicted_foal_profile": { "speed_index": 0, "stamina_index": 0, "best_distance": "", "surface_preference": "", "expected_class": "", "temperament": "" },
      "commercial_projection": { "estimated_yearling_value": 0, "target_auction": "", "buyer_appeal": "", "comparable_sales": [] },
      "reasoning": "", "key_strengths": [], "key_risks": [],
      "professional_comment": "",
      "small_recommendation": ""
    }
  ],
  "breeding_strategy": { "primary_recommendation": "", "alternative_approach": "", "timing_advice": "", "market_positioning": "" },
  "overall_assessment": "",
  "sources_used": []
}`;

    const userPrompt = isFilterOnly
      ? `Find the TOP 10 BEST STALLIONS based on these criteria:

═══ STALLION DATA FROM PERPLEXITY (fees, availability, stats) ═══
${stallionDataSearch.content}

═══ TAVILY RESEARCH (current stud, progeny, sales) ═══
${tavilyContext || "(no Tavily context available)"}

═══ DATABASE STALLIONS ═══
${JSON.stringify(dbStallionsList, null, 2)}

USER FILTER CRITERIA:
- Free-text Query: ${query || "(none)"}
- Influence Tags: ${tagList || "(none)"}
- Breeding Goals: ${breeding_goals || "Produce competitive racing prospect with strong commercial appeal"}
- Budget: ${budget_max ? `Up to $${budget_max.toLocaleString()}` : "No budget limit"}
- Surface: ${preferred_surface || "Any"}
- Distance: ${preferred_distance || "Any"}
- Country: ${country_preference || "Any"}

Recommend TOP 10 stallions ranked by overall quality. Return ONLY valid JSON.`
      : `Rate top stallions for genetic compatibility with this mare:

MARE: ${mare_name}
Mare pedigree data: ${marePedigreeData || "Use your training knowledge for this mare's pedigree."}

═══ STALLION DATA FROM PERPLEXITY (fees, availability, stats) ═══
${stallionDataSearch.content}

═══ TAVILY RESEARCH (current stud, progeny, sales) ═══
${tavilyContext || "(no Tavily context available)"}

═══ DATABASE STALLIONS ═══
${JSON.stringify(dbStallionsList, null, 2)}

USER PREFERENCES:
- Free-text Query: ${query || "(none)"}
- Influence Tags: ${tagList || "(none)"}
- Breeding Goals: ${breeding_goals || "Produce competitive racing prospect with strong commercial appeal"}
- Budget: ${budget_max ? `Up to $${budget_max.toLocaleString()}` : "No budget limit"}
- Surface: ${preferred_surface || "Any"}
- Distance: ${preferred_distance || "Any"}
- Country: ${country_preference || "Any"}

Rate top 5-10 stallions by: nick score, inbreeding, dosage, distance aptitude. Return ONLY valid JSON.`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { maxTokens: 12000 });
    let analysisData = parseJsonFromResponse(claudeResponse);

    if (!analysisData) {
      console.warn("JSON parse failed, attempting fallback...");
      analysisData = {
        mare_profile: null,
        suggested_stallions: [],
        breeding_strategy: { primary_recommendation: "Analysis could not be fully parsed. Please try again." },
        overall_assessment: claudeResponse.substring(0, 2000),
        sources_used: [],
      };
    }

    // Save
    const displayName = mare_name || "Filter-based search";
    const { data: savedPlan } = await supabaseClient.from("broodmare_plans").insert({
      user_id: userId,
      breeding_goals: `[Stallion Suggestion] ${breeding_goals || "Best match for " + displayName}`,
      analysis_result: analysisData,
      recommended_stallions: analysisData.suggested_stallions || [],
    }).select().single();

    await Promise.all([
      supabaseClient.from("search_history").insert({
        user_id: userId, search_type: "stallion_suggestion",
        search_query: { mare_name: displayName, breeding_goals, budget_max, preferred_surface, preferred_distance, country_preference },
        results_data: analysisData,
      }),
      supabaseClient.from("activity_logs").insert({
        user_id: userId, action: "stallion_suggestion", resource_type: "breeding",
        metadata: { mare_name: displayName, stallions_suggested: analysisData.suggested_stallions?.length || 0, engine: "perplexity_fees_claude_compatibility" },
      }),
    ]);

    console.log("=== STALLION SUGGESTION COMPLETE ===");

    return new Response(JSON.stringify({ success: true, analysis: analysisData, plan: savedPlan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in stallion-suggestion:", rawMessage);
    const isClaude = /Claude API error|credit balance is too low/i.test(rawMessage);
    const safeMessage = isClaude
      ? "AI service temporarily unavailable. Your credit was not used. Please try again."
      : `Analysis failed. Your credit was not used. Please try again.`;
    return new Response(JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
