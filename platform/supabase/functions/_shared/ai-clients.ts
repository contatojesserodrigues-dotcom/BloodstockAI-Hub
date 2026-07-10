// Shared AI client helpers for Perplexity (data fetching) and Claude (analysis)
// With retry logic, robust error handling, and approved open-access data sources

// ═══ APPROVED DATA SOURCES — OPEN ACCESS ONLY ═══
// No paywall, login, or subscription sites allowed
export const APPROVED_SOURCES = [
  // Performance & Form
  "racingpost.com",
  "equibase.com",
  "racing.com.au",
  "jra.go.jp",
  // Pedigree
  "pedigreequery.com",
  "allbreedpedigree.com",
  "tbheritage.com",
  // Rankings Globais
  "trc-global-rankings.com",
  // Leilões & Mercado
  "keeneland.com",
  "tattersalls.com",
  "fasigtipton.com",
  "magicmillions.com.au",
  "arqana.com",
  // Notícias & Stallion Stats
  "thoroughbreddailynews.com",
  "bloodhorse.com",
  // Brasil
  "jockeyclubbrasileiro.com.br",
  // Japão
  "jra.go.jp/datafile",
  // Austrália
  "racingaustralia.horse",
];

// Tiered organization for search routing
export const SITE_TIERS = {
  pedigree: {
    tier1: [
      "pedigreequery.com",
      "allbreedpedigree.com",
      "tbheritage.com",
      "jockeyclubbrasileiro.com.br",
    ],
    tier2: [
      "racingpost.com",
      "racingaustralia.horse",
    ],
  },
  performance: {
    tier1: [
      "racingpost.com",
      "equibase.com",
      "racing.com.au",
      "jra.go.jp",
    ],
    tier2: [
      "trc-global-rankings.com",
      "jockeyclubbrasileiro.com.br",
      "racingaustralia.horse",
    ],
  },
  auctions: [
    "keeneland.com",
    "tattersalls.com",
    "fasigtipton.com",
    "magicmillions.com.au",
    "arqana.com",
  ],
  marketInsights: {
    tier1: [
      "bloodhorse.com",
      "thoroughbreddailynews.com",
      "trc-global-rankings.com",
    ],
  },
  breeding: {
    tier1: [
      "pedigreequery.com",
      "racingpost.com",
      "tbheritage.com",
    ],
    tier2: [
      "bloodhorse.com",
      "thoroughbreddailynews.com",
      "jockeyclubbrasileiro.com.br",
    ],
  },
};

// Legacy SOURCES export for backward compatibility
export const SOURCES = {
  AUCTIONS: SITE_TIERS.auctions,
  PERFORMANCE: [...SITE_TIERS.performance.tier1, ...SITE_TIERS.performance.tier2],
  PEDIGREE: [...SITE_TIERS.pedigree.tier1, ...SITE_TIERS.pedigree.tier2],
  NEWS: [...SITE_TIERS.marketInsights.tier1],
  STALLIONS: ["trc-global-rankings.com", "thoroughbreddailynews.com"],
  RULES: ["racingpost.com"],
};

// Combine all approved sources for broad queries
export const ALL_SOURCES = [...new Set(APPROVED_SOURCES)];

