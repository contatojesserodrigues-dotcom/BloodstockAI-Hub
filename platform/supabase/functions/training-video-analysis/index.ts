import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are BloodstockAI's equine training biomechanics engine. Analyse training-track gallop frames (turf, dirt, woodchip, uphill, synthetic, sand).

You estimate biomechanical and locomotion metrics from the provided frames using anatomical reasoning. You are NOT a veterinarian — frame all soundness comments as "possible indicator", "biomechanical observation", "training-related pattern" and recommend veterinary review only when persistent.

Return ONLY a single JSON object with this shape (numbers in numeric fields, omit unknowns as null):
{
  "metrics": {
    "speed_mps": number|null,
    "stride_length_m": number|null,
    "stride_frequency_hz": number|null,
    "cadence_spm": number|null,
    "stride_duration_s": number|null,
    "ground_contact_ms": number|null,
    "suspension_ms": number|null,
    "flight_phase_ms": number|null,
    "peak_extension_deg": number|null,
    "front_reach_m": number|null,
    "hind_propulsion": number|null,
    "rear_drive": number|null,
    "shoulder_angle_deg": number|null,
    "hip_angle_deg": number|null,
    "knee_flexion_deg": number|null,
    "hock_flexion_deg": number|null,
    "stride_opening_m": number|null,
    "body_extension_pct": number|null,
    "vertical_oscillation_cm": number|null,
    "head_stability": number|null,
    "neck_stability": number|null,
    "pelvic_rotation_deg": number|null,
    "limb_symmetry_pct": number|null,
    "left_right_imbalance_pct": number|null,
    "mechanical_efficiency": number|null,
    "movement_fluidity": number|null,
    "gallop_efficiency": number|null,
    "fatigue_indicator": number|null,
    "soundness_indicator": number|null
  },
  "scores": {
    "training_performance": number,
    "race_readiness": number,
    "soundness_index": number,
    "mechanical_efficiency": number,
    "recovery": number,
    "fatigue_risk": number,
    "consistency": number,
    "development_curve": "Improving"|"Stable"|"Declining"|"Needs Attention"
  },
  "ai_narrative": string,
  "recommendations": string[],
  "confidence": "low"|"medium"|"high"
}`;

async function callClaudeVision(apiKey: string, frames: string[], userContext: string) {
  const content: any[] = frames.slice(0, 8).map((dataUrl) => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    return {
      type: "image",
      source: { type: "base64", media_type: m?.[1] ?? "image/jpeg", data: m?.[2] ?? dataUrl },
    };
  });
  content.push({ type: "text", text: userContext });

  const models = ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022"];
  let lastErr = "";
  for (const model of models) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 110000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 3500,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });
      clearTimeout(to);
      if (!res.ok) {
        lastErr = `${res.status} ${await res.text()}`;
        if (res.status === 401 || res.status === 402) break;
        continue;
      }
      const json = await res.json();
      const text = json?.content?.[0]?.text ?? "";
      return text as string;
    } catch (e) {
      lastErr = String(e);
    }
  }
  throw new Error(`Claude vision failed: ${lastErr}`);
}

function parseJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no_json");
  return JSON.parse(m[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

    const body = await req.json();
    const { session_id, frames, context } = body as {
      session_id: string;
      frames: string[];
      context?: { exercise_type?: string; surface?: string; distance_m?: number; notes?: string; horse_name?: string };
    };
    if (!session_id || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "Missing session_id or frames" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI provider not configured" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

    const userPrompt = `Horse: ${context?.horse_name ?? "Unknown"}
Exercise: ${context?.exercise_type ?? "Gallop"}
Surface: ${context?.surface ?? "Unknown"}
Distance: ${context?.distance_m ?? "Unknown"} m
Trainer notes: ${context?.notes ?? "None"}

Analyse the ${frames.length} attached side-on gallop frames and return the JSON exactly per schema. Scores 0-100. Be cautious and non-diagnostic.`;

    let parsed: any;
    let source = "claude";
    try {
      const raw = await callClaudeVision(apiKey, frames, userPrompt);
      parsed = parseJson(raw);
    } catch (e) {
      console.warn("[training-video-analysis] AI failed, using fallback", e);
      source = "fallback";
      parsed = {
        metrics: {},
        scores: { training_performance: 65, race_readiness: 60, soundness_index: 70, mechanical_efficiency: 65, recovery: 65, fatigue_risk: 35, consistency: 65, development_curve: "Stable" },
        ai_narrative: "AI provider unavailable. Heuristic baseline scores returned. Re-run when service is back to obtain frame-by-frame biomechanical measurements.",
        recommendations: ["Re-run analysis when AI vision is available", "Continue normal training programme"],
        confidence: "low",
      };
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: inserted, error } = await admin.from("training_video_analyses").insert({
      user_id: user.id,
      session_id,
      metrics: parsed.metrics ?? {},
      scores: parsed.scores ?? {},
      ai_narrative: parsed.ai_narrative ?? "",
      recommendations: parsed.recommendations ?? [],
      source,
    }).select().single();
    if (error) throw error;

    await admin.from("training_sessions").update({ status: "analysed" }).eq("id", session_id);

    return new Response(JSON.stringify({ analysis: inserted }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[training-video-analysis]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});