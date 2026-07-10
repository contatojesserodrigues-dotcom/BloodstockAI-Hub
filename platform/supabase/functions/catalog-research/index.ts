import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function tavilySearch(query: string, apiKey: string) {
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!resp.ok) return { answer: null, results: [] };
  return await resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY missing");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { sires = [], dams = [], saleName, previousYear } = await req.json();

    const uniqueSires = Array.from(new Set((sires as string[]).filter(Boolean))).slice(0, 25);
    const uniqueDams = Array.from(new Set((dams as string[]).filter(Boolean))).slice(0, 15);

    const currentYear = new Date().getFullYear();

    async function cachedFetch(key: string, query: string) {
      const { data } = await admin
        .from("catalog_research_cache")
        .select("payload, fetched_at")
        .eq("cache_key", key)
        .maybeSingle();
      if (data && Date.now() - new Date(data.fetched_at).getTime() < CACHE_TTL_MS) {
        return data.payload;
      }
      const result = await tavilySearch(query, TAVILY_API_KEY!);
      await admin.from("catalog_research_cache").upsert({
        cache_key: key, payload: result, fetched_at: new Date().toISOString(),
      });
      return result;
    }

    const siresOut: Record<string, any> = {};
    for (const s of uniqueSires) {
      const q1 = `${s} stallion sire stats progeny stakes winners ${currentYear}`;
      const q2 = `${s} fee stud farm location`;
      const [a, b] = await Promise.all([
        cachedFetch(`sire:${s}:stats:${currentYear}`, q1),
        cachedFetch(`sire:${s}:fee`, q2),
      ]);
      siresOut[s] = {
        stats_summary: a?.answer ?? null,
        fee_summary: b?.answer ?? null,
        sources: [...(a?.results ?? []), ...(b?.results ?? [])]
          .map((r: any) => r.url).filter(Boolean).slice(0, 6),
      };
    }

    const damsOut: Record<string, any> = {};
    for (const d of uniqueDams) {
      const q = `${d} thoroughbred produce black type winners`;
      const r = await cachedFetch(`dam:${d}`, q);
      damsOut[d] = {
        summary: r?.answer ?? null,
        sources: (r?.results ?? []).map((x: any) => x.url).filter(Boolean).slice(0, 4),
      };
    }

    let market: any = null;
    if (saleName && previousYear) {
      const m1 = await cachedFetch(
        `mkt:${saleName}:${previousYear}`,
        `${saleName} ${previousYear} results average median top lot`
      );
      const m2 = await cachedFetch(
        `mkt:${saleName}:${previousYear}:rp`,
        `${saleName} ${previousYear} sales results Racing Post`
      );
      market = {
        summary: [m1?.answer, m2?.answer].filter(Boolean).join("\n\n") || null,
        sources: [...(m1?.results ?? []), ...(m2?.results ?? [])]
          .map((r: any) => r.url).filter(Boolean).slice(0, 6),
      };
    }

    return new Response(
      JSON.stringify({ sires: siresOut, dams: damsOut, market }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});