import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Newspaper, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  url: string;
}

type MarketNewsFeedProps = {
  embedded?: boolean;
};

export const MarketNewsFeed = ({ embedded = false }: MarketNewsFeedProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let articles: NewsItem[] | undefined;

      const apiRes = await fetch("/api/market-news");
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        articles = apiData?.articles;
      }

      if (!articles?.length) {
        const { data, error: invokeError } = await supabase.functions.invoke("market-news");
        if (invokeError) throw invokeError;
        articles = data?.articles;
      }

      if (articles?.length) {
        setNews(articles);
      } else {
        setNews([]);
        setError("No headlines available at the moment.");
      }
    } catch (err) {
      console.error("Failed to fetch market news:", err);
      setNews([]);
      setError("Unable to load live headlines right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = window.setInterval(() => fetchNews(true), 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchNews]);

  if (loading) {
    return (
      <div className={embedded ? "flex justify-center py-10" : "flex justify-center py-8"}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className={embedded ? "space-y-3" : "rounded-2xl border border-border/60 bg-card p-6"}>
        {!embedded && (
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-5 h-5 text-secondary" />
            <h3 className="text-sm font-semibold text-foreground">Market update</h3>
          </div>
        )}
        <p className="text-sm text-muted-foreground text-center py-4">
          {error ?? "No headlines available at the moment."}
        </p>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => fetchNews(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-2" : "rounded-2xl border border-border/60 bg-card overflow-hidden"}>
      {!embedded && (
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-secondary" />
            <h3 className="text-sm font-semibold text-foreground">Market update</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fetchNews(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      <div className={embedded ? "space-y-2 max-h-[360px] overflow-y-auto pr-1" : "divide-y divide-border/50 max-h-[420px] overflow-y-auto"}>
        {news.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={
              embedded
                ? "block rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 hover:border-secondary/30 hover:bg-muted/25 transition-all group"
                : "block px-4 py-3 hover:bg-muted/20 transition-colors group"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground group-hover:text-secondary transition-colors line-clamp-2">
                  {item.title}
                </h4>
                {item.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                )}
                {item.date && (
                  <p className="text-[10px] text-muted-foreground mt-2">{item.date}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-secondary shrink-0 mt-0.5" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
