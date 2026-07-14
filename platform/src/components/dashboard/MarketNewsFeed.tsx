import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  url: string;
  source: string;
  image_url?: string | null;
}

export const MarketNewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("market-news");
        if (error) throw error;
        if (data?.articles) {
          setNews(data.articles);
        }
      } catch (err) {
        console.error("Failed to fetch market news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (news.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Industry Headlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No headlines available at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5" />
          Industry Headlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border hover:border-secondary/50 hover:bg-muted/30 transition-all group overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Article Content */}
              <div className="flex-1 p-4 flex items-start justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm group-hover:text-secondary transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                    {item.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    {item.source && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] font-medium text-secondary/70">{item.source}</span>
                      </>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-secondary shrink-0 mt-1" />
              </div>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
};