// ═══ TIERED SEARCH HELPER ═══
export async function searchWithTiers(
  apiKey: string,
  query: string,
  tiers: { tier1: string[]; tier2?: string[] },
  label: string,
  options?: { minConfidenceForTier1?: number }
): Promise<{ content: string; citations: string[]; tier: number }> {
  try {
    const result = await searchPerplexity(apiKey, query, tiers.tier1.slice(0, 15), `${label}_T1`);
      if (result.content && result.content.length > 100) {
      return { ...result, tier: 1 };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[${label}] Tier 1 failed, falling back to Tier 2...`, msg);
    if (/PERPLEXITY_(?:QUOTA_EXCEEDED|AUTH_FAILED|RATE_LIMITED)|authentication failed \(401\)/i.test(msg)) {
      return { content: msg, citations: [], tier: 0 };
    }
  }

  if (tiers.tier2 && tiers.tier2.length > 0) {
    try {
      const result = await searchPerplexity(apiKey, query, tiers.tier2.slice(0, 15), `${label}_T2`);
      return { ...result, tier: 2 };
    } catch (e) {
      console.warn(`[${label}] Tier 2 also failed`, e instanceof Error ? e.message : e);
    }
  }

  return { content: "Data unavailable", citations: [], tier: 0 };
}

// ═══ PRECISE QUERY BUILDERS ═══
export function buildPrecisePedigreeQuery(horseName: string, country?: string, birthYear?: number): string {
  return `Find the COMPLETE and ACCURATE pedigree for this specific thoroughbred horse:
Horse Name: "${horseName}"
${country ? `Country of Registration: ${country}` : ""}
${birthYear ? `Year of Birth: ${birthYear}` : ""}

IMPORTANT: Search ONLY for this exact horse. If multiple horses exist with this name, return the one matching country + birth year.
Return data from official registry or reputable open-access source ONLY.
Return REAL horse names only. Never guess or approximate data.

Include: Sire, Dam, Dam Sire, 4-generation pedigree, inbreeding patterns, dosage if available.
If you cannot find this exact horse with certainty, state "Horse not found with certainty" rather than guessing.`.trim();
}

export function buildPrecisePerformanceQuery(horseName: string, country?: string, birthYear?: number): string {
  return `Find COMPLETE race performance data for this specific thoroughbred:
Horse Name: "${horseName}"
${country ? `Country: ${country}` : ""}
${birthYear ? `Birth Year: ${birthYear}` : ""}

IMPORTANT: Return data for THIS horse only. Verify name + country + year match.
Include: total starts, wins, places, earnings (with currency), best rating,
race class level, best distance, going preference, surface type, last 5 races with details.
If horse not found with certainty, state "Horse not found with certainty".`.trim();
}

const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar-pro";
const PERPLEXITY_MAX_TOKENS = 8000;

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
// Claude Sonnet 4.5 — primary reasoning model (pedigree, catalog, analysis)
export const CLAUDE_MODEL =
  Deno.env.get("ANTHROPIC_PEDIGREE_MODEL") ?? "claude-sonnet-4-5-20250929";
const CLAUDE_MAX_TOKENS = 8000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  maxAttempts = 3,
  timeoutMs = 50000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.warn(`[${label}] Retry ${attempt - 1}/${maxAttempts - 1} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const fetchOptions = { ...options, signal: controller.signal };
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok && attempt < maxAttempts) {
        const errorPreview = await response.clone().text();
        console.warn(`[${label}] HTTP ${response.status}, retrying...`, errorPreview.slice(0, 500));
        
        if (response.status === 401) {
          throw new Error(`${label} API authentication failed (401). Check API key.`);
        }
        if (response.status === 400 && errorPreview.includes("credit balance")) {
          throw new Error("AI analysis temporarily unavailable — Anthropic credits need recharging. Please contact the platform owner.");
        }
        continue;
      }

      return response;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isAbort = lastError.name === "AbortError";
      console.error(`[${label}] Attempt ${attempt}/${maxAttempts} failed:`, isAbort ? `TIMEOUT after ${timeoutMs/1000}s` : lastError.message);
      if (isAbort) {
        lastError = new Error(`${label} API timeout — request took too long`);
      }
      if (attempt >= maxAttempts) break;
    }
  }

  throw lastError || new Error(`[${label}] All retry attempts exhausted`);
}

function getPerplexityErrorToken(status: number, errorText: string): string {
  const normalized = errorText.toLowerCase();
  if (status === 401 && normalized.includes("insufficient_quota")) return "PERPLEXITY_QUOTA_EXCEEDED";
  if (status === 401) return "PERPLEXITY_AUTH_FAILED";
  if (status === 429) return "PERPLEXITY_RATE_LIMITED";
  return `PERPLEXITY_HTTP_${status}`;
}

