export type NewsArticle = {
  title: string;
  summary: string;
  date: string;
  url: string;
  source: string;
  region: string;
  image_url?: string | null;
};

type Feed = { url: string; source: string; region: string };
type TavilySearch = {
  query: string;
  source: string;
  region: string;
  include_domains: string[];
};

const TAVILY_SEARCHES: TavilySearch[] = [
  {
    query: "latest thoroughbred racing bloodstock sales breeding news United States",
    source: "Blood-Horse",
    region: "USA",
    include_domains: ["bloodhorse.com"],
  },
  {
    query: "latest thoroughbred racing sales breeding stallion news",
    source: "TDN USA",
    region: "USA",
    include_domains: ["thoroughbreddailynews.com"],
  },
  {
    query: "latest European thoroughbred racing sales breeding auction news",
    source: "TDN Europe",
    region: "Europe",
    include_domains: ["thoroughbreddailynews.com"],
  },
  {
    query: "latest Australia New Zealand thoroughbred bloodstock sales racing news",
    source: "TDN Australasia",
    region: "New Zealand",
    include_domains: ["thoroughbreddailynews.com", "racingandsports.com.au"],
  },
];

const RSS_FEEDS: Feed[] = [
  { url: "https://www.thoroughbreddailynews.com/feed/", source: "TDN USA", region: "USA" },
  { url: "https://www.thoroughbreddailynews.com/category/europe/feed/", source: "TDN Europe", region: "Europe" },
  {
    url: "https://www.thoroughbreddailynews.com/category/australia-new-zealand/feed/",
    source: "TDN Australasia",
    region: "New Zealand",
  },
  { url: "https://www.bloodhorse.com/rss/news", source: "Blood-Horse", region: "USA" },
  { url: "https://www.bloodhorse.com/rss/sales", source: "Blood-Horse Sales", region: "USA" },
  { url: "https://www.bloodhorse.com/rss/breeding", source: "Blood-Horse Breeding", region: "USA" },
];

function stripHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractImage(itemXml: string): string | null {
  const media = itemXml.match(/<media:content[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const enc = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enc) return enc[1];
  const img = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (img) return img[1];
  return null;
}

function normalizeDate(input?: string | null): { iso: string; ts: number } {
  if (!input) return { iso: "", ts: 0 };
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return { iso: "", ts: 0 };
  return { iso: d.toISOString().split("T")[0], ts: d.getTime() };
}

async function tavilySearch(search: TavilySearch, apiKey: string): Promise<Array<NewsArticle & { _ts: number }>> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: search.query,
        search_depth: "advanced",
        max_results: 5,
        include_domains: search.include_domains,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data?.results ?? []).map((item: any) => {
      const { iso, ts } = normalizeDate(item?.published_date);
      return {
        title: stripHtml(item?.title || ""),
        summary: stripHtml(item?.content || "").slice(0, 280),
        date: iso,
        url: item?.url || "",
        source: search.source,
        region: search.region,
        image_url: item?.image_url || null,
        _ts: ts || Date.now(),
      };
    }).filter((item: NewsArticle) => item.title && item.url);
  } catch {
    return [];
  }
}

async function fetchRssFeed(feed: Feed): Promise<Array<NewsArticle & { _ts: number }>> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BloodstockAI/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];

    return itemMatches.slice(0, 5).map((itemXml) => {
      const title = stripHtml(extractTag(itemXml, "title") || "");
      const link = stripHtml(extractTag(itemXml, "link") || "");
      const pubDate = extractTag(itemXml, "pubDate") || "";
      const desc = stripHtml(extractTag(itemXml, "description") || "").slice(0, 280);
      const image = extractImage(itemXml);
      const { iso, ts } = normalizeDate(pubDate);

      return {
        title,
        summary: desc,
        date: iso,
        url: link,
        source: feed.source,
        region: feed.region,
        image_url: image,
        _ts: ts,
      };
    }).filter((item) => item.title && item.url);
  } catch {
    return [];
  }
}

function dedupeArticles<T extends { url: string }>(articles: T[]): T[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.url.split("?")[0].toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchMarketNews(tavilyApiKey?: string | null) {
  let articles: Array<NewsArticle & { _ts: number }> = [];
  let source = "tavily";

  if (tavilyApiKey) {
    const tavilyResults = await Promise.all(
      TAVILY_SEARCHES.map((search) => tavilySearch(search, tavilyApiKey)),
    );
    articles = dedupeArticles(tavilyResults.flat());
  }

  if (articles.length === 0) {
    source = "rss";
    const rssResults = await Promise.all(RSS_FEEDS.map(fetchRssFeed));
    articles = dedupeArticles(rssResults.flat());
  }

  articles.sort((a, b) => b._ts - a._ts);
  const payload = articles.slice(0, 12).map(({ _ts, source, region, ...rest }) => rest);

  return {
    articles: payload,
    source,
    updated_at: new Date().toISOString(),
  };
}
