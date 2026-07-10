import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Crown,
  Download,
  Radio,
  Star,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { MarketNewsFeed } from "@/components/dashboard/MarketNewsFeed";
import { AnalysedCataloguesList } from "@/components/dashboard/AnalysedCataloguesList";
import {
  BROODMARE_TRENDS,
  JULY_ACTIVITY_SERIES,
  JULY_SALES,
  MARKET_UPDATES,
  STALLION_TRENDS,
  TOP_LOTS,
  TOTAL_BLACK_TYPE_LOTS,
  TOTAL_POTENTIAL_LOTS,
  type JulySale,
} from "@/data/julySales";

type DashboardCommandCenterProps = {
  selectedSaleSlug?: string;
  onSelectSale?: (sale: JulySale) => void;
  onCheckPotential?: () => void;
};

const areaConfig = {
  lots: { label: "Lots analysed", color: "hsl(222 47% 11%)" },
  potential: { label: "High potential", color: "hsl(36 64% 47%)" },
  sold: { label: "Sales activity", color: "hsl(160 60% 45%)" },
};

const barConfig = {
  potential: { label: "Potential", color: "hsl(36 64% 47%)" },
  blackType: { label: "Black type", color: "hsl(222 47% 11%)" },
};

type LiveHeadline = {
  title: string;
  summary: string;
  url: string;
  date: string;
};

