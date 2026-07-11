import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") || "";

const CATEGORY_LABEL: Record<string, string> = {
  FOAL: "Foal (0–12 months)",
  YEARLING: "Yearling (12–24 months, pre-sale)",
  FLAT_IN_TRAINING: "Flat horse in training",
  NH_STORE_YOUNG: "National Hunt — store/young (unraced)",
  NH_IN_TRAINING: "National Hunt — in training",
  BROODMARE_STALLION: "Broodmare / Stallion",
};

const PEDIGREE_TOOL = {
  name: "extract_pedigree",
  description: "Extract structured pedigree facts from the provided PDF.",
  input_schema: {
    type: "object",
    properties: {
      horse_name: { type: ["string", "null"] },
      year_of_birth: { type: ["string", "null"] },
      sex: { type: ["string", "null"] },
      sire: { type: ["string", "null"] },
      dam: { type: ["string", "null"] },
      dam_sire: { type: ["string", "null"] },
      breeder: { type: ["string", "null"] },
      vendor: { type: ["string", "null"] },
      consignor: { type: ["string", "null"] },
      lot_number: { type: ["string", "null"] },
      sale: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      covering_sire: { type: ["string", "null"] },
      covering_year: { type: ["string", "null"] },
      damline_highlights: { type: "array", items: { type: "string" } },
      black_type_relatives: { type: "array", items: { type: "string" } },
      black_type_references: { type: "array", items: { type: "string" }, description: "Named black-type horses referenced in the document." },
      sire_profile: { type: ["string", "null"], description: "What the sire transmits: distance, surface, precocity, durability." },
      damline_profile: { type: ["string", "null"], description: "What the damline transmits: class, soundness, distance bias." },
      inbreeding_notes: { type: ["string", "null"] },
      commercial_notes: { type: ["string", "null"] },
    },
    required: ["sire", "dam"],
  },
};

const INSIGHT_TOOL = {
  name: "report_pedigree_cross_insight",
  description: "Return the comprehensive cross-analysis between pedigree and visual conformation/biomechanics inspection.",
  input_schema: {
    type: "object",
    properties: {
      executive_summary: { type: "string", description: "3–5 sentence executive summary tying pedigree expectation to what was observed in the inspection." },
      pedigree_expectation: {
        type: "object",
        properties: {
          optimal_distance: { type: "string" },
          surface_preference: { type: "string" },
          precocity: { type: "string", description: "Early 2yo / classic 3yo / late developer / NH staying" },
          temperament_indication: { type: "string" },
          soundness_indication: { type: "string" },
        },
        required: ["optimal_distance","surface_preference","precocity","temperament_indication","soundness_indication"],
      },
      conformation_vs_pedigree: { type: "string", description: "Detailed paragraph: does the visible conformation/biomechanics match what this sire×damline typically produces? Flag mismatches." },
      sire_influence_observed: { type: "string", description: "Which observed traits look inherited from the sire side." },
      damline_influence_observed: { type: "string", description: "Which observed traits look inherited from the damline." },
      performance_projection: { type: "string", description: "Realistic performance ceiling and floor given pedigree + observed athletic structure." },
      risk_flags: { type: "array", items: { type: "string" }, description: "Specific risks where pedigree predisposition overlaps with an observed conformational concern." },
      training_recommendations: { type: "array", items: { type: "string" } },
      commercial_assessment: { type: "string", description: "How market is likely to value this combination (pedigree page + physical)." },
      verdict: { type: "string", description: "One-line verdict: e.g. 'Strong commercial yearling with classic 3yo profile; monitor LF pastern.'" },
      confidence: { type: "string", enum: ["low", "moderate", "high"] },
    },
    required: [
      "executive_summary","pedigree_expectation","conformation_vs_pedigree",
      "sire_influence_observed","damline_influence_observed","performance_projection",
      "risk_flags","training_recommendations","commercial_assessment","verdict","confidence"
    ],
  },
};

