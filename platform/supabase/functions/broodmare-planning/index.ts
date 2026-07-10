import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import {
  callClaude,
  callClaudeWithDocument,
  parseJsonFromResponse,
} from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MareSchema = z.object({
  name: z.string().min(1).max(120),
  year_of_birth: z.number().int().min(1980).max(2030),
  owner: z.string().max(200).optional().default(""),
  farm: z.string().max(200).optional().default(""),
  country: z.string().max(80).optional().default(""),
  registration_authority: z.string().max(80).optional().default(""),
  colour: z.string().max(40).optional().default(""),
  breeding_status: z.enum(["maiden", "proven"]),
  previous_foals: z
    .array(
      z.object({
        year: z.number().int().optional(),
        sire: z.string().optional(),
        sex: z.string().optional(),
        sale_result: z.string().optional(),
        racing_result: z.string().optional(),
        current_status: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  previous_stallions: z.array(z.string()).optional().default([]),
  produce_notes: z.string().max(4000).optional().default(""),
});

const BodySchema = z.object({
  mare: MareSchema.optional(),
  objectives: z.array(z.string().max(60)).min(1).max(20).optional(),
  duration_years: z.number().int().min(2).max(6).optional(),
  pedigree_pdf_base64: z.string().max(15_000_000).optional(),
  pedigree_pdf_name: z.string().max(255).optional(),
  notes: z.string().max(2000).optional().default(""),
  extract_only: z.boolean().optional().default(false),
});

async function extractPedigree(apiKey: string, base64: string): Promise<any> {
  const sys =
    "You are an elite bloodstock pedigree analyst. Extract every detail from the provided thoroughbred pedigree page. Return STRICT JSON ONLY.";
  const prompt = `Parse this pedigree document and return JSON with this exact shape:
{
  "mare_name": string,
  "year_of_birth": number|null,
  "colour": string|null,
  "sire": { "name": string, "sire": string|null, "dam": string|null },
  "dam":  { "name": string, "sire": string|null, "dam": string|null },
  "generation_3": [ { "position": string, "name": string } ],
  "generation_4": [ { "position": string, "name": string } ],
  "black_type": [ { "name": string, "achievements": string, "relation": string } ],
  "red_caps":   [ { "name": string, "note": string } ],
  "champions":  [ { "name": string, "note": string } ],
  "female_family": { "family_number": string|null, "key_producers": string[], "notes": string },
  "inbreeding_crosses": [ { "ancestor": string, "generations": string, "coefficient": number|null } ],
  "catalogue_notation": string,
  "raw_summary": string
}
Return ONLY the JSON object — no commentary.`;
  try {
    const raw = await callClaudeWithDocument(apiKey, sys, prompt, base64, "application/pdf", {
      maxTokens: 8000,
      temperature: 0.1,
      timeoutMs: 120_000,
    });
    return parseJsonFromResponse(raw);
  } catch (e) {
    console.error("[broodmare-planning] pedigree extraction failed", e);
    return { error: String(e?.message ?? e) };
  }
}

async function tavilySearch(query: string): Promise<any[]> {
  const key = Deno.env.get("TAVILY_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "advanced",
        max_results: 6,
        include_domains: [
          "tattersalls.com",
          "goffs.com",
          "keeneland.com",
          "fasigtipton.com",
          "magicmillions.com.au",
          "inglis.com.au",
          "arqana.com",
          "obssales.com",
          "bloodhorse.com",
          "thoroughbreddailynews.com",
          "racingpost.com",
        ],
      }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data?.results ?? []).map((x: any) => ({
      title: x.title,
      url: x.url,
      content: x.content,
    }));
  } catch (e) {
    console.warn("[broodmare-planning] tavily error", e);
    return [];
  }
}

async function getMarketContext(
  supabase: any,
  mare: any,
  objectives: string[],
): Promise<any> {
  const cacheKey = `mkt:${(mare.country || "global").toLowerCase()}:${objectives
    .slice()
    .sort()
    .join(",")}`;
  try {
    const { data: cached } = await supabase
      .from("breeding_market_cache")
      .select("payload, fetched_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < 24 * 3600 * 1000) {
      return cached.payload;
    }
  } catch { /* ignore */ }

  const queries = [
    `top commercial thoroughbred stallions 2026 stud fees ${mare.country ?? ""}`,
    `yearling sales averages 2025 2026 commercial sires ${objectives.join(" ")}`,
    `leading freshman sires sales results 2025 black-type runners`,
  ];
  const results: Record<string, any[]> = {};
  await Promise.all(
    queries.map(async (q, i) => {
      results[`query_${i}`] = await tavilySearch(q);
    }),
  );
  const payload = { queries, results, generated_at: new Date().toISOString() };
  try {
    await supabase
      .from("breeding_market_cache")
      .upsert({ cache_key: cacheKey, payload, fetched_at: new Date().toISOString() });
  } catch { /* ignore */ }
  return payload;
}

function buildPlanningPrompt(
  mare: any,
  objectives: string[],
  duration: number,
  pedigree: any,
  market: any,
): { system: string; user: string } {
  const currentYear = new Date().getFullYear();
  const system = `You are the world's most senior thoroughbred bloodstock and breeding strategist, with the depth and judgement expected at Coolmore, Darley, Juddmonte, Godolphin, Lane's End, Arrowfield, Shadai and Yulong.

Your role: produce a multi-year, data-driven, commercially realistic Broodmare Plan. Every recommendation must be reasoned, evidence-based, and presented in the precise structured JSON schema requested. Never invent stud fees you do not know — when uncertain, mark confidence accordingly. Treat every monetary figure as a probabilistic projection, never a guaranteed price.`;

  const user = `Generate a complete AI Broodmare Plan covering ${duration} consecutive breeding seasons starting in ${
    currentYear + 1
  }.

## MARE
${JSON.stringify(mare, null, 2)}

## OBJECTIVES (multi-select from client)
${objectives.join(", ")}

## EXTRACTED PEDIGREE (from Claude Vision)
${JSON.stringify(pedigree ?? {}, null, 2)}

## LIVE MARKET CONTEXT (Tavily)
${JSON.stringify(market ?? {}, null, 2).slice(0, 12000)}

## REQUIRED OUTPUT — STRICT JSON, NO PROSE

{
  "executive_summary": string,
  "broodmare_overview": string,
  "pedigree_analysis": {
    "female_family": string,
    "sire_line_strength": string,
    "dam_line_strength": string,
    "black_type_density": string,
    "red_caps": string,
    "champion_influence": string,
    "generation_balance": string
  },
  "genetic_analysis": {
    "nick_rating_overall": number,
    "wright_inbreeding_coefficient": number,
    "genetic_diversity": number,
    "linebreeding": string,
    "outcross_rating": number
  },
  "physical_compatibility": {
    "expected_height": string,
    "expected_bone": string,
    "expected_scope": string,
    "expected_balance": string,
    "stride_profile": string,
    "speed_mechanics": string,
    "stamina_profile": string,
    "biomechanical_suitability": string
  },
  "performance_projection": {
    "early_2yo": number, "sprint_6f": number, "sprint_7f": number,
    "miler": number, "classic": number, "middle_distance": number,
    "stayer": number, "national_hunt": number,
    "late_maturing": number, "commercial_breeze": number, "owner_racing": number
  },
  "commercial_analysis": {
    "demand_index": number,
    "auction_appeal_score": number,
    "international_buyer_appeal": number,
    "liquidity_score": number,
    "commercial_risk": number,
    "price_confidence": number,
    "estimated_yearling_value_usd": { "low": number, "mid": number, "high": number },
    "estimated_breeze_up_value_usd": { "low": number, "mid": number, "high": number },
    "estimated_broodmare_value_usd": { "low": number, "mid": number, "high": number },
    "estimated_roi_percent": number
  },
  "scores": {
    "overall": number, "commercial_potential": number, "genetic_compatibility": number,
    "family_strength": number, "pedigree_quality": number, "nick": number,
    "expected_roi": number, "auction_appeal": number, "market_trend": number
  },
  "seasons": [
    {
      "year": number,
      "mare_age_at_cover": number,
      "strategic_goal": string,
      "expected_market": string,
      "commercial_goal": string,
      "expected_yearling_value_usd": { "low": number, "mid": number, "high": number },
      "expected_roi_percent": number,
      "expected_racing_profile": string,
      "reasoning": string,
      "top_stallions": [
        {
          "rank": number, "name": string, "country": string|null, "stud_fee_usd": number|null,
          "compatibility_score": number, "nick_rating": number, "pedigree_score": number,
          "commercial_score": number, "genetic_diversity": number, "inbreeding_level": number,
          "outcross_rating": number, "physical_compatibility": number,
          "expected_distance": string, "expected_surface": string, "expected_maturity": string,
          "commercial_appeal": number, "auction_suitability": number,
          "expected_roi_percent": number, "risk_rating": number, "confidence_score": number,
          "reasoning": string
        }
      ],
      "alternative_stallions": [
        { "name": string, "rationale": string, "compatibility_score": number }
      ]
    }
  ],
  "risk_assessment": string,
  "final_recommendation": string
}

Rules:
- Provide exactly ${duration} entries in "seasons".
- Each season's "top_stallions" must contain 25 entries, ranked 1..25.
- Each season's "alternative_stallions" must contain 5 entries.
- Reasoning must answer: Why this stallion this year? Would another be better next year? Should we increase commercial appeal / improve stamina / improve speed / produce an owner-racing horse / maximise auction return / improve the female family / preserve diversity / create future broodmare value?
- Reflect mare age progression and evolving market conditions across seasons.
- All numeric scores 0–100 unless noted. Probabilities 0–1. Currency in USD.
- Output JSON ONLY.`;

  return { system, user };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { mare, objectives, duration_years, pedigree_pdf_base64, notes, extract_only } = parsed.data;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lightweight: pedigree extraction only (used by AI Mating Plan PDF upload)
    if (extract_only) {
      if (!pedigree_pdf_base64) {
        return new Response(JSON.stringify({ error: "pedigree_pdf_base64 required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const pedigree = await extractPedigree(anthropicKey, pedigree_pdf_base64);
      return new Response(JSON.stringify({ pedigree }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mare || !objectives || !duration_years) {
      return new Response(JSON.stringify({ error: "mare, objectives, duration_years required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Pedigree extraction (Claude Vision)
    let pedigree: any = null;
    if (pedigree_pdf_base64) {
      pedigree = await extractPedigree(anthropicKey, pedigree_pdf_base64);
    }

    // 2) Market context (Tavily, cached)
    const market = await getMarketContext(supabase, mare, objectives);

    // 3) AI Planning (Claude Sonnet)
    const { system, user } = buildPlanningPrompt(
      mare,
      objectives,
      duration_years,
      pedigree,
      market,
    );
    const raw = await callClaude(anthropicKey, system, user + (notes ? `\n\nClient notes:\n${notes}` : ""), {
      maxTokens: 16000,
      temperature: 0.25,
      timeoutMs: 300_000,
    });
    const plan = parseJsonFromResponse(raw);
    if (!plan || typeof plan !== "object") {
      return new Response(JSON.stringify({ error: "AI did not return a valid plan" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Persist
    const { data: saved, error: dbErr } = await supabase
      .from("broodmare_plans_v2")
      .insert({
        user_id: roleCheck.userId,
        mare,
        objectives,
        duration_years,
        pedigree_extraction: pedigree,
        analytics: {
          scores: plan.scores ?? {},
          genetic_analysis: plan.genetic_analysis ?? {},
          commercial_analysis: plan.commercial_analysis ?? {},
          physical_compatibility: plan.physical_compatibility ?? {},
          performance_projection: plan.performance_projection ?? {},
          pedigree_analysis: plan.pedigree_analysis ?? {},
          executive_summary: plan.executive_summary ?? "",
          broodmare_overview: plan.broodmare_overview ?? "",
          risk_assessment: plan.risk_assessment ?? "",
          final_recommendation: plan.final_recommendation ?? "",
          market_context: { generated_at: market?.generated_at, queries: market?.queries ?? [] },
        },
        seasons: plan.seasons ?? [],
      })
      .select()
      .single();

    if (dbErr) console.error("[broodmare-planning] insert error", dbErr);

    return new Response(
      JSON.stringify({ plan, plan_id: saved?.id ?? null, pedigree }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[broodmare-planning] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});