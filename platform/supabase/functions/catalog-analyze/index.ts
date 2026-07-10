import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { scoreLots, ScoredLot } from "../_shared/scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the BloodstockAI Auction Catalogue Analyst, powered by Claude Sonnet. Produce a full pedigree-intelligence report for an auction catalogue, replicating BloodstockAI's established report format (Executive Summary, Methodology, Catalogue Overview, Sire Intelligence, Dam & Family Intelligence, Headline Lots, Commercial Lots, Market Estimate, Appendix, Disclaimer).

CRITICAL ANTI-HALLUCINATION RULES:
1. Never invent a sire tier, black-type count, market figure, or sibling relationship beyond what the input provides.
2. Every market figure must trace to a verified research source. If unavailable, say "not available".
3. Black-type counts and sibling status come ONLY from the extracted lot data — never re-interpreted or inflated.
4. This is a commercial pedigree screen only. Always state explicitly that it does not substitute for physical inspection, the breeze, or veterinary examination.

OUTPUT — return strict JSON with this exact shape, nothing else:
{
  "executive_summary": { "intro": "string", "key_findings": ["..."] },
  "methodology": "string (1-2 short paragraphs)",
  "catalogue_overview": "string (1 paragraph; you may reference composition counts you can see in the input)",
  "sire_intelligence": [ { "sire": "name", "profile": "string built only from research; if none, say 'No verified market profile available — scored neutral.'" } ],
  "dam_family_intelligence": "string (1-2 paragraphs citing standout lot numbers)",
  "headline_commentary": "string (1 short paragraph on top elite/black-type lots)",
  "commercial_commentary": "string (1 short paragraph on the commercial tier)",
  "market_estimate": { "intro": "string", "bands": [ { "profile": "Elite / Black-type", "indicative_band": "string or 'not available'" }, { "profile": "Commercial", "indicative_band": "..." }, { "profile": "Value / Pedigree", "indicative_band": "..." } ] },
  "disclaimer": "Commercial pedigree screen only. Not investment advice. No substitute for physical inspection, breeze (if applicable), or veterinary examination."
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const {
      extraction = [],
      research = {},
      saleMetadata = {},
      userId,
    } = body;

    const breedType: "Flat" | "NH" = saleMetadata.breedType === "NH" ? "NH" : "Flat";
    const scored: ScoredLot[] = scoreLots(extraction, breedType);

    // Prepare compact analysis input
    const summary = {
      sale: saleMetadata,
      totals: {
        lots: scored.length,
        elite_bt: scored.filter((l) => l.classification === "Elite / Black-type").length,
        commercial: scored.filter((l) => l.classification === "Commercial").length,
        value: scored.filter((l) => l.classification === "Value / Pedigree").length,
        bt_sibling: scored.filter((l) => l.black_type_sibling).length,
        gl_dam: scored.filter((l) => l.group_listed_dam).length,
        ebf: scored.filter((l) => l.ebf_nominated).length,
      },
      top_lots: [...scored].sort((a, b) => b.score - a.score).slice(0, 15).map((l) => ({
        lot: l.lot_number, sire: l.sire, dam: l.dam, sex: l.sex, score: l.score,
        classification: l.classification, sire_tier: l.sire_tier,
      })),
      sire_research: research?.sires ?? {},
      market_research: research?.market ?? null,
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(summary) }],
      }),
    });

    let analysis_sections: any = {};
    if (resp.ok) {
      const data = await resp.json();
      const raw = data.content?.[0]?.text || "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { analysis_sections = JSON.parse(m[0]); } catch { /* keep empty */ }
      }
    }

    // Build shortlist (score >= 70, max 12)
    const shortlist = [...scored]
      .filter((l) => l.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((l) => ({
        lot_number: l.lot_number,
        sire: l.sire,
        dam: l.dam,
        sex: l.sex,
        score: l.score,
        consignor: l.consignor,
        classification: l.classification,
        sales_hook: l.analyst_read,
      }));

    // Persist
    let analysisId: string | null = null;
    if (userId) {
      const { data: row } = await admin
        .from("catalog_analyses")
        .insert({
          user_id: userId,
          sale_name: saleMetadata.saleName || "Unnamed Sale",
          sale_date: saleMetadata.saleDate || null,
          sale_location: saleMetadata.saleLocation || null,
          breed_type: breedType,
          foaling_year: saleMetadata.foalingYear || null,
          currency: saleMetadata.currency || "USD",
          extraction,
          research,
          scored_lots: scored,
          analysis_sections,
          shortlist,
        })
        .select("id")
        .maybeSingle();
      analysisId = row?.id ?? null;
    }

    return new Response(
      JSON.stringify({
        analysisId,
        scored_lots: scored,
        analysis_sections,
        shortlist,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});