export function DashboardCommandCenter({
  selectedSaleSlug,
  onSelectSale,
  onCheckPotential,
}: DashboardCommandCenterProps) {
  const [pulse, setPulse] = useState(0);
  const [liveIndex, setLiveIndex] = useState(0);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveHeadlines, setLiveHeadlines] = useState<LiveHeadline[]>([]);

  const fetchLiveHeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/market-news");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.articles) && data.articles.length > 0) {
        setLiveHeadlines(
          data.articles.map((a: LiveHeadline) => ({
            title: a.title,
            summary: a.summary,
            url: a.url,
            date: a.date,
          })),
        );
      }
    } catch {
      /* silent fallback */
    }
  }, []);

  useEffect(() => {
    fetchLiveHeadlines();
    const refresh = window.setInterval(fetchLiveHeadlines, 15 * 60 * 1000);
    return () => window.clearInterval(refresh);
  }, [fetchLiveHeadlines]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPulse((value) => (value + 1) % 2);
      setLiveIndex((value) => (value + 1) % MARKET_UPDATES.length);
      setHeadlineIndex((value) => {
        const max = Math.max(liveHeadlines.length, 1);
        return (value + 1) % max;
      });
      setLastUpdated(new Date());
    }, 4000);
    return () => window.clearInterval(interval);
  }, [liveHeadlines.length]);

  const saleChartData = useMemo(
    () =>
      JULY_SALES.map((sale) => ({
        name: sale.name.split(" ")[0],
        fullName: sale.name,
        potential: sale.potentialLots,
        blackType: sale.blackTypeLots,
      })),
    [],
  );

  const activeSales = JULY_SALES.filter((sale) => sale.status === "Active").length;
  const liveUpdate = MARKET_UPDATES[liveIndex];
  const liveHeadline = liveHeadlines[headlineIndex];

  return (
    <section className="dashboard-command-center space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white p-4 sm:p-5 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,138,43,0.06),transparent_55%)] pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/10">
                <Radio className={`w-3 h-3 mr-1.5 ${pulse ? "opacity-100" : "opacity-35"}`} />
                Live · July auctions
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-secondary font-semibold mb-2">Real-time intelligence</p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-[-0.03em] text-foreground">
                {TOTAL_POTENTIAL_LOTS} lots with potential · {TOTAL_BLACK_TYPE_LOTS} black type
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                Tattersalls July has <strong className="text-foreground">19 black-type lots</strong> flagged · JRHA Yearlings Japan trending · {activeSales} sale active now
              </p>
            </div>
            {liveHeadline ? (
              <a
                href={liveHeadline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 max-w-2xl hover:border-secondary/30 hover:bg-muted/30 transition-all group"
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-secondary mb-1 flex items-center gap-1.5">
                  Market update
                  {liveHeadline.date ? ` · ${liveHeadline.date}` : ""}
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </p>
                <p className="text-sm text-foreground font-medium line-clamp-2">{liveHeadline.title}</p>
                {liveHeadline.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{liveHeadline.summary}</p>
                )}
              </a>
            ) : liveUpdate ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 max-w-2xl">
                <p className="text-[10px] uppercase tracking-[0.14em] text-secondary mb-1">Market update · {liveUpdate.time}</p>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{liveUpdate.sale}</span> — {liveUpdate.update}
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <Button
              className="bg-secondary hover:bg-secondary/90 text-white border-0 shadow-sm shadow-secondary/20"
              onClick={onCheckPotential}
            >
              Check now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-[-0.02em] text-foreground">July sales · live monitor</h3>
              <p className="text-xs text-muted-foreground">Tap a sale to focus analysis</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{TOTAL_POTENTIAL_LOTS} potential</Badge>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {JULY_SALES.map((sale) => {
              const selected = selectedSaleSlug === sale.slug;
              return (
                <button
                  key={sale.slug}
                  type="button"
                  onClick={() => onSelectSale?.(sale)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                    selected
                      ? "border-secondary/40 bg-secondary/5 shadow-sm"
                      : "border-border/60 hover:border-secondary/25 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sale.flag} {sale.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{sale.date} · {sale.location}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        sale.status === "Active"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shrink-0"
                          : sale.status === "Ended"
                          ? "shrink-0 text-muted-foreground"
                          : "border-secondary/30 bg-secondary/10 text-secondary shrink-0"
                      }
                    >
                      {sale.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{sale.analyzedLots}/{sale.totalLots} lots</span>
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-secondary font-semibold">{sale.potentialLots} potential</span>
                    <span className="rounded-full bg-[#0F172A]/5 px-2 py-0.5 text-foreground font-medium">{sale.blackTypeLots} black type</span>
                  </div>
                </button>
              );
            })}
          </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <Tabs defaultValue="activity" className="w-full">
          <div className="px-4 pt-4 pb-2 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-[-0.02em] text-foreground">Interactive auction analytics</h3>
              <p className="text-xs text-muted-foreground">July catalogue intelligence · updated live</p>
            </div>
            <TabsList className="grid grid-cols-2 sm:flex w-full sm:w-auto h-auto gap-1">
              <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
              <TabsTrigger value="blacktype" className="text-xs">Black Type</TabsTrigger>
              <TabsTrigger value="toplots" className="text-xs">Top Lots</TabsTrigger>
              <TabsTrigger value="stallions" className="text-xs">Stallions</TabsTrigger>
              <TabsTrigger value="broodmares" className="text-xs">Broodmares</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="activity" className="p-4 mt-0">
            <ChartContainer config={areaConfig} className="h-[260px] w-full aspect-auto">
              <AreaChart data={JULY_ACTIVITY_SERIES} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashLotsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(222 47% 11%)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(222 47% 11%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashPotentialFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(36 64% 47%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(36 64% 47%)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="lots" stroke="var(--color-lots)" fill="url(#dashLotsFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="potential" stroke="var(--color-potential)" fill="url(#dashPotentialFill)" strokeWidth={2} />
                <Line type="monotone" dataKey="sold" stroke="var(--color-sold)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="blacktype" className="p-4 mt-0">
            <ChartContainer config={barConfig} className="h-[260px] w-full aspect-auto">
              <BarChart data={saleChartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""} />} />
                <Bar dataKey="blackType" fill="var(--color-blackType)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="potential" fill="var(--color-potential)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {JULY_SALES.filter((s) => s.blackTypeLots >= 7).map((sale) => (
                <div key={sale.slug} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-secondary shrink-0" />
                  <p className="text-xs text-foreground">
                    <strong>{sale.blackTypeLots}</strong> black-type lots with potential · {sale.name.split(" – ")[0]}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="toplots" className="p-4 mt-0 space-y-2">
            {TOP_LOTS.map((lot) => (
              <div key={`${lot.sale}-${lot.lot}`} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 shrink-0">
                  <Star className="w-4 h-4 text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Lot {lot.lot} · {lot.horse}</p>
                  <p className="text-xs text-muted-foreground">{lot.sale} · {lot.sire}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-secondary">{lot.score}</p>
                  <p className="text-[11px] text-muted-foreground">{lot.est}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="stallions" className="p-4 mt-0">
            <ChartContainer config={{ demand: { label: "Demand index", color: "hsl(36 64% 47%)" } }} className="h-[260px] w-full aspect-auto">
              <BarChart data={STALLION_TRENDS} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="demand" fill="hsl(36 64% 47%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="broodmares" className="p-4 mt-0">
            <ChartContainer config={{ strength: { label: "Family strength", color: "hsl(222 47% 11%)" } }} className="h-[260px] w-full aspect-auto">
              <LineChart data={BROODMARE_TRENDS} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis domain={[60, 100]} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="strength" stroke="hsl(222 47% 11%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(36 64% 47%)" }} />
              </LineChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Market update</h3>
              <p className="text-xs text-muted-foreground">Live industry feed</p>
            </div>
          </div>
          <div className="p-3">
            <MarketNewsFeed embedded />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
            <Download className="w-4 h-4 text-secondary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Analysed catalogues</h3>
              <p className="text-xs text-muted-foreground">July sales · download by date & location</p>
            </div>
          </div>
          <AnalysedCataloguesList />
        </div>
      </div>
    </section>
  );
}