export async function searchPerplexity(
  apiKey: string,
  query: string,
  domains: string[],
  label: string,
  options?: { useDomainFilter?: boolean }
): Promise<{ content: string; citations: string[] }> {
  console.log(`[${label}] Searching with Perplexity (${domains.length} domains, filter=${options?.useDomainFilter ?? false})...`);

  const domainGuidance = domains.length > 0
    ? `\nPrioritize data from these sources: ${domains.join(", ")}`
    : "";

  const body: Record<string, unknown> = {
    model: PERPLEXITY_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a thoroughbred horse research specialist.
Search the web extensively and return REAL data only.
Never return internal diagnostics as horse data fields.
If data is partial, return what is available and mark missing parts as "Data unavailable".
If data is unavailable, use "Data unavailable."${domainGuidance}`,
      },
      { role: "user", content: query },
    ],
    max_tokens: PERPLEXITY_MAX_TOKENS,
    temperature: 0.1,
    return_citations: true,
    return_images: false,
  };

  if (options?.useDomainFilter && domains.length > 0 && domains.length <= 5) {
    body.search_domain_filter = domains.slice(0, 5);
  }

  const response = await fetchWithRetry(
    PERPLEXITY_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    label,
    3
  );

  if (!response.ok) {
    const errorText = await response.text();
    const token = getPerplexityErrorToken(response.status, errorText);
    console.error(`[${label}] Perplexity error:`, response.status, errorText);
    throw new Error(`${token}: ${errorText}`);
  }

  const data = await response.json();
  const content = (data?.choices?.[0]?.message?.content || "").toString().trim();
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  console.log(`[${label}] Got ${content.length} chars, ${citations.length} citations`);

  if (!content) {
    throw new Error("PERPLEXITY_EMPTY_RESPONSE: Empty content from Perplexity");
  }

  return { content, citations };
}

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number; maxAttempts?: number }
): Promise<string> {
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? CLAUDE_MAX_TOKENS;
  const timeoutMs = options?.timeoutMs ?? 180000; // 180s default for Claude (Sonnet 4.5 deep analysis)
  const maxAttempts = options?.maxAttempts ?? 2;

  const response = await fetchWithRetry(
    CLAUDE_ENDPOINT,
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        stream: true,
      }),
    },
    "CLAUDE",
    maxAttempts,
    timeoutMs
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CLAUDE] API error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (response.status === 401) throw new Error("Invalid Anthropic API key. Please check your configuration.");
    if (response.status === 402 || (response.status === 400 && errorText.includes("credit balance"))) {
      console.error("[CRITICAL] Anthropic API credits exhausted — owner must recharge at console.anthropic.com");
      throw new Error("AI analysis temporarily unavailable. Please try again shortly.");
    }
    throw new Error(`Claude API error: ${response.status}`);
  }

  // Read SSE stream and assemble text deltas. Streaming keeps the TCP connection
  // alive so we never hit "connection closed before message completed" and we
  // surface partial output as it is generated, dramatically reducing perceived latency.
  const reader = response.body?.getReader();
  if (!reader) {
    const fallback = await response.text();
    console.warn("[CLAUDE] No stream body — falling back to text length", fallback.length);
    return fallback;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const streamDeadline = Date.now() + timeoutMs;
  while (true) {
    if (Date.now() > streamDeadline) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error("Claude API timeout — streaming response took too long");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta") {
          content += evt.delta.text || "";
        }
      } catch (_e) {
        // ignore malformed SSE chunks
      }
    }
  }
  console.log(`[CLAUDE] Stream complete: ${content.length} chars`);
  return content;
}

export async function callClaudeWithDocument(
  apiKey: string,
  systemPrompt: string,
  textPrompt: string,
  documentBase64: string,
  mediaType: string,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number }
): Promise<string> {
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? CLAUDE_MAX_TOKENS;
  const timeoutMs = options?.timeoutMs ?? 180000;

  console.log(`[CLAUDE_DOC] Calling Anthropic API with document (${mediaType}, ${Math.round(documentBase64.length / 1024)}KB base64)...`);

  const isImage = mediaType.startsWith("image/");
  const contentBlocks: any[] = [];

  if (isImage) {
    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: documentBase64 },
    });
  } else {
    contentBlocks.push({
      type: "document",
      source: { type: "base64", media_type: mediaType, data: documentBase64 },
    });
  }

  contentBlocks.push({ type: "text", text: textPrompt });

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };

  if (!isImage) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
    console.log("[CLAUDE_DOC] PDF beta header enabled for document processing");
  }

  const response = await fetchWithRetry(
    CLAUDE_ENDPOINT,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: contentBlocks }],
        stream: true,
      }),
    },
    "CLAUDE_DOC",
    2,
    timeoutMs
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CLAUDE_DOC] API error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (response.status === 401) throw new Error("Invalid Anthropic API key.");
    if (response.status === 402 || (response.status === 400 && errorText.includes("credit balance"))) {
      console.error("[CRITICAL] Anthropic API credits exhausted — owner must recharge at console.anthropic.com");
      throw new Error("AI analysis temporarily unavailable. Please try again shortly.");
    }
    throw new Error(`Claude API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const fallback = await response.text();
    console.warn("[CLAUDE_DOC] No stream body — returning raw length", fallback.length);
    return fallback;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const streamDeadline = Date.now() + timeoutMs;
  while (true) {
    if (Date.now() > streamDeadline) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error("Claude document API timeout — streaming response took too long");
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta") {
          content += evt.delta.text || "";
        }
      } catch (_e) {
        // ignore malformed SSE chunks
      }
    }
  }
  console.log(`[CLAUDE_DOC] Stream complete: ${content.length} chars`);
  return content;
}

