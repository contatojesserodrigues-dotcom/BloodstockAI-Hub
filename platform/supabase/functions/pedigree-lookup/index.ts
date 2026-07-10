import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";
import { callClaude, parseJsonFromResponse } from "../_shared/ai-clients.ts";
import { tavilySearch, formatTavilyContext } from "../_shared/tavily-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { mareName, stallionNames } = await req.json();
    if (!mareName || typeof mareName !== "string" || mareName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Invalid mare name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mare = mareName.trim();
    const stallions: string[] = Array.isArray(stallionNames)
      ? stallionNames.filter((s) => typeof s === "string" && s.trim().length >= 2).map((s) => s.trim())
      : [];

    console.log(`[PEDIGREE-LOOKUP] Tavily + Claude for: ${mare}${stallions.length ? ` + ${stallions.length} stallions` : ""}`);

    const researchQueries = [
      { query: `"${mare}" thoroughbred pedigree sire dam racing record produce`, label: "PEDIGREE_MARE" },
      ...stallions.map((s, i) => ({
        query: `"${s}" thoroughbred stallion pedigree progeny statistics stud fee`,
        label: `PEDIGREE_STALLION_${i + 1}`,
      })),
    ];

    const researchResults = await Promise.all(
      researchQueries.map(({ query, label }) => tavilySearch(query, label)),
    );
    const researchContext = formatTavilyContext(researchResults);

    const stallionSection = stallions.length > 0
      ? `\nAlso include pedigree data for these stallions in a "stallion_pedigrees" array (same fields as mare):
${stallions.map((s, i) => `${i + 1}. "${s}"`).join("\n")}`
      : "";

    const systemPrompt = `You are a thoroughbred pedigree research specialist.
Use ONLY the web research provided. Never invent data — if unavailable, mark fields accordingly.
Return ONLY valid JSON, never markdown. Never mention AI vendors or search tools.`;

    const userPrompt = `Build a structured pedigree report for "${mare}" using this research:

${researchContext}

Return ONLY a JSON object:
{
  "found": true,
  "name": "exact registered name",
  "origin": "country code (USA/IRE/FR/GB/BRZ/ARG/AUS/etc)",
  "year_born": 2015,
  "sex": "Mare",
  "color": "Bay",
  "sire": "Sire Name (COUNTRY)",
  "dam": "Dam Name (COUNTRY)",
  "dam_sire": "Dam's Sire Name (COUNTRY)",
  "grandsire_paternal": "Sire's Sire (COUNTRY)",
  "granddam_paternal": "Sire's Dam (COUNTRY)",
  "grandsire_maternal": "Dam's Sire (COUNTRY)",
  "granddam_maternal": "Dam's Dam (COUNTRY)",
  "great_grandsires": ["GGS1 (COUNTRY)", "GGS2 (COUNTRY)", "GGS3 (COUNTRY)", "GGS4 (COUNTRY)"],
  "racing_record": "brief summary or null",
  "foal_history": "produce record if broodmare or null",
  "is_maiden": false,
  "confidence": "HIGH | MEDIUM | LOW",
  "notes": "any ambiguities"
  ${stallions.length ? ',"stallion_pedigrees": [{ "found": true, "name": "", "sire": "", "dam": "", "dam_sire": "", "confidence": "HIGH|MEDIUM|LOW" }]' : ""}
}

If not found:
{ "found": false, "name": "${mare}", "suggestions": [], "notes": "reason" }
${stallionSection}`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, {
      maxTokens: stallions.length ? 6000 : 2500,
      temperature: 0.1,
    });

    let pedigree = parseJsonFromResponse(claudeResponse);
    if (!pedigree) {
      const clean = claudeResponse.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      try {
        pedigree = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
      } catch {
        pedigree = { found: false, name: mare, notes: "Parse error — manual entry required" };
      }
    }

    console.log(`[PEDIGREE-LOOKUP] Result: found=${pedigree.found}, name=${pedigree.name}`);

    return new Response(JSON.stringify(pedigree), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PEDIGREE-LOOKUP] Error:", msg);
    return new Response(
      JSON.stringify({ error: "Pedigree lookup failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
