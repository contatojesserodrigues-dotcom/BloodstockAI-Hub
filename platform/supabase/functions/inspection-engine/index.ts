// ============================================================
// inspection-engine — Equine Intelligence Inspection Engine™
// Orchestrates scoring, biomechanics, report payload persistence
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeBiomechanics } from "../_shared/inspection-ai/biomechanics.ts";
import { buildReportPayload } from "../_shared/inspection-ai/report_engine.ts";
import { buildIntelligenceScores } from "../_shared/inspection-ai/scoring_engine.ts";
import type { PoseFrameInput } from "../_shared/inspection-ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { analysis_id, block_id, frames, fps, persist_frames } = body as {
      analysis_id: string;
      block_id?: string;
      frames?: PoseFrameInput[];
      fps?: number;
      persist_frames?: boolean;
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

    const { data: blocks } = await admin
      .from("inspection_blocks")
      .select("*")
      .eq("analysis_id", analysis_id)
      .order("created_at", { ascending: true });

    let poseFrames: PoseFrameInput[] = frames || [];

    // Load persisted frames if not provided
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
      biomech = analyzeBiomechanics(poseFrames, { fps: fps || 6 });

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
          bpi: biomech.bpi,
          stride_analysis: biomech.stride_analysis,
          spi_score: biomech.spi_score,
          energy_economy_index: biomech.energy_economy_index,
          joint_breakdown: biomech.joint_breakdown,
          asymmetry_pct: biomech.asymmetry_pct,
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

    const intelligence = buildIntelligenceScores({
      category: analysis.horse_category,
      blocks: blocks || [],
      pedigreeResearch: analysis.pedigree_research,
      biomechanics: biomech ? {
        bpi: biomech.bpi,
        stride_efficiency: biomech.stride_efficiency,
        motion_symmetry: biomech.motion_symmetry_score,
        joint_efficiency: biomech.joint_efficiency_score,
        power_generation: biomech.power_generation_score,
        energy_economy: biomech.energy_economy_index,
        spi_score: biomech.spi_score,
        asymmetry_pct: biomech.asymmetry_pct,
      } : undefined,
      hoofScore: typeof analysis.hoof_health_score === "number" ? analysis.hoof_health_score : undefined,
      behaviourScore: typeof analysis.behaviour_score === "number" ? analysis.behaviour_score : undefined,
      marketDemand: analysis.market_estimate?.demand_score,
    });

    const reportSections = buildReportPayload({
      analysis,
      blocks: blocks || [],
      intelligence,
      biomechanics: biomech?.metrics_json,
      pedigreeResearch: analysis.pedigree_research,
    });

    const patch = {
      engine_version: "equine_intelligence_v2",
      processing_status: "complete",
      elite_potential_score: intelligence.horse_intelligence_score,
      pedigree_intelligence_score: intelligence.pedigree_intelligence,
      biomechanics_score: intelligence.bpi,
      conformation_score: intelligence.components.conformation,
      behaviour_score: intelligence.behaviour,
      hoof_health_score: intelligence.hoof_health,
      g1_potential_index: intelligence.g1_potential,
      distance_profile: intelligence.distance_indices,
      soundness_risk: intelligence.soundness_risk,
      intelligence_scores: intelligence,
      roi_projection: intelligence.roi,
      market_estimate: { longevity_score: intelligence.longevity.score },
      consolidated_score: intelligence.horse_intelligence_score,
    };

    await admin.from("inspection_analyses").update(patch).eq("id", analysis_id);

    await admin.from("inspection_reports").insert({
      analysis_id,
      user_id: user.id,
      report_type: "full",
      report_json: reportSections,
    });

    console.log(`[inspection-engine] analysis=${analysis_id} HIS=${intelligence.horse_intelligence_score} BPI=${intelligence.bpi}`);

    return new Response(JSON.stringify({
      success: true,
      intelligence,
      biomechanics: biomech,
      report: reportSections,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[inspection-engine]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
