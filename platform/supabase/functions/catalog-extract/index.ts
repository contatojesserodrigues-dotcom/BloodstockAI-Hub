import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the BloodstockAI Catalogue Extraction Agent. Your only job is to read auction catalogue text and extract every lot into clean structured JSON. Do not analyze, score, or interpret anything in this stage.

For each lot extract EXACTLY what is printed on the page:
- lot_number (string or integer)
- sire (exact name)
- dam (exact name)
- sex (colt/filly/gelding/mare/horse — preserve as printed)
- foaling_month (if stated; else null)
- black_type_counts: { g1: int, g2: int, g3: int, listed: int } — count mentions in the immediate page/pedigree as printed, never infer or estimate
- black_type_sibling: true/false — only true if explicitly indicated on the page
- group_listed_dam: true/false — only true if the dam herself is stated as Group/Listed placed or winner
- ebf_nominated: true/false if stated
- consignor (if shown, else null)

CRITICAL: If a field is not present or unclear on the page, output null (or 0 for counts) — never guess or infer. Never invent black-type counts, sire names, or consignor names.

Return strict JSON only, exactly in this shape — no commentary, no markdown:
{ "lots": [ { ...lot... }, ... ] }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

    const { chunkText, pageRange, chunkIndex, totalChunks } = await req.json();
    if (!chunkText) {
      return new Response(JSON.stringify({ error: "missing chunkText" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = String(chunkText).slice(0, 14000);
    const userMsg = `Catalogue pages ${pageRange} (chunk ${chunkIndex}/${totalChunks}):\n\n${text}\n\nExtract all lots as strict JSON.`;

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
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      const status = resp.status === 429 || resp.status === 529 ? 429 : 500;
      return new Response(JSON.stringify({ error: errText, lots: [] }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = data.content?.[0]?.text || "";
    let parsed: any = { lots: [] };
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch (_) { /* keep empty */ }

    return new Response(JSON.stringify({ lots: parsed.lots || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), lots: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});