import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import { searchPerplexity, parseJsonFromResponse, SOURCES, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// PERPLEXITY ONLY — sources hidden in frontend (TDN, Blood-Horse, RP)
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check removed — this endpoint is now public for the Market Update page

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");

    console.log("=== MARKET INSIGHTS START (PERPLEXITY ONLY) ===");

    const [{ data: recentSales }, { data: topStallions }, { data: recentRaces }] = await Promise.all([
      supabaseClient.from("sales").select("*, horses(*)").order("sale_date", { ascending: false }).limit(100),
      supabaseClient.from("stallions").select("*, horses(*)").order("success_rate", { ascending: false }).limit(20),
      supabaseClient.from("races").select("*, horses(*)").order("race_date", { ascending: false }).limit(100),
    ]);

    const avgSalePrice = (recentSales || []).reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0) / ((recentSales || []).length || 1);

    const priceByYear: Record<string, number[]> = {};
    (recentSales || []).forEach(s => {
      const year = new Date(s.sale_date).getFullYear().toString();
      if (!priceByYear[year]) priceByYear[year] = [];
      if (s.sale_price) priceByYear[year].push(Number(s.sale_price));
    });

    const today = new Date().toISOString().split("T")[0];

    // Single comprehensive Perplexity query for market intelligence
    const marketQuery = `Thoroughbred bloodstock market intelligence report for ${today}.

Include:
1. Latest auction results from Tattersalls, Keeneland, Goffs, Fasig-Tipton, Arqana, Magic Millions, Inglis, OBS — total gross, average price, clearance rate, top lots
2. Top sires by offspring average sale price 2024-2025, stud fee changes
3. Market trends: yearling market analysis, breeding stock demand, regional buying patterns, breeze-up trends
4. Industry news: latest racing results, stakes winners, champion updates

INTERNAL DATABASE STATISTICS:
- Average sale price: $${Math.round(avgSalePrice).toLocaleString()}
- Total sales tracked: ${(recentSales || []).length}
- Top stallions: ${(topStallions || []).slice(0, 5).map(s => `${s.horses?.name}: ${s.success_rate}% success, $${s.stud_fee?.toLocaleString()} fee`).join("; ")}

Return a comprehensive market intelligence JSON report with this structure:
\`\`\`json
{
  "market_overview": { "region": "", "period": "", "total_gross": "", "average_price": "", "median_price": "", "clearance_rate": "", "currency": "USD" },
  "market_trends": { "overall_trend": "", "hot_bloodlines": [], "value_opportunities": [], "regional_insights": { "uk_ireland": "", "usa": "", "australia": "", "france": "" } },
  "top_performing_sires": [{ "sire_name": "", "average_sale_price": "", "number_sold": 0, "top_price": "", "trend_direction": "up", "data_source": "" }],
  "top_sires": [{ "name": "", "avg_price": 0, "success_rate": 0, "trend": "", "notable_offspring": [], "data_source": "" }],
  "auction_highlights": [{ "auction_house": "", "sale_name": "", "top_lot": "", "price": "", "currency": "USD", "buyer_if_available": "" }],
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
  "data_quality": { "sample_size": 0, "date_range": "", "confidence_level": "Medium" },
  "verified_sources_used": []
}
\`\`\`

All values in USD. Return ONLY the JSON.`;

    let searchResult;
    try {
      searchResult = await searchPerplexity(PERPLEXITY_API_KEY, marketQuery,
        ["thoroughbreddailynews.com", "bloodhorse.com", "racingpost.com", "tattersalls.com", "keeneland.com", "arqana.com", "magicmillions.com.au"],
        "MARKET_INTELLIGENCE");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Perplexity search failed, returning fallback:", msg);
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
        degraded_reason: msg.includes("QUOTA") ? "Market data provider quota exceeded" : "Market data provider unavailable",
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

    let insights = parseJsonFromResponse(searchResult.content);
    if (!insights) {
      // Try extracting from code block
      const jsonMatch = searchResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try { insights = JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
      }
    }

    if (!insights) {
      insights = {
        market_trends: { overall_trend: searchResult.content.substring(0, 1000), hot_bloodlines: [], value_opportunities: [] },
        top_sires: [], roi_analysis: {}, predictions: {},
        chart_data: { price_trends: [], auction_comparison: [], sire_rankings: [] },
      };
    }

    // Activity log skipped for public endpoint (no authenticated user)

    console.log("=== MARKET INSIGHTS COMPLETE (PERPLEXITY ONLY) ===");

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
