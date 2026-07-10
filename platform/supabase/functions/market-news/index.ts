import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// RSS-based aggregator — no AI quota required
// Sources: TDN (US/Europe), Blood-Horse (News/Breeding/Sales/Racing), Idol Horse
// ═══════════════════════════════════════════════════════════════

interface Feed {
  url: string;
  source: string;
  region: string;
}

const FEEDS: Feed[] = [
  { url: "https://www.thoroughbreddailynews.com/feed/", source: "TDN", region: "Global" },
  { url: "https://www.thoroughbreddailynews.com/category/europe/feed/", source: "TDN Europe", region: "Europe" },
  { url: "https://www.bloodhorse.com/rss/news", source: "Blood-Horse", region: "USA" },
  { url: "https://www.bloodhorse.com/rss/breeding", source: "Blood-Horse Breeding", region: "USA" },
  { url: "https://www.bloodhorse.com/rss/sales", source: "Blood-Horse Sales", region: "USA" },
  { url: "https://www.bloodhorse.com/rss/racing", source: "Blood-Horse Racing", region: "USA" },
  { url: "https://idolhorse.com/feed/", source: "Idol Horse", region: "Asia / Global" },
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
  // media:content, enclosure, or first <img> in description/content
  const media = itemXml.match(/<media:content[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const enc = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enc) return enc[1];
  const img = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (img) return img[1];
  return null;
}

async function fetchFeed(feed: Feed): Promise<any[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BloodstockAI/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[market-news] ${feed.source}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    const items = itemMatches.slice(0, 6).map((itemXml) => {
      const title = stripHtml(extractTag(itemXml, "title") || "");
      const link = stripHtml(extractTag(itemXml, "link") || "");
      const pubDate = extractTag(itemXml, "pubDate") || "";
      const desc = stripHtml(extractTag(itemXml, "description") || "").slice(0, 280);
      const image = extractImage(itemXml);
      let dateStr = "";
      try {
        const d = new Date(pubDate);
        if (!isNaN(d.getTime())) dateStr = d.toISOString();
      } catch (_) { /* ignore */ }
      return {
        title,
        summary: desc,
        date: dateStr,
        url: link,
        source: feed.source,
        region: feed.region,
        image_url: image,
        _ts: dateStr ? new Date(dateStr).getTime() : 0,
      };
    }).filter((i) => i.title && i.url);
    return items;
  } catch (e) {
    console.warn(`[market-news] ${feed.source} failed:`, (e as Error).message);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    const all = results.flat();

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = all.filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // Sort by date desc and take top 12
    unique.sort((a, b) => b._ts - a._ts);
    const articles = unique.slice(0, 12).map(({ _ts, ...rest }) => ({
      ...rest,
      date: rest.date ? new Date(rest.date).toISOString().split("T")[0] : "",
    }));

    return new Response(
      JSON.stringify({ articles }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=900",
        },
      }
    );
  } catch (error) {
    console.error("Error in market-news:", error);
    return new Response(
      JSON.stringify({ articles: [], error: "Service temporarily unavailable." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
