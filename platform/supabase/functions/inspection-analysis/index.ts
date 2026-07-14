import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const CATEGORY_LABEL: Record<string, string> = {
  FOAL: "Foal (0–12 months)",
  YEARLING: "Yearling (12–24 months, pre-sale)",
  FLAT_IN_TRAINING: "Flat horse in training",
  NH_STORE_YOUNG: "National Hunt — store/young (unraced)",
  NH_IN_TRAINING: "National Hunt — in training",
  BROODMARE_STALLION: "Broodmare / Stallion",
};

const PURPOSE_LABEL: Record<string, string> = {
  STATIC_CONFORMATION: "Static Conformation",
  GAIT_WALK: "Gait — Walk",
  GAIT_TROT: "Gait — Trot",
  HOOF_DETAIL: "Hoof Detail",
  MUSCULATURE: "Musculature & Condition",
  FULL_BODY_VIDEO: "Full Body Video",
};

function buildSystemPrompt(p: {
  horse_category: string;
  media_purpose: string;
  horse_name: string;
  sale_context: string;
}): string {
  return `You are the BloodstockAI Equine Biomechanics & Conformation Analyst, powering the "Horse Sale Inspection Analysis" module — a specialized computer-vision feature trained to evaluate thoroughbred horses for bloodstock purposes (sales inspection support, training assessment, and breeding evaluation). You are NOT a substitute for a veterinary pre-purchase examination — you provide a structured visual conformation/biomechanics opinion only.

CONTEXT FOR THIS ANALYSIS (provided by the platform, do not ignore):
- Horse category: ${p.horse_category}
- Media purpose: ${p.media_purpose}
- Horse name/lot reference: ${p.horse_name || "(not provided)"}
- Sale / context (if any): ${p.sale_context || "(not provided)"}

CRITICAL RULES — ANTI-HALLUCINATION:
1. Only describe what is visibly present in the image(s)/video frame(s) provided. If image quality, angle, or occlusion prevents a confident assessment of any structure, explicitly say so instead of guessing.
2. All angle and proportion values you give are VISUAL ESTIMATES, not clinical measurements. Always phrase them as "estimated approximately X°" and note the margin of uncertainty when relevant.
3. Never invent pedigree, sale price, race record, or veterinary history. Only use information explicitly provided above.
4. Never state a horse "has" a clinical condition (e.g. navicular disease, OCD) — only describe conformational risk factors and recommend veterinary follow-up where relevant.
5. If the media purpose does not match what was actually uploaded, correct this politely in your Observations and analyze what is actually shown.

ANALYSIS DEPTH — adjust based on media_purpose:
- STATIC_CONFORMATION: shoulder angle (~45–50°), front/hind pastern angles, hoof-pastern axis (broken-forward / broken-back / straight), hock angle (~150–155°), knee column alignment, shoulder vs back length ratio, croup angle, body length vs withers height, chest depth vs forelimb length, neck-to-head ratio, bilateral symmetry. Do NOT assess muscle development for FOAL or YEARLING.
- GAIT_WALK: 4-beat rhythm regularity, tracking-up, head-neck bascule symmetry, subtle lameness signs (descriptive only).
- GAIT_TROT: diagonal synchrony, suspension symmetry, flight path (paddling/winging/plaiting), hock/knee flexion, rhythm regularity. For NH categories note jumping scope.
- HOOF_DETAIL: HPA per hoof, mediolateral balance, heel-to-toe ratio, growth ring regularity, symmetry across the 4 hooves provided.
- MUSCULATURE: topline (only for FLAT_IN_TRAINING / NH_IN_TRAINING / BROODMARE_STALLION), hindquarter mass and bilateral symmetry, neck/shoulder symmetry, descriptive body-condition impression.
- FULL_BODY_VIDEO: combine STATIC_CONFORMATION + GAIT_WALK + GAIT_TROT criteria as visible.

SCORE BREAKDOWN (0–100) for the score_breakdown object:
- conformation: structural conformation score (null if not assessable in this upload)
- gait: movement/biomechanics score (null if no movement in this upload)
- hoof: hoof quality score (null if hoofs not clearly assessable)
- musculature: muscle/condition score (null for FOAL/YEARLING or if not assessable)

OVERALL SCALE: 85–100 Excellent / 70–84 Good / 55–69 Acceptable with notable attention points / 40–54 Significant deviations / <40 Major structural concerns.

You MUST call the report_inspection tool with the structured findings. Write all text in English, in a professional bloodstock-industry tone suitable for inclusion in a branded BloodstockAI PDF report.`;
}

