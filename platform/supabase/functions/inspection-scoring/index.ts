// ============================================================
// inspection-scoring — Inspection API gateway (Python SSOT)
// Proxies to FastAPI Scientific Scoring Engine — NO formulas in TypeScript.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCORING_ENGINE_URL = (Deno.env.get("SCIENTIFIC_SCORING_ENGINE_URL") ?? "").replace(/\/$/, "");
const SCORING_API_KEY = Deno.env.get("SCORING_API_KEY") ?? "";

async function scoreViaPython(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!SCORING_ENGINE_URL) {
    throw new Error(
      "SCIENTIFIC_SCORING_ENGINE_URL is not configured. Deploy the Python FastAPI service and set the secret.",
    );
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_API_KEY) headers["X-API-Key"] = SCORING_API_KEY;

  const res = await fetch(`${SCORING_ENGINE_URL}/api/v1/inspection/score`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scientific Scoring Engine error ${res.status}: ${text}`);
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

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = await req.json() as Record<string, unknown>;
    const inspectionId = (body.inspection_id ?? body.analysis_id) as string | undefined;
    if (!inspectionId) {
      return new Response(JSON.stringify({ error: "inspection_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const payload = {
      inspection_id: inspectionId,
      user_id: user.id,
      horse: body.horse ?? {},
      pedigree: body.pedigree ?? {},
      biomechanics: body.biomechanics ?? {},
      conformation: body.conformation ?? {},
      behaviour: body.behaviour ?? {},
      hoof: body.hoof ?? {},
      commercial: body.commercial ?? {},
      metadata: body.metadata ?? {},
      persist: body.persist !== false,
    };

    const result = await scoreViaPython(payload);

    console.log(
      `[inspection-scoring] user=${user.id} inspection=${inspectionId} overall=${result.overall_score}`,
    );

    return new Response(JSON.stringify({
      success: true,
      source: "python",
      ...result,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[inspection-scoring]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
