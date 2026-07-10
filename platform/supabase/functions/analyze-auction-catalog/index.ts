import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const { catalogText, buyerCriteria, chunkIndex, totalChunks, pageRange } = await req.json();

    if (!catalogText || !buyerCriteria) {
      return new Response(
        JSON.stringify({ error: "Missing catalogText or buyerCriteria" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert bloodstock agent and thoroughbred pedigree analyst with deep knowledge of global auction markets, stallion performance data, and racing bloodlines. Your task is to analyze an auction catalog and identify the best lot opportunities based on the buyer's specific criteria. For each lot identified, provide the lot number, horse name, pedigree summary (sire, dam, dam sire), and a clear 3-5 sentence justification explaining why this lot matches the buyer's racing objective, target market, distance preference, bloodline preferences, and budget. Be precise, technical, and think like a professional bloodstock advisor preparing a shortlist for a high-value client.

CRITICAL RULES:
- Only identify lots that genuinely match the buyer's criteria
- If no lots match in this chunk, return an empty array
- Be conservative — only flag lots you would confidently recommend to a real client
- Use exact lot numbers from the catalog
- For matchScore use: "HIGH" (excellent match), "STRONG" (good match), "CONSIDER" (worth reviewing)

Return ONLY valid JSON in this exact format:
{
  "lots": [
    {
      "lotNumber": "123",
      "horseName": "Name of Horse",
      "pedigreeLine": "Sire x Dam (by Dam Sire)",
      "estimatedPrice": "$50,000 - $80,000",
      "justification": "3-5 sentence explanation...",
      "matchScore": "HIGH"
    }
  ],
  "lotsScanned": 25
}`;

    const MAX_CATALOG_CHARS = 12000;
    const safeCatalogText = String(catalogText).slice(0, MAX_CATALOG_CHARS);

    const userMessage = `${buyerCriteria}

---

CATALOG PAGES ${pageRange} (Chunk ${chunkIndex} of ${totalChunks}):

${safeCatalogText}

---

Analyze the above catalog pages and identify any lots that match the buyer's criteria. Return the JSON response.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);

      if (response.status === 429 || response.status === 529) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 20000;

        return new Response(
          JSON.stringify({
            error: response.status === 529
              ? "AI service temporarily overloaded. Please wait and try again."
              : "Rate limited. Please wait and try again.",
            retryAfterMs: Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 20000,
            lots: [],
            lotsScanned: 0,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed", lots: [], lotsScanned: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await response.json();
    const rawText = claudeData.content?.[0]?.text || "";

    // Extract JSON from response
    let parsed: any = { lots: [], lotsScanned: 0 };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", rawText.slice(0, 500));
    }

    // Validate lots structure
    const validLots = (parsed.lots || []).filter(
      (lot: any) => lot.lotNumber && lot.horseName && lot.justification && lot.matchScore
    );

    return new Response(
      JSON.stringify({
        lots: validLots,
        lotsScanned: parsed.lotsScanned || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-auction-catalog error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", lots: [], lotsScanned: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