const TOOL_SCHEMA = {
  name: "report_inspection",
  description: "Return the structured Horse Sale Inspection Analysis result for this upload.",
  input_schema: {
    type: "object",
    properties: {
      block_score: { type: "integer", minimum: 0, maximum: 100 },
      score_label: { type: "string", description: "Excellent / Good / Acceptable / Significant deviations / Major concerns" },
      score_breakdown: {
        type: "object",
        properties: {
          conformation: { type: ["integer", "null"] },
          gait: { type: ["integer", "null"] },
          hoof: { type: ["integer", "null"] },
          musculature: { type: ["integer", "null"] },
        },
      },
      measurements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            classification: { type: "string", description: "within ideal / mild deviation / notable deviation" },
          },
          required: ["label", "value", "classification"],
        },
      },
      attention_points: { type: "array", items: { type: "string" } },
      observations: { type: "string" },
      bloodstock_insight: { type: "string" },
    },
    required: ["block_score", "score_breakdown", "measurements", "attention_points", "observations", "bloodstock_insight"],
  },
};

function categoryWeights(horseCategory: string) {
  // base weights from spec
  let w = { conformation: 35, gait: 35, hoof: 15, musculature: 15 };
  if (horseCategory === "FOAL" || horseCategory === "YEARLING") {
    w = { conformation: 40, gait: 40, hoof: 20, musculature: 0 };
  }
  return w;
}

function blockEffectiveScore(block: any, horseCategory: string): { score: number; weight: number } | null {
  const breakdown = block.score_breakdown || {};
  const w = categoryWeights(horseCategory);
  let num = 0, den = 0;
  for (const k of ["conformation", "gait", "hoof", "musculature"] as const) {
    const v = breakdown[k];
    if (typeof v === "number" && w[k] > 0) {
      num += v * w[k];
      den += w[k];
    }
  }
  if (den === 0) {
    if (typeof block.block_score === "number") return { score: block.block_score, weight: 1 };
    return null;
  }
  return { score: num / den, weight: den };
}

function recomputeConsolidated(blocks: any[], horseCategory: string): number | null {
  let num = 0, den = 0;
  for (const b of blocks) {
    const r = blockEffectiveScore(b, horseCategory);
    if (!r) continue;
    num += r.score * r.weight;
    den += r.weight;
  }
  if (den === 0) return null;
  return Math.round((num / den) * 10) / 10;
}

