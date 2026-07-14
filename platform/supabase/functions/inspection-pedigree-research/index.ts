// Deep pedigree research for Sale Inspection Analysis.
// Uses Tavily to query approved bloodstock sources and Claude to synthesize a
// structured PedigreeResearch JSON consumed by PedigreeIntelligencePanel.
// Does NOT modify any existing Claude Vision / measurement pipeline.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APPROVED = [
  "racingpost.com", "racingtv.com", "timeform.com", "bloodhorse.com",
  "thoroughbreddailynews.com", "racingandsports.com.au", "equibase.com",
  "france-galop.com", "britishhorseracing.com", "ifhaonline.org",
  "tattersalls.com", "goffs.com", "arqana.com", "keeneland.com",
  "fasigtipton.com", "inglis.com.au", "magicmillions.com.au",
  "obssales.com", "jrha.or.jp", "pedigreequery.com",
];

async function tavilySearch(query: string, apiKey: string) {
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_domains: APPROVED,
      max_results: 6,
      include_answer: true,
    }),
  });
  if (!resp.ok) return { answer: null, results: [] };
  return await resp.json();
}

async function claudeJson(prompt: string, key: string): Promise<any> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
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
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { analysis_id, meta } = await req.json();
    if (!analysis_id || !meta) throw new Error("analysis_id and meta required");

    const sire = (meta.sire || "").trim();
    const dam = (meta.dam || "").trim();
    const damsire = (meta.damsire || "").trim();
    const horseName = (meta.horse_name || "").trim();

    const queries: Array<{ key: string; q: string }> = [];
    if (sire) {
      queries.push({ key: `sire_stats`, q: `${sire} stallion stud record progeny black type winners stats` });
      queries.push({ key: `sire_commercial`, q: `${sire} fee yearling sale averages commercial profile` });
    }
    if (dam) {
      queries.push({ key: `dam_produce`, q: `${dam} broodmare produce record black type runners` });
      queries.push({ key: `dam_sales`, q: `${dam} sales history price breeding stock` });
    }
    if (damsire) {
      queries.push({ key: `damsire`, q: `${damsire} broodmare sire influence black type damsire stats` });
    }
    if (horseName) {
      queries.push({ key: `horse_family`, q: `${horseName} pedigree family black type relatives siblings` });
    }

    const research: Record<string, any> = {};
    const allSources: string[] = [];
    for (const q of queries) {
      const r = await tavilySearch(q.q, TAVILY);
      research[q.key] = { answer: r?.answer, results: (r?.results ?? []).slice(0, 4) };
      for (const x of (r?.results ?? [])) if (x?.url) allSources.push(x.url);
    }

    const prompt = `You are a senior bloodstock analyst. Build a strict JSON intelligence report for a sales-inspection workspace.
Pedigree meta:
${JSON.stringify(meta, null, 2)}

Verified research notes (Tavily across approved sources only):
${JSON.stringify(research, null, 2)}

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
  "notes":"",
  "sources":[]
}`;

    const synth = await claudeJson(prompt, ANTHROPIC);
    const dedupedSources = Array.from(new Set([...(synth.sources ?? []), ...allSources])).slice(0, 12);
    const finalReport = { ...synth, sources: dedupedSources };

    await admin.from("inspection_analyses")
      .update({ pedigree_meta: meta, pedigree_research: finalReport })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ research: finalReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});