async function tavilyResearch(query: string): Promise<string> {
  if (!TAVILY_API_KEY) return "";
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    const lines: string[] = [];
    if (j.answer) lines.push(`Summary: ${j.answer}`);
    for (const res of (j.results || []).slice(0, 5)) {
      lines.push(`- ${res.title}: ${(res.content || "").slice(0, 280)}`);
    }
    return lines.join("\n");
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { analysis_id, pedigree_pdf_base64, pedigree_pdf_name } = await req.json();
    if (!analysis_id || !pedigree_pdf_base64) {
      return new Response(JSON.stringify({ error: "analysis_id and pedigree_pdf_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: analysis, error: aErr } = await admin
      .from("inspection_analyses").select("*").eq("id", analysis_id).eq("user_id", user.id).maybeSingle();
    if (aErr || !analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: blocks } = await admin.from("inspection_blocks").select("*").eq("analysis_id", analysis_id).order("created_at", { ascending: true });

    // Persist PDF to storage
    let pedigreeUrl: string | null = null;
    try {
      const m = /^data:([^;]+);base64,(.+)$/.exec(pedigree_pdf_base64);
      const b64 = m ? m[2] : pedigree_pdf_base64;
      const mime = m ? m[1] : "application/pdf";
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const path = `${analysis_id}/pedigree-${Date.now()}.pdf`;
      const up = await admin.storage.from("inspection-biomechanics").upload(path, bytes, { contentType: mime, upsert: true });
      if (!up.error) {
        const signed = await admin.storage.from("inspection-biomechanics").createSignedUrl(path, 60 * 60 * 24 * 365);
        pedigreeUrl = signed.data?.signedUrl || null;
      }
    } catch (e) { console.error("pdf upload failed", e); }

    const cleanB64 = pedigree_pdf_base64.replace(/^data:[^;]+;base64,/, "");

    // STEP 1 — Extract pedigree structure with Claude
    const extractResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2500,
        temperature: 0.1,
        system: "You are a bloodstock pedigree analyst. Extract only what is visible in the provided pedigree document. Never invent names or black-type results. Call extract_pedigree.",
        tools: [PEDIGREE_TOOL],
        tool_choice: { type: "tool", name: "extract_pedigree" },
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: cleanB64 } },
            { type: "text", text: `Extract the pedigree facts for this horse. Horse from platform: ${analysis.horse_name}.` },
          ],
        }],
      }),
    });
    if (!extractResp.ok) {
      const t = await extractResp.text();
      return new Response(JSON.stringify({ error: `Pedigree extraction failed (${extractResp.status})`, details: t.slice(0,300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const extractJson = await extractResp.json();
    const pedigree = (extractJson?.content || []).find((b: any) => b?.type === "tool_use")?.input || {};

    // STEP 2 — Research sire & damline performance
    const researchParts: string[] = [];
    if (pedigree.sire) {
      const r = await tavilyResearch(`${pedigree.sire} stallion profile progeny performance distance surface precocity`);
      if (r) researchParts.push(`SIRE RESEARCH (${pedigree.sire}):\n${r}`);
    }
    if (pedigree.dam_sire) {
      const r = await tavilyResearch(`${pedigree.dam_sire} broodmare sire influence progeny`);
      if (r) researchParts.push(`DAMSIRE RESEARCH (${pedigree.dam_sire}):\n${r}`);
    }
    if (pedigree.dam) {
      const r = await tavilyResearch(`${pedigree.dam} broodmare produce record black type`);
      if (r) researchParts.push(`DAM RESEARCH (${pedigree.dam}):\n${r}`);
    }
    const research = researchParts.join("\n\n").slice(0, 8000);

    // STEP 3 — Build inspection summary
    const inspectionSummary = (blocks || []).map((b: any, i: number) => {
      const measures = Array.isArray(b.measurements_json)
        ? b.measurements_json.map((m: any) => `${m.label}: ${m.value} (${m.classification})`).join("; ")
        : "";
      const attn = Array.isArray(b.attention_points) ? b.attention_points.join("; ") : "";
      return `Block #${i+1} — ${b.media_purpose} — Score ${b.block_score ?? "—"}/100
Measurements: ${measures || "—"}
Attention points: ${attn || "—"}
Observations: ${(b.observations || "").slice(0, 600)}`;
    }).join("\n\n").slice(0, 9000);

    // STEP 4 — Cross-analysis with Claude
    const insightResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4500,
        temperature: 0.3,
        system: `You are the BloodstockAI Senior Bloodstock Analyst. Cross-reference the pedigree facts, public research about the sire/damline, and the visual conformation/biomechanics inspection blocks already recorded for this horse. Produce a comprehensive, professional insight that a buyer, agent or trainer can use to make a commercial decision.

RULES:
- Use ONLY the facts provided (pedigree, research excerpts, inspection blocks). Never invent races, prices, or veterinary diagnoses.
- Be specific: tie observed conformation traits to pedigree influences when supported.
- Where pedigree expects a profile (e.g. precocious 2yo) but the physique does not match (e.g. light-framed, immature), flag it explicitly.
- Where a pedigree predisposition (e.g. fragile pasterns from sire line) overlaps with an observed concern, raise a risk_flag.
- Confidence "high" only if both pedigree and inspection are well-documented; otherwise "moderate" or "low".
- Call the report_pedigree_cross_insight tool.`,
        tools: [INSIGHT_TOOL],
        tool_choice: { type: "tool", name: "report_pedigree_cross_insight" },
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: `HORSE: ${analysis.horse_name}
CATEGORY: ${CATEGORY_LABEL[analysis.horse_category] || analysis.horse_category}
SALE CONTEXT: ${analysis.sale_context || "—"}
CONSOLIDATED INSPECTION SCORE: ${analysis.consolidated_score ?? "—"}/100

=== EXTRACTED PEDIGREE ===
${JSON.stringify(pedigree, null, 2)}

=== INSPECTION BLOCKS (${(blocks||[]).length}) ===
${inspectionSummary || "(no inspection blocks yet — base the analysis on pedigree only and lower confidence accordingly)"}

=== PUBLIC RESEARCH ===
${research || "(no public research available — base assessment on pedigree facts only)"}

Now call report_pedigree_cross_insight with the full cross-analysis.`,
          }],
        }],
      }),
    });
    if (!insightResp.ok) {
      const t = await insightResp.text();
      return new Response(JSON.stringify({ error: `Insight generation failed (${insightResp.status})`, details: t.slice(0,300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const insightJson = await insightResp.json();
    const insight = (insightJson?.content || []).find((b: any) => b?.type === "tool_use")?.input;
    if (!insight) {
      return new Response(JSON.stringify({ error: "No structured insight returned" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const insightText = [
      `EXECUTIVE SUMMARY\n${insight.executive_summary}`,
      `\nVERDICT\n${insight.verdict}  (confidence: ${insight.confidence})`,
      `\nPEDIGREE EXPECTATION\n• Optimal distance: ${insight.pedigree_expectation.optimal_distance}\n• Surface: ${insight.pedigree_expectation.surface_preference}\n• Precocity: ${insight.pedigree_expectation.precocity}\n• Temperament: ${insight.pedigree_expectation.temperament_indication}\n• Soundness: ${insight.pedigree_expectation.soundness_indication}`,
      `\nCONFORMATION vs PEDIGREE\n${insight.conformation_vs_pedigree}`,
      `\nSIRE INFLUENCE OBSERVED\n${insight.sire_influence_observed}`,
      `\nDAMLINE INFLUENCE OBSERVED\n${insight.damline_influence_observed}`,
      `\nPERFORMANCE PROJECTION\n${insight.performance_projection}`,
      `\nRISK FLAGS\n${(insight.risk_flags||[]).map((r:string)=>`• ${r}`).join("\n") || "• None identified"}`,
      `\nTRAINING RECOMMENDATIONS\n${(insight.training_recommendations||[]).map((r:string)=>`• ${r}`).join("\n")}`,
      `\nCOMMERCIAL ASSESSMENT\n${insight.commercial_assessment}`,
    ].join("\n");

    await admin.from("inspection_analyses").update({
      pedigree_pdf_url: pedigreeUrl,
      pedigree_pdf_name: pedigree_pdf_name || "pedigree.pdf",
      pedigree_insight: insightText,
      pedigree_summary: { pedigree, insight },
      pedigree_generated_at: new Date().toISOString(),
      pedigree_meta: {
        horse_name: pedigree.horse_name || analysis.horse_name,
        sire: pedigree.sire,
        dam: pedigree.dam,
        damsire: pedigree.dam_sire,
        sex: pedigree.sex,
        year_of_birth: pedigree.year_of_birth,
        breeder: pedigree.breeder,
        vendor: pedigree.vendor,
        consignor: pedigree.consignor,
        lot_number: pedigree.lot_number || analysis.lot_ref,
        sale: pedigree.sale || analysis.sale_context,
        country: pedigree.country || analysis.country,
        covering_sire: pedigree.covering_sire,
        covering_year: pedigree.covering_year,
        black_type_references: pedigree.black_type_references || pedigree.black_type_relatives || [],
      },
    }).eq("id", analysis_id);

    // Normalized pedigree row (PASSO 2)
    await admin.from("inspection_pedigree_analysis").upsert({
      analysis_id,
      sire: pedigree.sire,
      dam: pedigree.dam,
      damsire: pedigree.dam_sire,
      black_type_summary: (pedigree.black_type_references || pedigree.black_type_relatives || []).join("; ") || null,
      extraction_json: pedigree,
      analysis_json: insight,
      updated_at: new Date().toISOString(),
    }, { onConflict: "analysis_id" });

    return new Response(JSON.stringify({
      ok: true,
      pedigree,
      insight,
      insight_text: insightText,
      pedigree_pdf_url: pedigreeUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("inspection-pedigree-insight error", e?.stack || e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});