// ---------------- Gemini biomechanics image ----------------
// Build a structured prompt that asks Gemini to overlay color-coded dots
// (green = OK, yellow = good/mild, orange = needs attention, red = refer vet/farrier)
// at the principal biomechanical checkpoints of the horse, based on findings.
function buildBiomechPrompt(parsed: any, horseCategory: string): string {
  const overall = parsed?.block_score ?? null;
  const overallColor =
    overall == null ? "green" :
    overall >= 85 ? "green" :
    overall >= 70 ? "yellow" :
    overall >= 55 ? "orange" : "red";

  const attention = Array.isArray(parsed?.attention_points) ? parsed.attention_points.slice(0, 8) : [];
  const measurements = Array.isArray(parsed?.measurements) ? parsed.measurements.slice(0, 10) : [];

  const findings = [
    ...measurements.map((m: any) => `- ${m.label}: ${m.value} (${m.classification})`),
    ...attention.map((a: string) => `- ATTENTION: ${a}`),
  ].join("\n");

  return `You are a veterinary biomechanics illustrator. Take the provided horse photograph and render a PROFESSIONAL biomechanics inspection overlay on top of it, in the exact visual style of a clinical x-ray/skeleton diagram with glowing colored marker dots placed on the main anatomical checkpoints.

VISUAL STYLE (MANDATORY):
- Keep the same horse from the input photo, side-profile.
- Apply a subtle dark/x-ray treatment so the skeleton appears semi-transparent over the horse silhouette.
- Place GLOWING ROUND DOTS (with soft halo) on each of these checkpoints, sized ~1.5% of image width:
  poll, withers, shoulder joint, elbow, knee (carpus), front fetlock, front hoof, stifle, hock, hind fetlock, hind hoof, lumbar spine, sacroiliac.
- Color each dot using this legend (USE EXACTLY THESE COLORS):
  GREEN  (#22c55e) = Excellent, optimal movement & alignment
  YELLOW (#eab308) = Good, minor asymmetry or compensation
  ORANGE (#f97316) = Needs Attention — moderate imbalance or stress
  RED    (#ef4444) = Poor — refer to veterinarian or farrier
- Add a clean horizontal legend bar across the bottom of the image showing the 4 colors with their labels (Excellent / Good / Needs Attention / Poor).
- No extra text labels on the body — only the colored dots.

COLOR ASSIGNMENT — base each dot's color on the findings below. Checkpoints not explicitly mentioned should default to ${overallColor.toUpperCase()} (matching the overall block score of ${overall ?? "n/a"}/100). Map any finding that mentions: "navicular / lameness / high risk / poor / major" -> RED on the related joint; "stress / imbalance / notable deviation / asymmetry" -> ORANGE; "mild / minor / slight" -> YELLOW; "ideal / within range / excellent" -> GREEN.

HORSE CATEGORY: ${horseCategory}

FINDINGS TO REFLECT:
${findings || "(no specific findings — render all dots GREEN)"}

Output: a single high-quality landscape image with the overlay + legend. Do NOT add watermarks or extra captions.`;
}

async function generateBiomechanicsImage(firstImage: string, parsed: any, horseCategory: string): Promise<{ dataUrl: string } | null> {
  if (!LOVABLE_API_KEY) { console.warn("LOVABLE_API_KEY missing — skipping biomechanics image"); return null; }
  const prompt = buildBiomechPrompt(parsed, horseCategory);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: firstImage } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      console.error("Gemini image error", resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const json = await resp.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) { console.warn("Gemini returned no image"); return null; }
    return { dataUrl: `data:image/png;base64,${b64}` };
  } catch (e) {
    console.error("generateBiomechanicsImage failed", e);
    return null;
  }
}

