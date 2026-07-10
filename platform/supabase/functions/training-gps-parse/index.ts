import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_MAP: Record<string, string> = {
  "max speed": "max_speed",
  "maximum speed": "max_speed",
  "vmax": "max_speed",
  "avg speed": "avg_speed",
  "average speed": "avg_speed",
  "distance": "distance_m",
  "acceleration": "acceleration",
  "split": "splits",
  "heart rate": "hr_avg",
  "max heart rate": "hr_max",
  "average heart rate": "hr_avg",
  "recovery": "recovery_time_s",
  "recovery heart rate": "hr_recovery",
  "training load": "training_load",
  "work intensity": "work_intensity",
  "elevation": "elevation",
  "stride frequency": "stride_frequency_hz",
  "stride length": "stride_length_m",
};

function normalise(num: string): number | string {
  const n = parseFloat(num.replace(",", "."));
  return Number.isFinite(n) ? n : num;
}

function parseTextReport(text: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z][A-Za-z\s\/]+?)\s*[:=,\t]\s*([-\d.,]+)/);
    if (m) {
      const key = m[1].toLowerCase().trim();
      const mapped = FIELD_MAP[key] ?? key.replace(/\s+/g, "_");
      out[mapped] = normalise(m[2]);
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

    const { session_id, provider, content, filename } = await req.json() as { session_id: string; provider?: string; content: string; filename?: string };
    if (!session_id || !content) return new Response(JSON.stringify({ error: "Missing session_id or content" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

    const metrics = parseTextReport(content);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.from("training_gps_reports").insert({
      user_id: user.id, session_id, provider: provider ?? "Generic", metrics, raw_filename: filename ?? null,
    }).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ report: data }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[training-gps-parse]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});