import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Database,
  FileText,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { PremiumBadge } from "./PremiumBadge";
import { usePlatformDashboardStats } from "@/hooks/usePlatformDashboardStats";
import { getUpcomingSaleLots } from "@/data/julySales";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: BarChart3, label: "Sales" },
  { icon: Search, label: "Pedigree" },
  { icon: Activity, label: "Inspection" },
  { icon: LineChart, label: "Training" },
  { icon: FileText, label: "Reports" },
  { icon: Database, label: "Horses" },
];

const metricCardDefs = [
  { key: "horses", label: "Horses Analysed" },
  { key: "potential", label: "High Potential Lots", value: "34", change: "12 recommended" },
  { key: "opportunities", label: "Market Opportunities", value: "19", change: "6 new today" },
  { key: "inspections", label: "Inspection Reports", value: "41", change: "5 pending" },
  { key: "roi", label: "Client ROI", value: "+24%", change: "vs. last sale" },
  { key: "sales", label: "Active Sales" },
] as const;

const trendData = [
  { m: "Jan", price: 420, bio: 82 },
  { m: "Feb", price: 445, bio: 84 },
  { m: "Mar", price: 438, bio: 86 },
  { m: "Apr", price: 462, bio: 87 },
  { m: "May", price: 478, bio: 89 },
  { m: "Jun", price: 495, bio: 91 },
];

const pedigreeData = [
  { band: "9+", count: 28 },
  { band: "8–9", count: 45 },
  { band: "7–8", count: 32 },
  { band: "<7", count: 12 },
];

type LotStatus = "recommended" | "watchlist" | "highValue" | "risk" | "roi";

const statusBadge = (status: LotStatus) => {
  const map = {
    recommended: { label: "Recommended", variant: "recommended" as const },
    watchlist: { label: "Watchlist", variant: "watchlist" as const },
    highValue: { label: "High Value", variant: "highValue" as const },
    risk: { label: "Risk Alert", variant: "risk" as const },
    roi: { label: "Strong ROI", variant: "roi" as const },
  };
  const { label, variant } = map[status];
  return <PremiumBadge variant={variant}>{label}</PremiumBadge>;
};

type DashboardMockupProps = {
  className?: string;
};

export const DashboardMockup = ({ className }: DashboardMockupProps) => {
  const { horsesAnalysed, weeklyDelta, activeSales, salesThisMonth } = usePlatformDashboardStats();
  const tableRows = useMemo(() => getUpcomingSaleLots(), []);

  const metricCards = useMemo(
    () =>
      metricCardDefs.map((card) => {
        if (card.key === "horses") {
          return {
            label: card.label,
            value: horsesAnalysed.toLocaleString(),
            change: `+${weeklyDelta} this week`,
          };
        }
        if (card.key === "sales") {
          return {
            label: card.label,
            value: String(activeSales),
            change: `${salesThisMonth} this month`,
          };
        }
        return {
          label: card.label,
          value: card.value,
          change: card.change,
        };
      }),
    [horsesAnalysed, weeklyDelta, activeSales, salesThisMonth],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-2xl border border-border/40 bg-white overflow-hidden shadow-[var(--shadow-premium)]",
        className,
      )}
    >
      <div className="flex min-h-0 sm:min-h-[520px] md:min-h-[580px]">
        <aside className="hidden md:flex w-[52px] lg:w-14 flex-col items-center py-4 gap-1 border-r border-border/30 bg-[hsl(210_20%_98%)]">
          {sidebarItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              title={label}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "bg-[hsl(var(--navy-deep))] text-white shadow-sm"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-white",
              )}
            >
              <Icon className="w-[15px] h-[15px] stroke-[1.5]" />
            </div>
          ))}
          <div className="mt-auto">
            <Settings className="w-[15px] h-[15px] text-muted-foreground/50 mx-auto" />
          </div>
        </aside>

        <div className="flex-1 min-w-0 bg-[hsl(210_20%_99%)]">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border/30 bg-white/80">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 font-medium">
                Intelligence Overview
              </p>
              <p className="text-sm font-medium text-foreground tracking-[-0.01em]">Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                Live
              </span>
              <Bell className="w-4 h-4 text-muted-foreground/60" />
            </div>
          </div>

          <div className="space-y-3 overflow-x-clip p-3 md:space-y-4 md:p-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5">
              {metricCards.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  className="premium-card p-3 md:p-3.5 hover:translate-y-0"
                >
                  <p className="text-[10px] text-muted-foreground truncate">{m.label}</p>
                  <p className="text-lg md:text-xl font-light tracking-[-0.02em] text-foreground mt-0.5">
                    {m.value}
                  </p>
                  <p className="text-[9px] text-secondary/90 mt-0.5 truncate">{m.change}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-3">
              <div className="lg:col-span-3 premium-card overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
                  <p className="text-xs font-medium tracking-[-0.01em]">Sale Analysis</p>
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-[10px] md:text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/20">
                        {["Lot", "Horse", "Sire", "Sale", "Score", "Risk", "Est. Value", "Status"].map((h) => (
                          <th key={h} className="text-left font-medium py-2 px-2 first:pl-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, i) => (
                        <motion.tr
                          key={`${row.saleSlug}-${row.lot}`}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 + i * 0.04 }}
                          className="border-b border-border/10 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-2 px-2 pl-3 font-medium">{row.lot}</td>
                          <td className="py-2 px-2">{row.horse}</td>
                          <td className="py-2 px-2 text-muted-foreground">{row.sire}</td>
                          <td className="py-2 px-2 text-muted-foreground">{row.sale}</td>
                          <td className="py-2 px-2 font-medium">{row.score}</td>
                          <td className="py-2 px-2">
                            <span
                              className={cn(
                                row.risk === "Low" && "text-emerald-700",
                                row.risk === "Med" && "text-amber-700",
                                row.risk === "High" && "text-red-700",
                              )}
                            >
                              {row.risk}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-medium">{row.value}</td>
                          <td className="py-2 px-2 pr-3">{statusBadge(row.status)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="premium-card p-3 flex-1 min-h-[120px]">
                  <p className="text-[10px] text-muted-foreground mb-2">Market Trend</p>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(43 76% 48%)" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="hsl(43 76% 48%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="hsl(43 76% 48%)"
                          strokeWidth={1.5}
                          fill="url(#trendFill)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="premium-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Pedigree Strength</p>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pedigreeData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91% / 0.8)" />
                        <XAxis dataKey="band" tick={{ fontSize: 9, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
                        <Bar dataKey="count" fill="hsl(222 47% 11%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2.5 flex gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-amber-900">Upcoming — {tableRows[0]?.sale ?? "Next sale"}</p>
                    <p className="text-[9px] text-amber-800/70">Lots from upcoming July sales · updated live</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
