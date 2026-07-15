export interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  topic?: "general" | "news";
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  rawContent?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  responseTime?: number;
}

export interface TavilyConfig {
  configured: boolean;
  apiKey: string | null;
  warning?: string;
}

export function getTavilyConfig(): TavilyConfig {
  const apiKey = process.env.TAVILY_API_KEY?.trim() || null;
  if (!apiKey) {
    return {
      configured: false,
      apiKey: null,
      warning: "TAVILY_API_KEY is not set. Lead search will run in mock mode.",
    };
  }
  return { configured: true, apiKey };
}

export async function tavilySearch(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const config = getTavilyConfig();
  if (!config.configured || !config.apiKey) {
    throw new Error(config.warning || "Tavily not configured");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.apiKey,
      query,
      search_depth: options.searchDepth || "advanced",
      max_results: options.maxResults || 10,
      include_answer: options.includeAnswer ?? true,
      include_raw_content: options.includeRawContent ?? false,
      topic: options.topic || "general",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed: ${text || res.statusText}`);
  }

  const data = await res.json();
  return {
    query,
    answer: data.answer,
    results: (data.results || []).map((r: Record<string, unknown>) => ({
      title: String(r.title || ""),
      url: String(r.url || ""),
      content: String(r.content || ""),
      score: typeof r.score === "number" ? r.score : undefined,
      rawContent: typeof r.raw_content === "string" ? r.raw_content : undefined,
    })),
    responseTime: data.response_time,
  };
}

const DEFAULT_SEARCH_QUERIES = {
  UK: [
    "thoroughbred consignors UK",
    "bloodstock agents UK",
    "stud farms UK",
    "racehorse trainers UK",
    "Tattersalls consignors",
  ],
  Ireland: [
    "thoroughbred consignors Ireland",
    "bloodstock agents Ireland",
    "stud farms Ireland",
    "racehorse trainers Ireland",
    "Goffs consignors",
  ],
  both: [
    "thoroughbred consignors UK",
    "thoroughbred consignors Ireland",
    "bloodstock agents UK",
    "bloodstock agents Ireland",
    "stud farms UK",
    "stud farms Ireland",
    "racehorse trainers UK",
    "racehorse trainers Ireland",
    "Tattersalls consignors",
    "Goffs consignors",
  ],
};

export async function findLeadCompanies({
  country = "UK and Ireland",
  segment = "bloodstock",
  auctionFocus = "Tattersalls and Goffs",
  limit = 10,
}: {
  country?: string;
  segment?: string;
  auctionFocus?: string;
  limit?: number;
}) {
  const countryKey = country.toLowerCase().includes("ireland") && country.toLowerCase().includes("uk")
    ? "both"
    : country.toLowerCase().includes("ireland")
      ? "Ireland"
      : "UK";

  const baseQueries =
    countryKey === "both"
      ? DEFAULT_SEARCH_QUERIES.both
      : countryKey === "Ireland"
        ? DEFAULT_SEARCH_QUERIES.Ireland
        : DEFAULT_SEARCH_QUERIES.UK;

  const queries = baseQueries.map((q) => {
    if (segment && !q.includes(segment)) return `${q} ${segment}`;
    if (auctionFocus && (q.includes("Tattersalls") || q.includes("Goffs"))) return `${q} ${auctionFocus}`;
    return q;
  });

  const allResults: TavilySearchResult[] = [];
  const perQuery = Math.max(3, Math.ceil(limit / queries.length));

  for (const query of queries.slice(0, Math.min(queries.length, 6))) {
    const response = await tavilySearch(query, { maxResults: perQuery, searchDepth: "advanced" });
    allResults.push(...response.results);
    if (allResults.length >= limit * 2) break;
  }

  return parseCompanyLeads(allResults, { country, segment, limit });
}

export interface ParsedCompanyLead {
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
  segment: string | null;
  description: string | null;
  sourceUrls: string[];
  confidenceScore: number;
}

function extractDomain(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return null;
  }
}

function guessCompanyName(title: string, url: string) {
  const domain = extractDomain(url);
  if (domain) {
    const base = domain.split(".")[0];
    if (base && base.length > 2) {
      return base.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return title.split("|")[0].split("-")[0].trim().slice(0, 80) || "Unknown Company";
}

function guessCountry(text: string, fallback: string) {
  const lower = text.toLowerCase();
  if (lower.includes("ireland") || lower.includes("dublin") || lower.includes("goffs")) return "Ireland";
  if (lower.includes("uk") || lower.includes("united kingdom") || lower.includes("tattersalls")) return "UK";
  return fallback.includes("Ireland") && fallback.includes("UK") ? null : fallback;
}

export function parseCompanyLeads(
  results: TavilySearchResult[],
  opts: { country: string; segment: string; limit: number }
): ParsedCompanyLead[] {
  const seen = new Set<string>();
  const leads: ParsedCompanyLead[] = [];

  for (const result of results) {
    const key = extractDomain(result.url) || result.title.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const companyName = guessCompanyName(result.title, result.url);
    const website = extractDomain(result.url) ? `https://${extractDomain(result.url)}` : result.url;
    const country = guessCountry(`${result.title} ${result.content}`, opts.country);
    const scoreBase = result.score ?? 0.5;
    const confidenceScore = Math.min(0.95, Math.max(0.35, scoreBase));

    leads.push({
      companyName,
      website,
      country,
      city: null,
      segment: opts.segment,
      description: result.content?.slice(0, 500) || result.title,
      sourceUrls: [result.url],
      confidenceScore,
    });

    if (leads.length >= opts.limit) break;
  }

  return leads;
}

