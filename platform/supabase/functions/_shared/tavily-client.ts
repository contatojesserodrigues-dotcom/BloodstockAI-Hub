// Shared Tavily search helpers — used by all analysis edge functions.
// Tavily collects live web data; Claude Sonnet 4.5 reasons over the results.

import { tavily } from "npm:@tavily/core";

export const TAVILY_APPROVED_DOMAINS = [
  "racingpost.com", "racingpost.ie",
  "equibase.com", "racing.com", "racingaustralia.horse",
  "racenet.com.au", "punters.com.au", "racingnsw.com.au", "studbook.org.au",
  "attheraces.com", "sportinglife.com", "timeform.com", "racingtv.com",
  "irishracing.com", "hri.ie",
  "jra.go.jp", "france-galop.com", "geny.com", "paris-turf.com", "france-sire.com",
  "breednet.com.au",
  "pedigreequery.com", "allbreedpedigree.com", "tbheritage.com",
  "trc-global-rankings.com", "thoroughbreddailynews.com", "bloodhorse.com",
  "keeneland.com", "tattersalls.com", "fasigtipton.com", "magicmillions.com.au", "arqana.com",
  "jockeyclubbrasileiro.com.br",
];

export type TavilySearchResult = {
  query: string;
  answer: string | null;
  sources: Array<{ url: string; title: string; snippet: string }>;
};

function getApiKey(): string {
  const key = Deno.env.get("TAVILY_API_KEY");
  if (!key) throw new Error("TAVILY_API_KEY is not configured");
  return key;
}

export function getTavilyClient() {
  return tavily({ apiKey: getApiKey() });
}

export async function tavilySearch(
  query: string,
  label: string,
  options?: { maxResults?: number; includeDomains?: boolean; openWebFallback?: boolean },
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  const maxResults = options?.maxResults ?? 5;
  const useDomains = options?.includeDomains !== false;

  console.log(`[${label}] Tavily search: ${query.slice(0, 120)}...`);

  let res: any;
  try {
    res = await client.search(query, {
      searchDepth: "advanced",
      maxResults,
      includeAnswer: true,
      ...(useDomains ? { includeDomains: TAVILY_APPROVED_DOMAINS } : {}),
    });
  } catch (e) {
    console.warn(`[${label}] Tavily search failed:`, e instanceof Error ? e.message : e);
    return { query, answer: null, sources: [] };
  }

  const hasResults = res?.answer || (Array.isArray(res?.results) && res.results.length > 0);
  if (!hasResults && options?.openWebFallback !== false && useDomains) {
    try {
      res = await client.search(query, {
        searchDepth: "advanced",
        maxResults,
        includeAnswer: true,
      });
    } catch {
      /* keep empty */
    }
  }

  const sources = (res?.results || []).slice(0, maxResults).map((r: any) => ({
    url: r?.url || "",
    title: r?.title || "",
    snippet: typeof r?.content === "string" ? r.content.slice(0, 800) : "",
  }));

  console.log(`[${label}] Tavily: ${sources.length} sources, answer=${!!res?.answer}`);

  return {
    query,
    answer: res?.answer || null,
    sources,
  };
}

export async function tavilySearchParallel(
  queries: Array<{ query: string; label: string }>,
): Promise<TavilySearchResult[]> {
  return Promise.all(queries.map(({ query, label }) => tavilySearch(query, label)));
}

export function formatTavilyContext(results: TavilySearchResult[]): string {
  if (!results.length) return "(no research data available)";

  return results.map((r, i) => {
    const sourceLines = r.sources
      .map((s) => `- ${s.title || s.url}: ${s.snippet}`)
      .join("\n");
    return `═══ RESEARCH BLOCK ${i + 1} ═══
Query: ${r.query}
Summary: ${r.answer || "(no summary)"}
Sources:
${sourceLines || "(none)"}`;
  }).join("\n\n");
}

export function citationsFromTavily(results: TavilySearchResult[]): string[] {
  const urls = results.flatMap((r) => r.sources.map((s) => s.url).filter(Boolean));
  return [...new Set(urls)];
}
