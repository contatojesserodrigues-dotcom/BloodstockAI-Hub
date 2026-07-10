import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callClaude, parseJsonFromResponse, searchPerplexity, SITE_TIERS, SOURCES, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    // Support both old 2-upload mode and new multi-horse mode
    const uploadIds: string[] = body.upload_ids || [body.upload_id_a, body.upload_id_b].filter(Boolean);
    const mode = body.mode || "two_upload";

    if (uploadIds.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 uploads required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all uploads
    const uploads = await Promise.all(
      uploadIds.map(id =>
        supabaseClient.from("pdf_uploads").select("*").eq("id", id).eq("user_id", user.id).single()
      )
    );

    const failedFetch = uploads.find(r => r.error);
    if (failedFetch) {
      return new Response(JSON.stringify({ error: "Could not fetch one or more uploads" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uploadData = uploads.map(r => r.data!);
    console.log(`Comparing ${uploadData.length} uploads: ${uploadData.map(u => u.file_name).join(", ")}`);

    // Gather horse data from each upload
    const allHorseData = uploadData.map(u => {
      const ed = u.extracted_data as any;
      return {
        file_name: u.file_name,
        horses: ed?.horses || [],
        summary: ed?.catalog_summary || null,
      };
    });

    // Perplexity enrichment for each horse
    let perplexityData = "";
    if (PERPLEXITY_API_KEY && mode === "multi_horse") {
      const horseNames: Array<{ name: string; sire?: string; dam?: string; damsire?: string }> = [];
      for (const ud of allHorseData) {
        for (const h of ud.horses.slice(0, 3)) {
          const name = h.name || h.horse_name;
          if (name) horseNames.push({
            name, sire: h.pedigree?.sire || h.sire, dam: h.pedigree?.dam || h.dam, damsire: h.pedigree?.dam_sire || h.dam_sire
          });
        }
      }

      const searches = await Promise.all(
        horseNames.slice(0, 10).flatMap(h => [
          searchPerplexity(PERPLEXITY_API_KEY, `"${h.sire || ''}" offspring earnings stakes winners first crop statistics`, [...SOURCES.PERFORMANCE, ...SOURCES.PEDIGREE].slice(0, 15), `SIRE_${h.name}`),
          searchPerplexity(PERPLEXITY_API_KEY, `"${h.dam || ''}" produce record foals performance best offspring`, [...SOURCES.PERFORMANCE, ...SOURCES.PEDIGREE].slice(0, 15), `DAM_${h.name}`),
          h.damsire ? searchPerplexity(PERPLEXITY_API_KEY, `"${h.damsire}" broodmare sire statistics AEI offspring quality`, [...SOURCES.PEDIGREE, ...SOURCES.PERFORMANCE].slice(0, 15), `DAMSIRE_${h.name}`) : Promise.resolve({ content: "", citations: [] }),
          searchPerplexity(PERPLEXITY_API_KEY, `"${h.sire || ''}" x "${h.damsire || ''}" nick rating best crosses stakes winners`, [...SOURCES.PEDIGREE, ...SOURCES.PERFORMANCE].slice(0, 15), `NICK_${h.name}`),
          searchPerplexity(PERPLEXITY_API_KEY, `comparable yearling foal "${h.sire || ''}" auction price 2024 2025`, [...SOURCES.AUCTIONS, ...SOURCES.NEWS].slice(0, 15), `MARKET_${h.name}`),
        ])
      );
      perplexityData = searches.map(s => s.content).filter(Boolean).join("\n\n");
    }

    const systemPrompt = `You are BloodstockAI — the world's leading forensic bloodstock comparison analyst.
You are comparing ${uploadData.length} horses from individual pedigree PDFs.
These are typically foals, yearlings, or unraced horses without a race record.

${QUALITY_CONTROLS}

CRITICAL RULES:
- Analyze each horse individually with FULL pedigree, family, and market analysis
- Calculate Wright's inbreeding coefficient where pedigree data allows
- Generate B-I-C-S-P dosage profile where possible
- Rate nick quality from A++ to F based on historical cross success
- For each horse: deep-analyze siblings, sire statistics, dam produce record, damsire broodmare record
- Provide professional bloodstock agent insight for each horse
- Then create a side-by-side comparison table
- Declare a winner with professional justification
- Provide market context commentary
- All scores 0-100

Return valid JSON:
{
  "horses": [
    {
      "name": "", "source_file": "",
      "pedigree": {
        "sire": "", "dam": "", "dam_sire": "",
        "nick_rating": "A++/A+/A/B+/B/C/D/F", "nick_explanation": "",
        "inbreeding_coefficient": 0, "inbreeding_to": [],
        "dosage_profile": { "B": 0, "I": 0, "C": 0, "S": 0, "P": 0, "DI": 0, "CD": 0 },
        "female_family": "", "key_ancestors": []
      },
      "siblings": [{ "name": "", "best_result": "", "earnings": "", "stakes_winner": false }],
      "sire_stats": {
        "runners": 0, "winners": 0, "stakes_winners": 0, "win_rate": 0,
        "stud_fee": "", "best_progeny": [{ "name": "", "achievement": "" }]
      },
      "dam_produce": [{ "name": "", "year": 0, "sire": "", "result": "", "stakes": false }],
      "damsire_stats": { "aei": 0, "broodmare_record": "" },
      "market_value": {
        "estimated_range": "$X — $Y",
        "comparable_sales": [{ "horse": "", "sire": "", "sale": "", "year": "", "price": "" }],
        "demand_level": "High/Medium/Low",
        "best_sale_to_enter": "",
        "market_trend": ""
      },
      "scores": {
        "pedigree_score": 0, "performance_score": 0, "commercial_score": 0,
        "overall_score": 0, "sire_strength": 0, "dam_quality": 0, "family_record": 0
      },
      "strengths": [], "weaknesses": [],
      "agent_verdict": "BUY/WATCH/PASS",
      "verdict_reason": "",
      "professional_insight": "Written as an experienced bloodstock agent — direct, confident, specific. Include specific data, comparable sales, nick evidence.",
      "recommended_action": "",
      "market_timing": ""
    }
  ],
  "comparison_table": [
    { "criteria": "Pedigree Score", "scores": { "HorseName1": 91, "HorseName2": 78 }, "best": "HorseName1" },
    { "criteria": "Nick Rating", "scores": { "HorseName1": "A+", "HorseName2": "B+" }, "best": "HorseName1" },
    { "criteria": "Sire Strength", "scores": {}, "best": "" },
    { "criteria": "Dam Quality", "scores": {}, "best": "" },
    { "criteria": "Inbreeding %", "scores": {}, "best": "" },
    { "criteria": "Market Value", "scores": {}, "best": "" },
    { "criteria": "Family Record", "scores": {}, "best": "" },
    { "criteria": "Overall Score", "scores": {}, "best": "" },
    { "criteria": "Recommendation", "scores": {}, "best": "" }
  ],
  "winner": {
    "name": "",
    "justification": "Detailed professional reasoning as an experienced bloodstock agent"
  },
  "market_context": {
    "sire_demand": "Rising/Stable/Softening with context",
    "price_trend": "Average price trend last 12 months",
    "upcoming_sales": "Key upcoming sales where similar horses appear",
    "best_markets": "Best global markets for these bloodlines",
    "commentary": "Full market commentary by the bloodstock agent"
  }
}`;

    const userPrompt = `COMPARE THESE ${uploadData.length} HORSES:

${allHorseData.map((ud, i) => `
=== HORSE ${i + 1}: "${ud.file_name}" ===
${JSON.stringify(ud.horses.slice(0, 3), null, 2)}
${ud.summary ? `Summary: ${JSON.stringify(ud.summary)}` : ""}
`).join("\n")}

PERPLEXITY RESEARCH DATA:
${perplexityData || "No additional research data available — use extracted PDF data and your knowledge of bloodlines."}

INSTRUCTIONS:
1. Analyze each horse individually with FULL depth — pedigree, nick, dosage, inbreeding, siblings, sire stats, dam produce, market value
2. Write professional insights as a bloodstock agent for each horse
3. Create comparison table with all horses side by side
4. Declare a winner with professional justification
5. Provide market context and timing advice
6. All scores must be backed by evidence from the data

Return COMPLETE structured JSON. Do NOT truncate.`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { maxTokens: 12000 });
    const comparison = parseJsonFromResponse(claudeResponse) || { horses: [], summary: claudeResponse };

    // Log activity
    await supabaseClient.from("activity_logs").insert({
      user_id: user.id, action: "compare_uploads", resource_type: "pdf_upload",
      metadata: { upload_ids: uploadIds, file_names: uploadData.map(u => u.file_name), mode, horse_count: uploadData.length },
    });

    // For backward compatibility
    const file_a = uploadData[0]?.file_name || "";
    const file_b = uploadData[1]?.file_name || "";

    return new Response(JSON.stringify({
      success: true,
      ...comparison,
      comparison,
      file_a,
      file_b,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in compare-uploads:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
