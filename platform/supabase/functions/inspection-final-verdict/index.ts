import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_PEDIGREE_MODEL") || "claude-sonnet-4-5-20250929";

const VERDICT_TOOL = {
  name: "final_buyer_verdict",
  description: "Return the final bloodstock buyer verdict synthesizing inspection, pedigree and market data.",
  input_schema: {
    type: "object",
    properties: {
      recommendation: { type: "string", enum: ["BUY", "WATCH", "PASS"] },
      confidence: { type: "number", description: "0-100 confidence in the recommendation." },
      headline: { type: "string", description: "One compelling line for the buyer." },
      reasoning: { type: "string", description: "2-4 paragraph synthesis tying pedigree, physical and commercial factors together." },
      strengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 },
      risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
      price_guidance: {
        type: "object",
        properties: {
          value_zone: { type: "string", description: "Fair value range e.g. £180k–£240k" },
          target_bid: { type: "string", description: "Suggested max bid" },
          walk_away: { type: "string", description: "Price above which to pass" },
          currency: { type: "string" },
          notes: { type: "string" },
        },
        required: ["value_zone", "target_bid", "walk_away"],
      },
      next_steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
    },
    required: [
      "recommendation",
      "confidence",
      "headline",
      "reasoning",
      "strengths",
      "risks",
      "price_guidance",
      "next_steps",
    ],
  },
};

function summarizeBlocks(blocks: Record<string, unknown>[]) {
  return blocks.map((b, i) => {
    const measures = Array.isArray(b.measurements_json)
      ? (b.measurements_json as Record<string, unknown>[])
          .map((m) => `${m.label}: ${m.value} (${m.classification ?? "—"})`)
          .join("; ")
      : "";
    const attn = Array.isArray(b.attention_points) ? (b.attention_points as string[]).join("; ") : "";
    return `Block #${i + 1} — ${b.media_purpose} — Score ${b.block_score ?? "—"}/100
Measurements: ${measures || "—"}
Attention: ${attn || "—"}
Observations: ${b.observations || "—"}
Bloodstock insight: ${b.bloodstock_insight || "—"}
Score breakdown: ${JSON.stringify(b.score_breakdown ?? {}).slice(0, 1200)}`;
  }).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysis_id } = await req.json();
    if (!analysis_id) {
      return new Response(JSON.stringify({ error: "analysis_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: analysis, error: aErr } = await admin
      .from("inspection_analyses")
      .select("*")
      .eq("id", analysis_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (aErr || !analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: blocks } = await admin
      .from("inspection_blocks")
      .select("*")
      .eq("analysis_id", analysis_id)
      .order("created_at", { ascending: true });

    if (!blocks?.length && !analysis.pedigree_research && !analysis.pedigree_insight) {
      return new Response(JSON.stringify({
        error: "Insufficient data — upload inspection material or pedigree research first.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = `
HORSE PROFILE
Name: ${analysis.horse_name}
Lot: ${analysis.lot_ref ?? "—"}
Category: ${analysis.horse_category}
Sale: ${analysis.auction_name ?? analysis.sale_context ?? "—"}
Consolidated score: ${analysis.consolidated_score ?? "—"}/100
Buyer notes: ${analysis.buyer_notes ?? "—"}

INSPECTION BLOCKS (${blocks?.length ?? 0})
${summarizeBlocks(blocks || [])}

PEDIGREE META
${JSON.stringify(analysis.pedigree_meta ?? {}, null, 2).slice(0, 4000)}

PEDIGREE RESEARCH
${JSON.stringify(analysis.pedigree_research ?? {}, null, 2).slice(0, 6000)}

PEDIGREE CROSS-INSIGHT
${analysis.pedigree_insight ?? "—"}

MARKET ESTIMATE
${JSON.stringify(analysis.market_estimate ?? {}, null, 2).slice(0, 3000)}

ROI PROJECTION
${JSON.stringify(analysis.roi_projection ?? {}, null, 2).slice(0, 3000)}

INTELLIGENCE SCORES
${JSON.stringify(analysis.intelligence_scores ?? {}, null, 2).slice(0, 2000)}
`.trim();

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 3500,
        temperature: 0.2,
        system: `You are a senior bloodstock buyer advising at a major Thoroughbred auction.
Synthesize ALL provided inspection blocks, pedigree intelligence and market/ROI data into one decisive buyer verdict.
Rules:
- recommendation must be exactly BUY, WATCH, or PASS
- confidence is 0-100 based on data completeness and alignment of pedigree vs physical
- Be specific to this horse — cite sire/dam, conformation flags, and commercial context
- price_guidance must reflect the market estimate when present; otherwise give conservative ranges with currency
- Never invent race results or sale prices not supported by the data
Call final_buyer_verdict.`,
        tools: [VERDICT_TOOL],
        tool_choice: { type: "tool", name: "final_buyer_verdict" },
        messages: [{ role: "user", content: context }],
      }),
    });

    if (!claudeResp.ok) {
      const t = await claudeResp.text();
      return new Response(JSON.stringify({
        error: `Claude verdict failed (${claudeResp.status})`,
        details: t.slice(0, 400),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeJson = await claudeResp.json();
    const verdict = (claudeJson?.content || []).find((b: { type?: string }) => b?.type === "tool_use")?.input;
    if (!verdict?.recommendation) {
      return new Response(JSON.stringify({ error: "Claude returned no structured verdict" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedAt = new Date().toISOString();
    const { error: upErr } = await admin
      .from("inspection_analyses")
      .update({
        final_verdict: verdict,
        final_verdict_generated_at: generatedAt,
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[inspection-final-verdict] user=${user.id} analysis=${analysis_id} rec=${verdict.recommendation}`);

    return new Response(JSON.stringify({
      success: true,
      final_verdict: verdict,
      final_verdict_generated_at: generatedAt,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[inspection-final-verdict]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
