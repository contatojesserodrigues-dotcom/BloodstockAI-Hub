import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callClaude, parseJsonFromResponse, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";
import { tavilySearchParallel, formatTavilyContext } from "../_shared/tavily-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// TAVILY + CLAUDE — live market research, structured intelligence
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!Deno.env.get("TAVILY_API_KEY")) throw new Error("TAVILY_API_KEY is not configured");

    console.log("=== MARKET INSIGHTS START (Tavily + Claude) ===");

    const [{ data: recentSales }, { data: topStallions }, { data: recentRaces }] = await Promise.all([
      supabaseClient.from("sales").select("*, horses(*)").order("sale_date", { ascending: false }).limit(100),
      supabaseClient.from("stallions").select("*, horses(*)").order("success_rate", { ascending: false }).limit(20),
      supabaseClient.from("races").select("*, horses(*)").order("race_date", { ascending: false }).limit(100),
    ]);

    const avgSalePrice = (recentSales || []).reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0) / ((recentSales || []).length || 1);
    const today = new Date().toISOString().split("T")[0];

    const researchResults = await tavilySearchParallel([
      { query: `Thoroughbred bloodstock market auction results ${today} Tattersalls Keeneland Goffs average price clearance`, label: "MARKET_AUCTIONS" },
      { query: `Top thoroughbred sires 2025 2026 stud fees progeny sales average offspring price`, label: "MARKET_SIRES" },
      { query: `Thoroughbred yearling breeze-up market trends 2026 regional buying patterns`, label: "MARKET_TRENDS" },
    ]);
    const researchContext = formatTavilyContext(researchResults);

    const systemPrompt = `You are BloodstockAI's market intelligence analyst.
Use ONLY the web research and internal database stats provided. Never fabricate auction results.
${QUALITY_CONTROLS}
Return ONLY valid JSON. Never mention AI vendors or search tools.`;

    const userPrompt = `Produce a comprehensive bloodstock market intelligence report for ${today}.

═══ LIVE WEB RESEARCH ═══
${researchContext}

═══ INTERNAL DATABASE STATISTICS ═══
- Average sale price: $${Math.round(avgSalePrice).toLocaleString()}
- Total sales tracked: ${(recentSales || []).length}
- Top stallions: ${(topStallions || []).slice(0, 5).map((s) => `${s.horses?.name}: ${s.success_rate}% success, $${s.stud_fee?.toLocaleString()} fee`).join("; ")}

Return JSON:
{
  "market_overview": { "region": "", "period": "", "total_gross": "", "average_price": "", "median_price": "", "clearance_rate": "", "currency": "USD" },
  "market_trends": { "overall_trend": "", "hot_bloodlines": [], "value_opportunities": [], "regional_insights": { "uk_ireland": "", "usa": "", "australia": "", "france": "" } },
  "top_performing_sires": [{ "sire_name": "", "average_sale_price": "", "number_sold": 0, "top_price": "", "trend_direction": "up|down|stable" }],
  "top_sires": [{ "name": "", "avg_price": 0, "success_rate": 0, "trend": "", "notable_offspring": [] }],
  "auction_highlights": [{ "auction_house": "", "sale_name": "", "top_lot": "", "price": "", "currency": "USD" }],
  "performance_trends": { "leading_sires_by_black_type": [], "emerging_sires": [], "hot_countries": [], "declining_segments": [] },
  "yearling_market_trend": { "average_price_change_percent": "", "most_desired_pedigree_patterns": [], "commercial_sire_activity": "" },
  "weanling_and_breeze_up_trends": { "breeze_up_average": "", "2yo_in_training_demand": "", "notable_observations": "" },
  "roi_analysis": { "yearlings": "", "breeding_stock": "", "racing_prospects": "" },
  "predictions": { "short_term": "", "long_term": "", "recommendations": [] },
  "overall_trend": { "direction": "", "confidence_level": "medium", "supporting_indicators": [] },
  "chart_data": {
    "price_trends": [{ "period": "", "avg_price": 0, "median_price": 0 }],
    "auction_comparison": [{ "auction_house": "", "total_gross": 0, "avg_price": 0, "clearance_rate": 0 }],
    "sire_rankings": [{ "sire": "", "avg_offspring_price": 0, "stakes_winners": 0 }]
  },
  "strategic_recommendations": [],
  "data_quality": { "sample_size": 0, "date_range": "", "confidence_level": "Medium" }
}

All monetary values in USD where possible.`;

    let insights: any;
    try {
      const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, {
        maxTokens: 10000,
        temperature: 0.2,
      });
      insights = parseJsonFromResponse(claudeResponse);
      if (!insights) {
        const jsonMatch = claudeResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try { insights = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Market analysis failed, returning fallback:", msg);
      insights = null;
    }

    if (!insights) {
      const fallbackInsights = {
        market_trends: {
          overall_trend: "Live market intelligence is temporarily unavailable. Displaying internal database statistics only.",
          hot_bloodlines: [],
          value_opportunities: [],
        },
        top_sires: (topStallions || []).slice(0, 10).map((s: any) => ({
          name: s.horses?.name ?? "Unknown",
          avg_price: 0,
          success_rate: s.success_rate ?? 0,
          trend: "",
          notable_offspring: [],
        })),
        roi_analysis: {},
        predictions: {},
        chart_data: { price_trends: [], auction_comparison: [], sire_rankings: [] },
      };
      return new Response(JSON.stringify({
        success: true,
        fallback: true,
        insights: fallbackInsights,
        statistics: {
          avg_sale_price: Math.round(avgSalePrice),
          total_sales: (recentSales || []).length,
          total_races: (recentRaces || []).length,
          top_stallions_count: (topStallions || []).length,
        },
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("=== MARKET INSIGHTS COMPLETE (Tavily + Claude) ===");

    return new Response(JSON.stringify({
      success: true, insights,
      statistics: { avg_sale_price: Math.round(avgSalePrice), total_sales: (recentSales || []).length, total_races: (recentRaces || []).length, top_stallions_count: (topStallions || []).length },
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in market-insights:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error), success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
