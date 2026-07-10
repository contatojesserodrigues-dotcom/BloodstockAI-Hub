// ============================================================
// video-pose-frames
// Orchestrates per-frame pose detection on an array of video frames.
// Delegates ALL computer-vision work to the existing detect-horse-pose
// function (Claude Vision) — no formulas, prompts, or models changed.
// Returns per-frame keypoints + derived joint angles for client rendering.
// ============================================================
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Pt = { x: number; y: number };

function ang(a?: Pt, b?: Pt, c?: Pt): number | null {
  if (!a || !b || !c) return null;
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
  if (!m1 || !m2) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

function deriveAngles(k: any) {
  return {
    shoulder: ang(k?.withers, k?.shoulder, k?.elbow),
    elbow: ang(k?.shoulder, k?.elbow, k?.foreKnee),
    knee: ang(k?.elbow, k?.foreKnee, k?.foreFetlock),
    fetlockFront: ang(k?.foreKnee, k?.foreFetlock, k?.foreHoof),
    hip: ang(k?.croup, k?.hip, k?.stifle),
    stifle: ang(k?.hip, k?.stifle, k?.hock),
    hock: ang(k?.stifle, k?.hock, k?.hindFetlock),
    fetlockHind: ang(k?.hock, k?.hindFetlock, k?.hindHoof),
    back: ang(k?.withers, k?.back, k?.croup),
    neck: ang(k?.poll, k?.withers, k?.back),
  };
}

function stridePhase(k: any): string {
  if (!k?.foreHoof || !k?.hindHoof) return "—";
  const dy = Math.abs(k.foreHoof.y - k.hindHoof.y);
  if (dy < 0.04) return "Support";
  if (k.foreHoof.y < k.hindHoof.y - 0.05) return "Forelimb extension";
  return "Hindlimb drive";
}

async function callDetect(frameDataUrl: string, auth: string): Promise<any> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/detect-horse-pose`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": ANON_KEY,
        "authorization": auth || `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ frameDataUrl }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("detect call failed", e);
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { frames, fps } = await req.json();
    if (!Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "frames[] required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const capped = frames.slice(0, 16) as string[];
    const effectiveFps = typeof fps === "number" && fps > 0 ? fps : 6;

    const poses = await mapWithConcurrency(capped, 3, (f) => callDetect(f, auth));

    const out = capped.map((dataUrl, i) => {
      const p = poses[i];
      const keypoints = p?.keypoints ?? null;
      return {
        index: i,
        timestampMs: Math.round((i / effectiveFps) * 1000),
        dataUrl,
        visible: !!p?.visible,
        facing: p?.facing ?? "unknown",
        confidence: typeof p?.confidence === "number" ? p.confidence : 0,
        keypoints,
        angles: deriveAngles(keypoints),
        stridePhase: stridePhase(keypoints),
      };
    });

    return new Response(JSON.stringify({ frames: out }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("video-pose-frames error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});