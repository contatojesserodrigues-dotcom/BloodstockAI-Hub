// ============================================================
// inspection-scoring — Scientific Scoring Engine HTTP wrapper
// Proxies to Python FastAPI when SCIENTIFIC_SCORING_ENGINE_URL is set;
// otherwise uses TypeScript adapter (formula parity via shared constants).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildScientificReport } from "../_shared/inspection-ai/scientific_scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCORING_ENGINE_URL = Deno.env.get("SCIENTIFIC_SCORING_ENGINE_URL") ?? "";
const SCORING_API_KEY = Deno.env.get("SCORING_API_KEY") ?? "";

async function scoreViaPython(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const base = SCORING_ENGINE_URL.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_API_KEY) headers["X-API-Key"] = SCORING_API_KEY;

  const res = await fetch(`${base}/v1/score`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python scoring engine error ${res.status}: ${text}`);
  }

  return await res.json() as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const payload = await req.json() as Record<string, unknown>;
    const usePython = SCORING_ENGINE_URL.length > 0;

    let report: Record<string, unknown>;
    let source: string;

    if (usePython) {
      report = await scoreViaPython(payload);
      source = "python";
    } else {
      report = buildScientificReport(payload);
      source = "typescript";
    }

    // Optional persistence when analysis_id provided
    const analysisId = payload.analysis_id as string | undefined;
    if (analysisId) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin
        .from("inspection_analyses")
        .update({
          intelligence_scores: report,
          consolidated_score: report.overall_score,
          elite_potential_score: report.elite_potential,
          biomechanics_score: (report.bpi as { score?: number })?.score ?? report.overall_score,
          processing_status: "complete",
          engine_version: `scientific_scoring_${source}`,
        })
        .eq("id", analysisId)
        .eq("user_id", user.id);
    }

    console.log(`[inspection-scoring] user=${user.id} source=${source} overall=${report.overall_score}`);

    return new Response(JSON.stringify({
      success: true,
      source,
      report,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[inspection-scoring]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