export interface EnrichedCompanyLead extends ParsedCompanyLead {
  contactPage: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  linkedinUrl: string | null;
  auctionRelevance: string | null;
  recentActivity: string | null;
  decisionMakers: string | null;
  contactName: string | null;
}

export async function enrichCompanyLead({
  companyName,
  website,
  country,
}: {
  companyName: string;
  website?: string | null;
  country?: string | null;
}): Promise<EnrichedCompanyLead> {
  const domain = website ? extractDomain(website) : null;
  const query = `${companyName} ${domain || ""} ${country || ""} official website contact email phone linkedin bloodstock auction`.trim();

  const response = await tavilySearch(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });

  const contact = extractPublicContactInfo(response.results, response.answer);

  return {
    companyName,
    website: website || (domain ? `https://${domain}` : null),
    country: country || null,
    city: contact.city,
    segment: "bloodstock",
    description: response.answer || response.results[0]?.content?.slice(0, 500) || null,
    sourceUrls: response.results.map((r) => r.url),
    confidenceScore: contact.confidenceScore,
    contactPage: contact.contactPage,
    publicEmail: contact.publicEmail,
    publicPhone: contact.publicPhone,
    linkedinUrl: contact.linkedinUrl,
    auctionRelevance: contact.auctionRelevance,
    recentActivity: contact.recentActivity,
    decisionMakers: contact.decisionMakers,
    contactName: contact.contactName,
  };
}

export function extractPublicContactInfo(
  results: TavilySearchResult[],
  answer?: string
): {
  publicEmail: string | null;
  publicPhone: string | null;
  linkedinUrl: string | null;
  contactPage: string | null;
  contactName: string | null;
  city: string | null;
  auctionRelevance: string | null;
  recentActivity: string | null;
  decisionMakers: string | null;
  confidenceScore: number;
} {
  const corpus = [
    answer || "",
    ...results.map((r) => `${r.title}\n${r.content}\n${r.url}`),
  ].join("\n");

  const emailMatch = corpus.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const phoneMatch = corpus.match(/(?:\+44|\+353|0)\s?[\d\s()-]{8,}/);
  const linkedinMatch = corpus.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/i);
  const contactPage = results.find((r) => /contact|about|team/i.test(r.url))?.url || null;

  const auctionRelevance =
    /tattersalls|goffs|bloodstock|thoroughbred|auction|consignor/i.test(corpus)
      ? "Relevant to UK/Ireland bloodstock auctions"
      : null;

  const recentActivity = results.find((r) => /news|press|2024|2025|2026/i.test(r.content))?.content?.slice(0, 200) || null;

  let confidenceScore = 0.4;
  if (emailMatch) confidenceScore += 0.2;
  if (phoneMatch) confidenceScore += 0.15;
  if (linkedinMatch) confidenceScore += 0.1;
  if (contactPage) confidenceScore += 0.1;
  if (auctionRelevance) confidenceScore += 0.05;

  return {
    publicEmail: emailMatch ? emailMatch[0].toLowerCase() : null,
    publicPhone: phoneMatch ? phoneMatch[0].trim() : null,
    linkedinUrl: linkedinMatch ? linkedinMatch[0] : null,
    contactPage,
    contactName: null,
    city: null,
    auctionRelevance,
    recentActivity,
    decisionMakers: null,
    confidenceScore: Math.min(confidenceScore, 0.95),
  };
}
