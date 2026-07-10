import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `You are an elite Thoroughbred trainer and equine exercise physiologist with the combined knowledge and judgment of Aidan O'Brien, Bob Baffert, Willie Mullins, John Gosden and Chad Brown. You think like a championship-builder whose goal is to convert any horse into a G1-calibre elite athlete.

You receive structured data for a single horse: profile, recent training sessions (date, exercise type, distance, surface, weather, ground, trainer/vet notes, body temperature, body weight, resting heart rate) and the latest AI biomechanics scores.

Produce a private, expert briefing for the trainer using the lens of the world's best yards. Never name those trainers in your output. Be confident, specific, actionable, and grounded in equine exercise physiology and modern racing programmes. Avoid generic platitudes.

Return STRICT JSON only, no markdown, no commentary:
{
  "physiological_read": "2-4 sentences on what current vitals + biomechanics + workload pattern actually mean physiologically (aerobic base, recovery state, glycogen, soft-tissue load, thermoregulation).",
  "training_strategy": ["5-8 highly specific gallop/interval/recovery prescriptions tailored to this horse's data — include distances, intensities, surfaces and weekly placement"],
  "nutrition_plan": {
    "focus": "one-line nutritional thesis for this horse right now",
    "daily_feed": ["6-10 concrete feed/forage/supplement actions with rough quantities or %s — energy source mix, protein, electrolytes, omega-3, gut buffers, hydration"],
    "pre_work": ["pre-work fueling/hydration actions"],
    "post_work": ["post-work recovery feeding actions"]
  },
  "vitals_watchlist": ["3-5 specific things to monitor in the next 7-14 days (temperature ranges, weight drift, HR recovery, gait asymmetry, etc.) with thresholds"],
  "red_flags": ["any concerning signals from the data — leave empty array if none"],
  "g1_pathway": "2-3 sentences framing where this horse sits on the path to G1 condition and the next concrete step."
}`;

async function callClaude(apiKey: string, userPayload: string): Promise<string> {
  const models = ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-sonnet-20241022"];
  let lastErr = "";
  for (const model of models) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: 2200, temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPayload }],
      }),
    });
    if (r.ok) {
      const j = await r.json();
      return j.content?.[0]?.text ?? "";
    }
    lastErr = `${r.status} ${await r.text()}`;
    if (r.status === 402) break;
  }
  throw new Error(`Claude unavailable: ${lastErr}`);
}

function parseJson(t: string): any {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in AI response");
  return JSON.parse(m[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { horse_id } = await req.json();
    if (!horse_id) return new Response(JSON.stringify({ error: "horse_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: horse } = await supa.from("training_horses").select("*").eq("id", horse_id).eq("user_id", user.id).maybeSingle();
    if (!horse) return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: sessions } = await supa.from("training_sessions").select("*").eq("horse_id", horse_id).order("session_date", { ascending: false }).limit(15);
    const sessionIds = (sessions ?? []).map((s: any) => s.id);
    const { data: analyses } = sessionIds.length
      ? await supa.from("training_video_analyses").select("session_id, scores, metrics, created_at").in("session_id", sessionIds).order("created_at", { ascending: false }).limit(10)
      : { data: [] as any[] };

    const payload = {
      horse: { name: horse.name, age: horse.age, sex: horse.sex, breed: horse.breed, sire: horse.sire, dam: horse.dam, racing_code: horse.racing_code, status: horse.status, trainer: horse.trainer, training_centre: horse.training_centre, notes: horse.notes },
      recent_sessions: (sessions ?? []).map((s: any) => ({
        date: s.session_date, exercise: s.exercise_type, distance_m: s.distance_m, surface: s.surface,
        weather: s.weather, ground: s.ground_condition, rider: s.rider,
        temperature_c: s.temperature_c, body_weight_kg: s.body_weight_kg, resting_heart_rate: s.resting_heart_rate,
        trainer_notes: s.trainer_notes, vet_notes: s.vet_notes,
      })),
      recent_analyses: (analyses ?? []).map((a: any) => ({ date: a.created_at, scores: a.scores })),
    };

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY missing");

    const raw = await callClaude(key, `HORSE & TRAINING DATA:\n${JSON.stringify(payload, null, 2)}\n\nReturn the JSON briefing now.`);
    const insight = parseJson(raw);

    return new Response(JSON.stringify({ insight, generated_at: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});