async function uploadBiomechImage(admin: any, analysisId: string, dataUrl: string): Promise<string | null> {
  try {
    const m = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i.exec(dataUrl);
    if (!m) return null;
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    const path = `${analysisId}/${crypto.randomUUID()}.png`;
    const up = await admin.storage.from("inspection-biomechanics").upload(path, bytes, {
      contentType: "image/png", upsert: false,
    });
    if (up.error) { console.error("upload error", up.error); return null; }
    const signed = await admin.storage.from("inspection-biomechanics").createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed.data?.signedUrl || null;
  } catch (e) {
    console.error("uploadBiomechImage failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const {
      analysis_id,
      horse_name,
      lot_ref,
      sale_context,
      horse_category,
      media_purpose,
      images, // string[] data URLs (jpeg/png base64)
      file_urls = [], // optional persisted URLs for reference
    } = body || {};

    if (!horse_category || !media_purpose || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Missing horse_category, media_purpose, or images" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve / create analysis
    let analysisRow: any = null;
    if (analysis_id) {
      const { data } = await admin.from("inspection_analyses").select("*").eq("id", analysis_id).eq("user_id", user.id).maybeSingle();
      analysisRow = data;
    }
    if (!analysisRow) {
      const { data, error } = await admin.from("inspection_analyses").insert({
        user_id: user.id,
        horse_name: horse_name || "Untitled Horse",
        lot_ref: lot_ref || null,
        sale_context: sale_context || null,
        horse_category,
      }).select().single();
      if (error) throw error;
      analysisRow = data;
    }

    // Build Claude content blocks
    const contentBlocks: any[] = [];
    contentBlocks.push({
      type: "text",
      text: `Horse category: ${CATEGORY_LABEL[horse_category] || horse_category}\nMedia purpose: ${PURPOSE_LABEL[media_purpose] || media_purpose}\nHorse: ${horse_name || analysisRow.horse_name}\nLot: ${lot_ref || analysisRow.lot_ref || "—"}\nSale context: ${sale_context || analysisRow.sale_context || "—"}\n\nAnalyze the ${images.length} image(s)/frame(s) below and call the report_inspection tool with your findings.`,
    });
    for (const img of images.slice(0, 8)) {
      const m = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i.exec(img);
      if (!m) continue;
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: m[1], data: m[2] },
      });
    }

    const systemPrompt = buildSystemPrompt({
      horse_category,
      media_purpose,
      horse_name: horse_name || analysisRow.horse_name,
      sale_context: sale_context || analysisRow.sale_context || "",
    });

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 110_000);
    let parsed: any = null;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 3500,
          temperature: 0.25,
          system: systemPrompt,
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "tool", name: "report_inspection" },
          messages: [{ role: "user", content: contentBlocks }],
        }),
        signal: abort.signal,
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error", resp.status, errText.slice(0, 500));
        return new Response(JSON.stringify({ error: `AI provider error (${resp.status})`, details: errText.slice(0, 300) }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const json = await resp.json();
      const toolBlock = (json?.content || []).find((b: any) => b?.type === "tool_use" && b?.name === "report_inspection");
      parsed = toolBlock?.input;
      if (!parsed) {
        return new Response(JSON.stringify({ error: "AI returned no structured tool result" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } finally {
      clearTimeout(timeout);
    }

    // Persist block
    // Generate biomechanics overlay image (best-effort, non-blocking on failure)
    let biomechUrl: string | null = null;
    try {
      const firstImage = images.find((i: string) => typeof i === "string" && i.startsWith("data:image/"));
      if (firstImage) {
        const gen = await generateBiomechanicsImage(firstImage, parsed, horse_category);
        if (gen) biomechUrl = await uploadBiomechImage(admin, analysisRow.id, gen.dataUrl);
      }
    } catch (e) { console.error("biomech step failed", e); }

    const { data: blockRow, error: blockErr } = await admin.from("inspection_blocks").insert({
      analysis_id: analysisRow.id,
      media_purpose,
      file_urls,
      block_score: parsed.block_score ?? null,
      score_breakdown: parsed.score_breakdown ?? null,
      measurements_json: parsed.measurements ?? null,
      attention_points: Array.isArray(parsed.attention_points) ? parsed.attention_points : [],
      observations: parsed.observations ?? null,
      bloodstock_insight: parsed.bloodstock_insight ?? null,
      biomechanics_image_url: biomechUrl,
      biomechanics_legend: {
        excellent: "#22c55e",
        good: "#eab308",
        needs_attention: "#f97316",
        poor: "#ef4444",
      },
    }).select().single();
    if (blockErr) throw blockErr;

    // Recompute consolidated score across all blocks
    const { data: allBlocks } = await admin.from("inspection_blocks").select("*").eq("analysis_id", analysisRow.id);
    const consolidated = recomputeConsolidated(allBlocks || [], analysisRow.horse_category);
    await admin.from("inspection_analyses").update({ consolidated_score: consolidated }).eq("id", analysisRow.id);

    return new Response(JSON.stringify({
      analysis_id: analysisRow.id,
      consolidated_score: consolidated,
      block: blockRow,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("inspection-analysis error", e?.stack || e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