function detectTruncation(response: string): boolean {
  const text = response.trim();
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;

  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return [/\.\.\.$/, /\u2026$/, /\[truncated\]/i, /\[continued\]/i].some((p) => p.test(text));
}

function repairAndParse(json: string): any {
  let braces = 0;
  let brackets = 0;

  for (const char of json) {
    if (char === "{") braces++;
    if (char === "}") braces--;
    if (char === "[") brackets++;
    if (char === "]") brackets--;
  }

  let repaired = json
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, "");

  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }

  return JSON.parse(repaired);
}

function extractJsonFromMixedResponse(content: string): any {
  try { return JSON.parse(content); } catch { /* continue */ }

  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {
      try { return repairAndParse(codeBlockMatch[1].trim()); } catch { /* continue */ }
    }
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { return repairAndParse(jsonMatch[0]); }
  }

  throw new Error("JSON extraction failed");
}

export function parseJsonFromResponse(text: string, tagName?: string): any {
  if (!text || typeof text !== "string") return null;

  if (tagName) {
    const tagPattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
    const tagMatch = text.match(tagPattern);
    if (tagMatch) {
      try { return extractJsonFromMixedResponse(tagMatch[1].trim()); } catch {
        console.error("Tagged JSON parse failed");
      }
    }
  }

  try { return extractJsonFromMixedResponse(text); } catch {
    if (detectTruncation(text)) console.warn("JSON response appears truncated");
    return null;
  }
}

// ═══ QUALITY CONTROLS ═══
export const QUALITY_CONTROLS = `
DATA QUALITY CONTROLS (MANDATORY):
1. Never fabricate data — if unavailable, state "Data unavailable."
2. Always timestamp every data point with retrieval/publication date.
3. Confidence ratings: Every analytical conclusion must include a confidence % based on data completeness.
4. Cross-validation: Key figures (prices, ratings) must be confirmed by minimum 2 sources.
5. Currency normalization: Always convert to USD equivalent with exchange rate and date noted. Also preserve original currency.
6. If data conflicts between sources, present all versions, note the conflict, and use the most recently dated source as primary.
7. Score 0 is never acceptable — always provide a minimum score of 25 based on available data.
8. Never output internal diagnostics such as "checked:" lists inside horse data fields.

ERROR PREVENTION:
- If a chart cannot be generated due to insufficient data, provide a data table instead and note why.
- If a source is inaccessible, log it and continue with available sources.
- If a horse has no sales history, default to comparable analysis (same sire, sex, similar pedigree).
- If a horse has no race record, rely on pedigree and sales comps analysis.

SCORING STANDARDS:
- G1 winner = 85-95, G2 = 75-85, G3 = 65-75, Listed = 55-65
- Maiden winner = 40-55, Unraced = 30-40
- Include data_confidence: "High" (3+ sources), "Medium" (2 sources), "Low" (1 source)
`;

export const UNNAMED_HORSE_PROMPT = `
UNNAMED HORSE ANALYSIS (Yearlings/Weanlings/Unnamed):
When a horse has no race name or limited individual history, automatically analyze:

SIBLING ANALYSIS:
- Full siblings (same sire + dam): list all with earnings, ratings, race records
- Half siblings (by dam): same dam, different sire, with performance
- Half siblings (by sire): crop averages and standouts

SIRE PROFILE:
- Overall statistics: winners %, stakes winners %, average earnings per runner
- Best performers: top 5 career highlights
- Sales performance: average, median, top price at each auction house
- Turf vs Dirt vs AW split, distance preferences, geographic performance
- Current crop performance if available

DAM PROFILE:
- Racing record of the dam
- All produce record with individual ratings
- Dam sire influence analysis
- Family (female line) stakes performers going back 3 generations

COMBINED ASSESSMENT:
- Nick rating between sire and dam line
- Expected distance and surface suitability
- Projected price range based on comparable sales
- Risk/reward rating (1-10 scale)
`;
