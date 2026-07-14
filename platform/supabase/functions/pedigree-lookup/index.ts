import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");

    const { mareName, stallionNames } = await req.json();
    if (!mareName || typeof mareName !== "string" || mareName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Invalid mare name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[PEDIGREE-LOOKUP] Searching pedigree for: ${mareName}${stallionNames?.length ? ` + ${stallionNames.length} stallions` : ""}`);

    // Build stallion section for the prompt if provided
    const stallionSection = Array.isArray(stallionNames) && stallionNames.length > 0
      ? `\n\nALSO find the complete pedigree for each of these stallions (same JSON structure per stallion):
${stallionNames.map((s: string, i: number) => `${i + 1}. "${s}"`).join("\n")}

Return the stallion pedigrees in a "stallion_pedigrees" array within the main JSON response, each with the same fields as the mare pedigree.`
      : "";

    const prompt = `
Find the complete pedigree for the thoroughbred horse named "${mareName.trim()}".
Search https://www.pedigreequery.com and https://www.bloodhorse.com as PRIMARY sources. Also check equineline.com if needed.

Return ONLY a JSON object with exactly this structure, no markdown, no explanation:

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
  "racing_record": "brief summary of racing career if available, or null",
  "foal_history": "brief summary of produce record if broodmare, or null",
  "is_maiden": false,
  "confidence": "HIGH | MEDIUM | LOW",
  "source": "primary source used",
  "notes": "any relevant notes or ambiguities"
}

If the horse is not found or name is ambiguous, return:
{
  "found": false,
  "name": "${mareName.trim()}",
  "suggestions": ["possible match 1", "possible match 2"],
  "notes": "reason not found"
}

If multiple horses share this name, return the most prominent/recent thoroughbred broodmare or racehorse.
Prioritize: USA, IRE, FR, GB, BRZ markets.
${stallionSection}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const response = await fetch(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a thoroughbred pedigree research specialist. Search authoritative sources and return precise structured pedigree data. Return only valid JSON, never markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: stallionSection ? 4000 : 1500,
        temperature: 0.1,
        return_citations: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PEDIGREE-LOOKUP] Perplexity error:", response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let pedigree;
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      // Extract JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      pedigree = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch {
      console.warn("[PEDIGREE-LOOKUP] Parse error, returning fallback");
      pedigree = {
        found: false,
        name: mareName.trim(),
        notes: "Parse error — manual entry required",
      };
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
