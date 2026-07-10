import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { searchPerplexity, searchWithTiers, callClaude, parseJsonFromResponse, SITE_TIERS, SOURCES, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      horse_names: z.array(z.string().min(2).max(100)).min(2).max(10),
    });

    const body = await req.json();
    const parseResult = Schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input. Provide 2-10 horse names.", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { horse_names } = parseResult.data;

    console.log("=== HORSE COMPARISON START ===", horse_names);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // ═══ 4 searches per horse (Career, Ratings, Pedigree, Sales) ═══
    const searchPromises = horse_names.flatMap((name) => [
      searchPerplexity(PERPLEXITY_API_KEY,
        `"${name}" race results all starts wins places earnings career record`,
        [...SITE_TIERS.performance.tier1],
        `CAREER_${name}`),
      searchPerplexity(PERPLEXITY_API_KEY,
        `"${name}" timeform rating RPR rating best performance speed figure Beyer`,
        [...SITE_TIERS.performance.tier2, "racingpost.com"],
        `RATINGS_${name}`),
      searchPerplexity(PERPLEXITY_API_KEY,
        `"${name}" pedigree sire dam damsire stakes race graded race`,
        [...SITE_TIERS.pedigree.tier1.slice(0, 5), ...SITE_TIERS.marketInsights.tier1],
        `PEDIGREE_${name}`),
      searchPerplexity(PERPLEXITY_API_KEY,
        `"${name}" auction sale price hammer price`,
        SITE_TIERS.auctions,
        `SALES_${name}`),
    ]);

    const searchResults = await Promise.all(searchPromises);
    const allCitations = searchResults.flatMap(r => r.citations);

    // Group results per horse (4 results each)
    const combinedData = horse_names.map((name, i) => 
      `═══ ${name.toUpperCase()} ═══\nCAREER RECORD:\n${searchResults[i * 4].content}\n\nRATINGS & FIGURES:\n${searchResults[i * 4 + 1].content}\n\nPEDIGREE & STAKES:\n${searchResults[i * 4 + 2].content}\n\nSALES HISTORY:\n${searchResults[i * 4 + 3].content}`
    ).join("\n\n");

    console.log("Step 1 complete. Step 2: Claude analysis...");

    const systemPrompt = `You are BloodstockAI, the world's most advanced thoroughbred comparison analyst.

RULES:
1. Use ONLY the search data provided. Never use training data for specific facts.
2. You MUST explicitly reference the Perplexity data in your analysis.
3. For RETIRED horses, use all historical career data found.
4. Every score must be calculated from actual data.

${QUALITY_CONTROLS}

SCORING RULES for each horse:
- speed_rating (0-100): Scale best figure proportionally. G1 winner = min 75. Multiple G1 winner = 85+.
- consistency (0-100): From win%. 100% = 95-100. 70%+ = 85-90. 50% = 70-75. 30% = 55-60.
- class_rating (0-100): G1 winner = 90+. G2 = 75-89. G3 = 60-74. Listed = 50-59.
- distance_versatility (0-100): Raced at many distances successfully = high.
- surface_adaptability (0-100): Won on multiple surfaces = high.
- earnings_index (0-100): Scale relative to highest earner in comparison group.

COMPARISON CHART DATA (for frontend visualization):
Include a "chart_data" object:
- "radar_comparison": [{ "horse": "name", "speed": N, "consistency": N, "class": N, "versatility": N, "earnings": N }]
- "earnings_comparison": [{ "horse": "name", "earnings": N }]

Return JSON wrapped in <JSON> tags.`;

    const today = new Date().toISOString().split("T")[0];

    const claudeResponse = await callClaude(
      ANTHROPIC_API_KEY,
      systemPrompt,
      `Compare these ${horse_names.length} thoroughbred horses using ONLY the verified data below. Today: ${today}

${combinedData}

Generate a comprehensive comparison. Return JSON in <JSON> tags:
<JSON>
{
  "horses": [
    {
      "name": "",
      "country": "",
      "year_of_birth": 0,
      "status": "",
      "sire": "",
      "dam": "",
      "career": { "starts": 0, "wins": 0, "places": 0, "win_percentage": 0, "earnings": "" },
      "best_distance": "",
      "surface_preference": "",
      "class_level": "",
      "best_rpr": null,
      "best_beyer": null,
      "best_timeform": null,
      "trainer": "",
      "scores": {
        "speed_rating": 0,
        "consistency": 0,
        "class_rating": 0,
        "distance_versatility": 0,
        "surface_adaptability": 0,
        "earnings_index": 0
      }
    }
  ],
  "chart_data": {
    "radar_comparison": [],
    "earnings_comparison": []
  },
  "comparison_analysis": "",
  "strengths_weaknesses": [
    { "name": "", "strengths": [""], "weaknesses": [""] }
  ],
  "head_to_head": "",
  "recommendation": "",
  "best_value": "",
  "best_performer": "",
  "executive_summary": [],
  "verdict": "BUY/HOLD/SELL",
  "key_insights": [],
  "risk_factors": []
}
</JSON>`,
      { maxTokens: 12000 }
    );

    let result = parseJsonFromResponse(claudeResponse, "JSON") || {};

    // Post-process: ensure no 0 scores
    if (result.horses) {
      for (const horse of result.horses) {
        if (horse.scores && horse.career) {
          const s = horse.scores;
          const winPct = horse.career.win_percentage || 0;
          if (s.speed_rating === 0 && horse.career.starts > 0) s.speed_rating = Math.min(95, 50 + Math.round(winPct * 0.5));
          if (s.consistency === 0 && horse.career.starts > 0) s.consistency = Math.min(98, Math.round(winPct * 1.2 + 20));
          if (s.class_rating === 0) s.class_rating = 50;
          if (s.distance_versatility === 0) s.distance_versatility = 50;
          if (s.surface_adaptability === 0) s.surface_adaptability = 50;
          if (s.earnings_index === 0) s.earnings_index = 50;
        }
      }
    }

    result.citations = allCitations;

    await supabaseClient.from("activity_logs").insert({
      user_id: user.id,
      action: "horse_comparison",
      resource_type: "comparison",
      metadata: { horse_names, count: horse_names.length, engine: "perplexity+claude" },
    });

    console.log("=== HORSE COMPARISON COMPLETE ===");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Comparison error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Comparison failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
