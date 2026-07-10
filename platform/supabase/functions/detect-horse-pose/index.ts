// ============================================================
// detect-horse-pose
// Uses Claude Sonnet Vision to locate anatomical keypoints on a
// broadside horse photo. Returns coordinates normalized 0..1.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const KEYPOINT_NAMES = [
  "poll", "withers", "back", "loin", "croup",
  "shoulder", "elbow", "foreKnee", "foreFetlock", "foreHoof",
  "hip", "stifle", "hock", "hindCannon", "hindFetlock", "hindHoof",
  "muzzle", "chest", "belly",
] as const;

const SYSTEM_PROMPT = `You are an elite equine biomechanics vision system trained on thousands of thoroughbreds at gallop. You receive ONE still frame of a thoroughbred, broadside (lateral) view, in mid-gallop / breeze-up.

YOUR ONE PRIORITY: every coordinate you return MUST sit on the actual pixels of the horse's body in THIS frame. The points are used to draw a skeleton overlay directly onto the photo — if a dot lands off the horse, the report is unusable.

═══ STEP 1 — LOCATE THE HORSE FIRST ═══
Before placing any keypoint, MENTALLY locate the horse silhouette:
- Find the bounding box of the horse (top-left corner to bottom-right corner of its body).
- Identify which side faces the camera (left or right). The muzzle points one way, the tail points the other.
- Identify the four legs. Determine which front leg and which hind leg are CLOSEST to the camera (the visible/near side).

EVERY keypoint you place MUST be INSIDE this bounding box (with the only exception being a hoof that is reaching forward or back — but it must still be on the leg pixels).

═══ STEP 2 — PLACE LANDMARKS ON ACTUAL PIXELS ═══
For each landmark below, look at THIS image and place the dot on the EXACT pixel where that anatomical feature is. NEVER use a generic horse template. NEVER guess "roughly where it should be". If you cannot see it clearly, OMIT it.

ANATOMICAL DEFINITIONS:
- poll: top of the head, just behind the ears.
- muzzle: tip of the nose.
- withers: highest point of the back, directly above the front legs (where neck meets back).
- back: midpoint of the topline between withers and loin.
- loin: lower back, just in front of the croup.
- croup: highest point of the hindquarters above the hip.
- shoulder: point of shoulder — front of chest where neck base meets front leg.
- elbow: joint where the upper foreleg meets the chest, BEHIND the girth.
- foreKnee: carpus (knee) of the visible foreleg.
- foreFetlock: fetlock (ankle) of the visible foreleg.
- foreHoof: ground contact tip of the visible front hoof.
- hip: point of hip (tuber coxae) — bony bump on the haunch.
- stifle: stifle joint of the visible hind leg (equine "knee", in front of the flank).
- hock: hock joint of the visible hind leg (the "ankle" pointing backwards).
- hindCannon: midpoint of the cannon bone of the visible hind leg.
- hindFetlock: fetlock of the visible hind leg.
- hindHoof: ground contact tip of the visible hind hoof.
- chest: lowest front point of the chest between front legs.
- belly: lowest point of the underline.

═══ STEP 3 — TOPOLOGICAL SANITY (mandatory before output) ═══
Verify each of these BEFORE you return. If any fails, re-place the offending point:
1. withers, back, loin, croup all lie on the TOPLINE — they form a roughly horizontal line across the top of the body.
2. withers.y < shoulder.y < elbow.y < foreKnee.y < foreFetlock.y < foreHoof.y  (front leg drops downward).
3. croup.y < hip.y < stifle.y < hock.y < hindFetlock.y < hindHoof.y  (hind leg drops downward).
4. shoulder is on the FRONT of the chest, near the front leg root, NOT mid-belly.
5. hip is on the HAUNCH, near the hind leg root, NOT mid-back.
6. foreHoof and hindHoof are on or just above the GROUND (the lowest pixels of the legs).
7. The withers→hip span (body length) is between 18% and 55% of the image width — the horse occupies that much of the frame.
8. Every keypoint coordinate is between 0.02 and 0.98 (not at the very edge).

═══ STEP 4 — CALIBRATION ═══
Look for the running rail (white/wooden vertical posts along the track). If two or more posts are clearly visible at roughly the same depth as the horse, return their base x-coordinates (normalized) in railPostsX. UK/IE standard spacing = 3.0 m centre-to-centre. If no usable posts, leave empty.

Optionally also return horseHeightWithers: a {x,y} point directly under the withers AT GROUND LEVEL (the y value where the visible front hoof contacts the ground, x same as withers). This is used for height-based calibration when no posts exist.

═══ OUTPUT RULES ═══
- Coordinates: floats between 0 and 1, 4 decimal places, top-left origin.
- Set "visible": false ONLY if no horse is recognizable. Otherwise true.
- "facing": "left" if muzzle.x < croup.x, "right" if muzzle.x > croup.x.
- "confidence": HONEST self-assessment after Step 3 verification. 0.9+ for a clean lateral shot where every step-3 check passed; 0.7 for minor occlusion; below 0.6 if any topological check is shaky — and in that case OMIT the points you are unsure about rather than guessing.
- Output ONLY via the report_keypoints tool. No prose. No explanation.`;

