import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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

    const { horse_name } = await req.json();
    if (!horse_name) throw new Error("Horse name is required");

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("Fetching external data for horse:", horse_name);

    // ═══ STEP 1: Perplexity multi-source research ═══
    const [pedigreeSearch, performanceSearch, salesSearch, marketSearch] = await Promise.all([
      searchWithTiers(
        PERPLEXITY_API_KEY,
        `"${horse_name}" thoroughbred pedigree sire dam damsire siblings extended family produce record`,
        SITE_TIERS.pedigree,
        "SYNC_PEDIGREE"
      ),
      searchWithTiers(
        PERPLEXITY_API_KEY,
        `"${horse_name}" thoroughbred complete race record all starts wins places earnings prizes positions tracks distances`,
        SITE_TIERS.performance,
        "SYNC_PERFORMANCE"
      ),
      searchPerplexity(
        PERPLEXITY_API_KEY,
        `"${horse_name}" thoroughbred auction sale price hammer price buyer seller date`,
        SITE_TIERS.auctions,
        "SYNC_SALES"
      ),
      searchPerplexity(
        PERPLEXITY_API_KEY,
        `"${horse_name}" thoroughbred current owner breeder trainer market value progeny awards`,
        SITE_TIERS.marketInsights.tier1,
        "SYNC_MARKET"
      ),
    ]);

    const allCitations = [...new Set([
      ...pedigreeSearch.citations, ...performanceSearch.citations,
      ...salesSearch.citations, ...marketSearch.citations,
    ])];

    // ═══ STEP 2: Claude structures the data ═══
    const systemPrompt = `You are a bloodstock data aggregation expert. Structure the provided Perplexity research data into clean JSON.
Use ONLY the data provided — never fabricate.
${QUALITY_CONTROLS}

Return valid JSON:
{
  "horse_name": string,
  "pedigree": { "sire": string, "dam": string, "dam_sire": string, "siblings": [], "extended_family": {} },
  "performance": [{ "date": string, "track": string, "position": number, "prize_money": number, "race_type": string }],
  "sales": [{ "date": string, "price": number, "location": string, "auction_house": string }],
  "progeny": [{ "name": string, "performance_summary": string }],
  "market_analysis": { "estimated_value": number, "value_trend": string, "market_position": string },
  "comparative_analysis": { "vs_siblings": string, "potential_rating": number },
  "data_sources": [],
  "last_updated": string
}`;

    const userPrompt = `Consolidate data for "${horse_name}":

PEDIGREE:\n${pedigreeSearch.content}
PERFORMANCE:\n${performanceSearch.content}
SALES:\n${salesSearch.content}
MARKET:\n${marketSearch.content}

Citations: ${allCitations.join(", ")}`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { maxTokens: 6000 });
    const externalData = parseJsonFromResponse(claudeResponse) || { raw_response: claudeResponse };

    // Update horse record
    const { data: horseData } = await supabaseClient
      .from("horses")
      .select("id, pedigree_data, performance_data")
      .ilike("name", horse_name)
      .maybeSingle();

    if (horseData) {
      await supabaseClient
        .from("horses")
        .update({
          pedigree_data: {
            ...(horseData.pedigree_data || {}),
            ...externalData.pedigree,
            external_sources: externalData.data_sources,
          },
          performance_data: {
            ...(horseData.performance_data || {}),
            external_performance: externalData.performance,
            market_analysis: externalData.market_analysis,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", horseData.id);
    }

    await supabaseClient.from("activity_logs").insert({
      user_id: user.id,
      action: "external_api_sync",
      resource_type: "horse_data",
      resource_id: horseData?.id || null,
      metadata: { horse_name, sources: allCitations, data_updated: true },
    });

    return new Response(
      JSON.stringify({
        success: true,
        horse_name,
        external_data: externalData,
        message: "External data successfully consolidated",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in external-api-sync:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while syncing external data. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});