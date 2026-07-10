// ============================================================
// inspection-engine — Feature Extraction (CV / pose → raw metrics)
// Scoring is delegated to inspection-scoring → Python Scientific Engine.
// NO scoring formulas in this function.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeBiomechanics } from "../_shared/inspection-ai/biomechanics.ts";
import type { PoseFrameInput } from "../_shared/inspection-ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCORING_ENGINE_URL = (Deno.env.get("SCIENTIFIC_SCORING_ENGINE_URL") ?? "").replace(/\/$/, "");
const SCORING_API_KEY = Deno.env.get("SCORING_API_KEY") ?? "";

async function triggerScientificScoring(
  inspectionId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!SCORING_ENGINE_URL) {
    console.warn("[inspection-engine] SCIENTIFIC_SCORING_ENGINE_URL not set — skipping score");
    return null;
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_API_KEY) headers["X-API-Key"] = SCORING_API_KEY;

  const res = await fetch(`${SCORING_ENGINE_URL}/api/v1/inspection/score`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspection_id: inspectionId, user_id: userId, persist: true }),
  });
  if (!res.ok) {
    console.error("[inspection-engine] scoring failed", await res.text());
    return null;
  }
  return await res.json() as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = await req.json();
    const { analysis_id, block_id, frames, fps, persist_frames, distance_meters } = body as {
      analysis_id: string;
      block_id?: string;
      frames?: PoseFrameInput[];
      fps?: number;
      persist_frames?: boolean;
      distance_meters?: number;
    };

    if (!analysis_id) {
      return new Response(JSON.stringify({ error: "analysis_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: analysis, error: aErr } = await admin
      .from("inspection_analyses")
      .select("*")
      .eq("id", analysis_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (aErr || !analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    let poseFrames: PoseFrameInput[] = frames || [];

    if (!poseFrames.length && block_id) {
      const { data: dbFrames } = await admin
        .from("inspection_frames")
        .select("*")
        .eq("block_id", block_id)
        .order("frame_index", { ascending: true });
      poseFrames = (dbFrames || []).map((f: any) => ({
        index: f.frame_index,
        timestampMs: f.timestamp_ms,
        keypoints: f.keypoints,
        angles: f.angles,
        stridePhase: f.stride_phase,
        confidence: f.confidence,
      }));
    }

    let biomech = null as ReturnType<typeof analyzeBiomechanics> | null;
    if (poseFrames.length) {
      biomech = analyzeBiomechanics(poseFrames, {
        fps: fps || 6,
        distanceMeters: distance_meters,
      });

      await admin.from("inspection_biomechanical_metrics").insert({
        analysis_id,
        block_id: block_id || null,
        stride_length_estimate: biomech.stride_analysis.stride_length_m,
        stride_frequency: biomech.stride_frequency,
        stride_consistency: biomech.stride_consistency,
        stride_efficiency: biomech.stride_efficiency,
        limb_symmetry_score: biomech.motion_symmetry_score,
        joint_efficiency_score: biomech.joint_efficiency_score,
        suspension_phase: biomech.suspension_phase,
        metrics_json: {
          ...biomech.metrics_json,
          stride_analysis: biomech.stride_analysis,
          joint_breakdown: biomech.joint_breakdown,
          asymmetry_pct: biomech.asymmetry_pct,
          left_stride_m: biomech.stride_length_estimate,
          right_stride_m: biomech.stride_length_estimate,
          engine: "feature_extraction_v1",
        },
      });

      if (persist_frames && block_id && frames?.length) {
        const rows = frames.map((f, i) => ({
          analysis_id,
          block_id,
          frame_index: f.index ?? i,
          timestamp_ms: f.timestampMs ?? Math.round((i / (fps || 6)) * 1000),
          keypoints: f.keypoints,
          angles: f.angles,
          stride_phase: f.stridePhase,
          confidence: f.confidence,
        }));
        await admin.from("inspection_frames").insert(rows);
      }
    }

    await admin.from("inspection_analyses").update({
      processing_status: "processing",
      engine_version: "feature_extraction_v1",
    }).eq("id", analysis_id);

    const scoring = await triggerScientificScoring(analysis_id, user.id);

    return new Response(JSON.stringify({
      success: true,
      feature_extraction: biomech,
      scoring,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[inspection-engine]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
