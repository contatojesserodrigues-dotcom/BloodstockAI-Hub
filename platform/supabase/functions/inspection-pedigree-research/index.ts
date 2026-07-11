// Deep pedigree research for Sale Inspection Analysis.
// Uses shared Tavily client + research query builder + Python intelligence pipeline.

import { createClient } from "npm:@supabase/supabase-js@2";
import { tavilySearch, formatTavilyContext, citationsFromTavily } from "../_shared/tavily-client.ts";
import { buildPedigreeResearchQueries, type PedigreeMeta } from "../_shared/inspection-ai/research_queries.ts";
import {
  mergeIntelligenceBundle,
  triggerMarketEstimate,
  triggerPedigreeIntelligence,
  triggerScientificScoring,
  updateProcessingStep,
} from "../_shared/inspection-ai/pipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function claudeJson(prompt: string, key: string): Promise<Record<string, unknown>> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`AI error ${resp.status}`);
  const json = await resp.json();
  const text = json?.content?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[0]);
}

async function runResearchPipeline(
  admin: ReturnType<typeof createClient>,
  analysisId: string,
  userId: string,
  meta: PedigreeMeta,
) {
  const queries = buildPedigreeResearchQueries(meta);
  const total = queries.length || 1;
  const rawResearch: Record<string, unknown> = {};
  const tavilyResults = [];

  await updateProcessingStep(admin, analysisId, "tavily_research", "running", 5, { total_queries: total });

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const result = await tavilySearch(q.query, q.label, { maxResults: 6 });
    rawResearch[q.key] = { answer: result.answer, results: result.sources };
    tavilyResults.push(result);
    const pct = Math.round(5 + ((i + 1) / total) * 55);
    await updateProcessingStep(admin, analysisId, "tavily_research", "running", pct, { query: q.key });
  }

  await updateProcessingStep(admin, analysisId, "research_synthesis", "running", 65);

  const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY")!;
  const prompt = `You are a senior bloodstock analyst. Build a strict JSON intelligence report for a sales-inspection workspace.
Pedigree meta:
${JSON.stringify(meta, null, 2)}

Verified research notes (Tavily across approved sources only):
${formatTavilyContext(tavilyResults)}

RULES:
- Only use facts present in the research notes. If a field is not supported, set "verified": false and value as concise "Not verified" placeholder or empty string.
- Never invent race names, ratings, sale prices, buyers, or trainers.
- Each Verifiable field is { "value": string, "verified": boolean }.

Return ONLY this JSON:
{
  "sire": { "name":"", "race_record":{}, "stud_record":{}, "best_progeny":[], "black_type_winners":{}, "sale_averages":{}, "surface":{}, "distance":{}, "commercial":{} },
  "dam":  { "name":"", "race_record":{}, "produce_record":{}, "black_type_progeny":{}, "sales_history":{}, "best_runners":[], "broodmare_value":{}, "family_strength":{} },
  "damsire": { "name":"", "influence":{}, "black_type":{}, "commercial":{}, "distance_surface":{} },
  "siblings": [{ "name":"", "year":"", "sex":"", "sire":"", "record":"", "earnings":"", "rating":"", "black_type":"", "sale_price":"", "buyer":"", "trainer":"", "status":"", "verified": false }],
  "black_type_family": { "winners":[], "placed":[], "side":"", "sire_line":"", "female_family":"", "notes":"" },
  "nick_rating": null,
  "notes":"",
  "sources":[]
}`;

  const synth = await claudeJson(prompt, ANTHROPIC);
  const dedupedSources = Array.from(new Set([...(synth.sources as string[] ?? []), ...citationsFromTavily(tavilyResults)])).slice(0, 15);
  const finalReport = { ...synth, sources: dedupedSources, raw_queries: rawResearch };

  await admin.from("inspection_analyses")
    .update({ pedigree_meta: meta, pedigree_research: finalReport })
    .eq("id", analysisId)
    .eq("user_id", userId);

  await mergeIntelligenceBundle(admin, analysisId, {
    research_summary: { queries: queries.map((q) => q.key), source_count: dedupedSources.length },
  });

  await updateProcessingStep(admin, analysisId, "pedigree_intelligence", "running", 75);

  const intelligence = await triggerPedigreeIntelligence(analysisId, userId, finalReport);

  if (intelligence?.intelligence) {
    finalReport.pedigree_rating = (intelligence.intelligence as Record<string, unknown>).pedigree_rating;
    finalReport.pedigree_score = (intelligence.intelligence as Record<string, unknown>).pedigree_score;
    await admin.from("inspection_analyses")
      .update({ pedigree_research: finalReport })
      .eq("id", analysisId);
  }

  await updateProcessingStep(admin, analysisId, "scientific_scoring", "running", 85);
  await triggerScientificScoring(analysisId, userId);

  await updateProcessingStep(admin, analysisId, "market_estimate", "running", 92);
  await triggerMarketEstimate(analysisId, userId);

  await updateProcessingStep(admin, analysisId, "complete", "complete", 100);
  return finalReport;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TAVILY = Deno.env.get("TAVILY_API_KEY");
    const ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY");
    if (!TAVILY || !ANTHROPIC) throw new Error("Search/AI keys not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { analysis_id, meta, async: runAsync } = await req.json();
    if (!analysis_id || !meta) throw new Error("analysis_id and meta required");

    const normalizedMeta: PedigreeMeta = {
      horse_name: meta.horse_name,
      sire: meta.sire,
      dam: meta.dam,
      damsire: meta.damsire || meta.dam_sire,
      sex: meta.sex,
      dob: meta.dob || meta.year_of_birth,
      breeder: meta.breeder,
      vendor: meta.vendor,
      consignor: meta.consignor,
      lot_number: meta.lot_number || meta.lot_ref,
      sale: meta.sale,
      country: meta.country,
      covering_sire: meta.covering_sire,
      covering_year: meta.covering_year,
    };

    if (runAsync !== false) {
      // Return immediately; pipeline continues in background (PASSO 10)
      const bg = runResearchPipeline(admin, analysis_id, user.id, normalizedMeta).catch(async (e) => {
        console.error("[pedigree-research] pipeline failed", e);
        await updateProcessingStep(admin, analysis_id, "tavily_research", "failed", 0, { error: String(e?.message ?? e) });
      });
      // @ts-ignore Supabase Edge Runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(bg);
      } else {
        await bg;
      }

      return new Response(JSON.stringify({ status: "processing", analysis_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalReport = await runResearchPipeline(admin, analysis_id, user.id, normalizedMeta);
    return new Response(JSON.stringify({ research: finalReport, status: "complete" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