const TOOL = {
  name: "report_keypoints",
  description: "Report normalized anatomical keypoints for the horse in the frame.",
  input_schema: {
    type: "object",
    properties: {
      visible: { type: "boolean", description: "true if a horse is clearly visible" },
      facing: { type: "string", enum: ["left", "right", "unknown"] },
      confidence: { type: "number", description: "0..1 self-assessed accuracy" },
      railPostsX: {
        type: "array",
        description: "Normalized x-coords (0..1) of the BASE of clearly visible rail posts at horse depth. UK/IE standard spacing = 3.0m. Empty array if none usable.",
        items: { type: "number" },
      },
      horseHeightWithers: {
        type: "object",
        description: "Normalized {x,y} of a point directly under the withers at ground level (hoof height). Used to compute pixel height for Method-B calibration. Omit if not deducible.",
        properties: { x: { type: "number" }, y: { type: "number" } },
      },
      keypoints: {
        type: "object",
        description: "Each value is { x: 0..1, y: 0..1 }. Omit landmarks you cannot locate.",
        properties: Object.fromEntries(
          KEYPOINT_NAMES.map((n) => [
            n,
            {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              required: ["x", "y"],
            },
          ])
        ),
      },
    },
    required: ["visible", "facing", "confidence", "keypoints"],
  },
};

function dataUrlToParts(dataUrl: string): { media_type: string; data: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid data URL");
  return { media_type: m[1], data: m[2] };
}

// ─── server-side topology guard ──────────────────────────────────────
// Returns null when the pose passes; returns a string error when it fails so
// we can re-prompt the model with the specific issue to fix.
function topologyError(p: any): string | null {
  if (!p?.visible || !p?.keypoints) return "no horse detected";
  const k = p.keypoints || {};
  const need = ["withers", "shoulder", "hip", "croup", "foreHoof", "hindHoof"];
  for (const n of need) {
    const pt = k[n];
    if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") return `missing ${n}`;
    if (pt.x < 0 || pt.x > 1 || pt.y < 0 || pt.y > 1) return `${n} out of frame`;
  }
  // topline above the legs
  if (k.withers.y >= k.foreHoof.y - 0.05) return "withers must be well above foreHoof";
  if (k.croup.y >= k.hindHoof.y - 0.05) return "croup must be well above hindHoof";
  if (k.withers.y > k.shoulder.y + 0.02) return "withers must be above shoulder";
  if (k.croup.y > k.hip.y + 0.02) return "croup must be above hip";
  // body span sanity — accept distant horses (small in frame) too
  const bodySpan = Math.abs(k.shoulder.x - k.hip.x);
  if (bodySpan < 0.04) return "horse appears too small in frame (shoulder-hip < 4% width)";
  if (bodySpan > 0.75) return "horse appears too large (shoulder-hip > 75% width)";
  // topline level
  if (Math.abs(k.withers.y - k.croup.y) > 0.20) return "withers and croup not on the same topline";
  // chained leg verticals
  const fAsc = [k.shoulder?.y, k.elbow?.y, k.foreKnee?.y, k.foreFetlock?.y, k.foreHoof?.y]
    .filter((v: any) => typeof v === "number") as number[];
  for (let i = 1; i < fAsc.length; i++) {
    if (fAsc[i] < fAsc[i - 1] - 0.02) return "front leg joints not descending toward hoof";
  }
  const hAsc = [k.hip?.y, k.stifle?.y, k.hock?.y, k.hindFetlock?.y, k.hindHoof?.y]
    .filter((v: any) => typeof v === "number") as number[];
  for (let i = 1; i < hAsc.length; i++) {
    if (hAsc[i] < hAsc[i - 1] - 0.02) return "hind leg joints not descending toward hoof";
  }
  return null;
}

async function callClaudeVision(
  model: string,
  media_type: string,
  data: string,
  userText: string,
) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "report_keypoints" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data } },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    console.error(`Anthropic ${model} error`, resp.status, errTxt);
    return null;
  }
  const json = await resp.json();
  const toolUse = (json.content || []).find((c: any) => c.type === "tool_use");
  return toolUse?.input ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { frameDataUrl } = await req.json();
    if (!frameDataUrl || typeof frameDataUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "frameDataUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { media_type, data } = dataUrlToParts(frameDataUrl);

    // ── Pass 1: Sonnet 4.5 does an initial detection (real, frame-grounded) ──
    let pose = await callClaudeVision(
      "claude-sonnet-4-5-20250929",
      media_type,
      data,
      "Locate every visible anatomical keypoint on the horse in THIS specific frame. Place each dot on the EXACT pixel of that body part — no defaults, no templated coordinates. If a joint is occluded, OMIT it rather than guess. Run the Step-3 topological checks before reporting via the tool. Return REAL measurements derived from this image only.",
    );

    let topErr = topologyError(pose);

    // ── Pass 2: if topology fails, re-ask Opus with the specific error ──
    if (topErr) {
      console.warn("pass1 topology failed:", topErr);
      const refineMsg =
        "Your previous keypoint placement failed this anatomical check: \"" + topErr + "\". " +
        "Re-locate the horse silhouette in the image, then re-place EVERY keypoint so it sits on the actual horse pixels and passes ALL Step-3 checks. " +
        "If a joint is genuinely occluded, OMIT it rather than guess. Output via the report_keypoints tool only.";
      const pose2 = await callClaudeVision("claude-sonnet-4-5-20250929", media_type, data, refineMsg);
      const top2 = topologyError(pose2);
      if (!top2) {
        pose = pose2;
        topErr = null;
      } else if (pose2 && (pose2.confidence ?? 0) > (pose?.confidence ?? 0)) {
        // accept the higher-confidence version even if still imperfect
        pose = pose2;
        topErr = top2;
      }
    }

    if (!pose) {
      return new Response(
        JSON.stringify({ visible: false, facing: "unknown", confidence: 0, keypoints: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Surface topology issues so the client can decide whether to render
    if (topErr) {
      pose._topologyWarning = topErr;
      // Penalise confidence so client validation rejects bad poses
      pose.confidence = Math.min(pose.confidence ?? 0, 0.55);
    }

    return new Response(JSON.stringify(pose), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-horse-pose error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});