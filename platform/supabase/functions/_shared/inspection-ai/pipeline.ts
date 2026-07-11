/** Inspection pipeline orchestration — progress + Python API triggers (no scoring formulas). */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SCORING_URL = (Deno.env.get("SCIENTIFIC_SCORING_ENGINE_URL") ?? "").replace(/\/$/, "");
const SCORING_KEY = Deno.env.get("SCORING_API_KEY") ?? "";

export async function updateProcessingStep(
  admin: SupabaseClient,
  analysisId: string,
  module: string,
  status: "pending" | "running" | "complete" | "failed",
  progress?: number,
  detail?: Record<string, unknown>,
) {
  const step = {
    module,
    status,
    updated_at: new Date().toISOString(),
    ...detail,
  };
  const patch: Record<string, unknown> = {
    processing_step: step,
    processing_status: status === "failed" ? "failed" : status === "complete" ? "complete" : "processing",
  };
  if (typeof progress === "number") patch.processing_progress = Math.max(0, Math.min(100, progress));
  await admin.from("inspection_analyses").update(patch).eq("id", analysisId);
}

export async function triggerScientificScoring(
  inspectionId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!SCORING_URL) {
    console.warn("[pipeline] SCIENTIFIC_SCORING_ENGINE_URL not configured");
    return null;
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_KEY) headers["X-API-Key"] = SCORING_KEY;

  const res = await fetch(`${SCORING_URL}/api/v1/inspection/score`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspection_id: inspectionId, user_id: userId, persist: true }),
  });
  if (!res.ok) {
    console.error("[pipeline] scoring failed", await res.text());
    return null;
  }
  return await res.json();
}

export async function triggerMarketEstimate(
  inspectionId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!SCORING_URL) return null;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_KEY) headers["X-API-Key"] = SCORING_KEY;

  const res = await fetch(`${SCORING_URL}/api/v1/inspection/market/estimate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspection_id: inspectionId, user_id: userId, persist: true }),
  });
  if (!res.ok) {
    console.error("[pipeline] market estimate failed", await res.text());
    return null;
  }
  return await res.json();
}

export async function triggerPedigreeIntelligence(
  inspectionId: string,
  userId: string,
  research: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  if (!SCORING_URL) return null;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SCORING_KEY) headers["X-API-Key"] = SCORING_KEY;

  const res = await fetch(`${SCORING_URL}/api/v1/inspection/pedigree/intelligence`, {
    method: "POST",
    headers,
    body: JSON.stringify({ inspection_id: inspectionId, user_id: userId, research, persist: true }),
  });
  if (!res.ok) {
    console.error("[pipeline] pedigree intelligence failed", await res.text());
    return null;
  }
  return await res.json();
}

export async function mergeIntelligenceBundle(
  admin: SupabaseClient,
  analysisId: string,
  partial: Record<string, unknown>,
) {
  const { data } = await admin.from("inspection_analyses").select("intelligence_bundle").eq("id", analysisId).maybeSingle();
  const current = (data?.intelligence_bundle as Record<string, unknown>) || {};
  const merged = { ...current, ...partial, updated_at: new Date().toISOString() };
  await admin.from("inspection_analyses").update({ intelligence_bundle: merged }).eq("id", analysisId);
  return merged;
}
