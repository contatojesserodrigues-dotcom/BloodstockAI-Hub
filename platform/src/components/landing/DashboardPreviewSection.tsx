import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  GitCompare,
  LineChart,
  Radar,
  Search,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  Video,
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
import { LandingSection } from "./LandingSection";
import { cn } from "@/lib/utils";
import { ADVISORY_PANEL_STATS, DASHBOARD_PREVIEW_STATS } from "@/data/landing";
import { PremiumBadge } from "./PremiumBadge";

type ModuleId =
  | "dashboard"
  | "sales"
  | "pedigree"
  | "inspection"
  | "training"
  | "reports"
  | "database"
  | "advisory";

const modules: { id: ModuleId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "sales", label: "Sales Intelligence" },
  { id: "pedigree", label: "Pedigree Analysis" },
  { id: "inspection", label: "Sale Inspection" },
  { id: "training", label: "Training Analysis Center" },
  { id: "reports", label: "Market Reports" },
  { id: "database", label: "Horse Database" },
  { id: "advisory", label: "Agent Bloodstock Advisory" },
];

const dashboardWidgets = [
  { icon: ClipboardList, label: "Today's Analyses", value: DASHBOARD_PREVIEW_STATS.todaysAnalyses, col: "md:col-span-1" },
  { icon: Calendar, label: "Upcoming Sales", value: DASHBOARD_PREVIEW_STATS.upcomingSales, col: "md:col-span-1" },
  { icon: Target, label: "Watchlist", value: DASHBOARD_PREVIEW_STATS.watchlist, col: "md:col-span-1" },
  { icon: LineChart, label: "Performance Graph", value: DASHBOARD_PREVIEW_STATS.performanceTrend, col: "md:col-span-2" },
  { icon: TrendingUp, label: "Market Trends", value: "Stable", col: "md:col-span-2" },
  { icon: GitCompare, label: "Pedigree Comparison", value: DASHBOARD_PREVIEW_STATS.pedigreeComparisons, col: "md:col-span-1" },
  { icon: Activity, label: "Horse Timeline", value: "Updated", col: "md:col-span-1" },
  { icon: ClipboardList, label: "Inspection Queue", value: DASHBOARD_PREVIEW_STATS.inspectionQueue, col: "md:col-span-1" },
  { icon: Stethoscope, label: "Veterinary Notes", value: DASHBOARD_PREVIEW_STATS.vetNotes, col: "md:col-span-1" },
  { icon: AlertTriangle, label: "Risk Alerts", value: DASHBOARD_PREVIEW_STATS.riskAlerts, col: "md:col-span-1" },
  { icon: Radar, label: "Biomechanics Radar", value: DASHBOARD_PREVIEW_STATS.biomechanicsAvg, col: "md:col-span-2" },
  { icon: BarChart3, label: "Conformation Scores", value: DASHBOARD_PREVIEW_STATS.conformationScore, col: "md:col-span-1" },
  { icon: Target, label: "Market Opportunities", value: DASHBOARD_PREVIEW_STATS.marketFlagged, col: "md:col-span-2" },
];

const salesLots = [
  { lot: "142", horse: "Bay Colt", sire: "Frankel", sale: "Tatts Jul", score: 9.1, status: "recommended" as const },
  { lot: "89", horse: "Chestnut Filly", sire: "Galileo", sale: "Goffs", score: 8.7, status: "watchlist" as const },
  { lot: "456", horse: "Dark Bay", sire: "Justify", sale: "Keeneland", score: 9.3, status: "recommended" as const },
];

const trendData = [
  { m: "Feb", v: 410 },
  { m: "Mar", v: 395 },
  { m: "Apr", v: 428 },
  { m: "May", v: 445 },
  { m: "Jun", v: 462 },
];

const pedigreeBars = [
  { label: "Pedigree", score: 9.2 },
  { label: "Dosage", score: 8.6 },
  { label: "Female Line", score: 8.9 },
  { label: "Commercial", score: 8.4 },
];

const inspectionMetrics = [
  { label: "Stride Angle", value: "116°", status: "Elite" },
  { label: "Shoulder Angle", value: "52°", status: "Good" },
  { label: "Hip Angle", value: "48°", status: "Good" },
  { label: "Overall Score", value: "91", status: "Buy" },
];

const trainingRows = [
  { date: "Jun 8", furlong: "11.2s", stride: "7.4m", going: "Good" },
  { date: "Jun 5", furlong: "11.4s", stride: "7.2m", going: "Soft" },
  { date: "Jun 1", furlong: "11.1s", stride: "7.5m", going: "Good" },
];

const reportCards = [
  { title: "Arqana Summer 2026 Report", type: "Catalogue", pages: "48 pp" },
  { title: "OBS June 2026 Spreadsheet", type: "Spreadsheet", pages: "XLS" },
  { title: "Market Intelligence — July 2026", type: "Market", pages: "24 pp" },
];

const horseDbRows = [
  { name: "Enable", sire: "Nathaniel", dam: "Concentre", country: "GB", score: 9.4 },
  { name: "Justify", sire: "Scat Daddy", dam: "Stage Magic", country: "USA", score: 9.1 },
  { name: "Frankel", sire: "Galileo", dam: "Kind", country: "GB", score: 9.8 },
];

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-border/40">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function DashboardHomePanel() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {dashboardWidgets.map((w, i) => {
        const Icon = w.icon;
        return (
          <motion.div
            key={w.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              "rounded-xl bg-white border border-border/50 p-4 hover:border-border hover:shadow-sm transition-all",
              w.col,
            )}
          >
            <Icon className="w-4 h-4 text-secondary mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{w.label}</p>
            <p className="text-sm font-medium mt-1">{w.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function SalesPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Sales Intelligence" subtitle="Catalogue analysis · lot ranking · market positioning" />
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-white overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                {["Lot", "Horse", "Sire", "Sale", "Score", "Status"].map((h) => (
                  <th key={h} className="text-left font-medium py-2.5 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesLots.map((row) => (
                <tr key={row.lot} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-medium">{row.lot}</td>
                  <td className="py-2.5 px-3">{row.horse}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{row.sire}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{row.sale}</td>
                  <td className="py-2.5 px-3 font-medium">{row.score}</td>
                  <td className="py-2.5 px-3">
                    <PremiumBadge variant={row.status === "recommended" ? "recommended" : "watchlist"}>
                      {row.status === "recommended" ? "Recommended" : "Watchlist"}
                    </PremiumBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-white p-4">
          <p className="text-[10px] text-muted-foreground mb-2">Market Trend</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <Area type="monotone" dataKey="v" stroke="hsl(43 76% 48%)" fill="hsl(43 76% 48% / 0.1)" strokeWidth={1.5} />
                <XAxis dataKey="m" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function PedigreePanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Pedigree Analysis" subtitle="Frankel × Kind — search result preview" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Frankel (GB)</span>
            <PremiumBadge variant="recommended">Elite</PremiumBadge>
          </div>
          <p className="text-[11px] text-muted-foreground">Sire: Galileo · Dam: Kind · Dam sire: Danehill</p>
          <div className="space-y-2 pt-2">
            {pedigreeBars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium">{b.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60">
                  <div className="h-full rounded-full bg-[hsl(var(--navy-deep))]" style={{ width: `${b.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-white p-4">
          <p className="text-[10px] text-muted-foreground mb-2">Dosage Profile</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ k: "B", v: 2 }, { k: "I", v: 4 }, { k: "C", v: 8 }, { k: "S", v: 12 }, { k: "P", v: 6 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="k" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Bar dataKey="v" fill="hsl(43 76% 48%)" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectionPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Sale Inspection" subtitle="Biomechanics · conformation · video analysis" />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 rounded-xl border border-border/50 bg-[hsl(var(--navy-deep))] aspect-video flex items-center justify-center">
          <Video className="w-8 h-8 text-white/40" />
          <span className="sr-only">Video frame preview</span>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {inspectionMetrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border/50 bg-white p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className="text-lg font-medium mt-1">{m.value}</p>
              <p className="text-[10px] text-secondary mt-0.5">{m.status}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900">AI verdict: <strong>BUY</strong> — strong stride mechanics, clean conformation, low injury risk flags.</p>
      </div>
    </div>
  );
}

function TrainingPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Training Analysis Center" subtitle="GPS · stride · session progression" />
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {[
          { label: "Avg Furlong", value: "11.2s" },
          { label: "Stride Length", value: "7.4m" },
          { label: "Progress", value: "+6%" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-white p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            <p className="text-xl font-light mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/50 bg-white overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              {["Date", "Furlong", "Stride", "Going"].map((h) => (
                <th key={h} className="text-left font-medium py-2.5 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trainingRows.map((r) => (
              <tr key={r.date} className="border-b border-border/20 last:border-0">
                <td className="py-2.5 px-3">{r.date}</td>
                <td className="py-2.5 px-3 font-medium">{r.furlong}</td>
                <td className="py-2.5 px-3">{r.stride}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{r.going}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Market Reports" subtitle="Published intelligence · free & premium downloads" />
      <div className="grid sm:grid-cols-3 gap-3">
        {reportCards.map((r) => (
          <div key={r.title} className="rounded-xl border border-border/50 bg-white p-4 hover:border-secondary/30 transition-colors">
            <FileText className="w-5 h-5 text-secondary mb-2" />
            <p className="text-xs font-medium leading-snug">{r.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{r.type} · {r.pages}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DatabasePanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Horse Database" subtitle="Global search · sales history · performance" />
      <div className="flex gap-2 mb-2">
        <div className="flex-1 rounded-lg border border-border/50 bg-white px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          Search horses, sires, dams…
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-white overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              {["Name", "Sire", "Dam", "Country", "Score"].map((h) => (
                <th key={h} className="text-left font-medium py-2.5 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horseDbRows.map((r) => (
              <tr key={r.name} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                <td className="py-2.5 px-3 font-medium">{r.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{r.sire}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{r.dam}</td>
                <td className="py-2.5 px-3">{r.country}</td>
                <td className="py-2.5 px-3 font-medium">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdvisoryPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Agent Bloodstock Advisory" subtitle="Expert guidance powered by platform intelligence" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-white p-5">
          <Users className="w-5 h-5 text-secondary mb-3" />
          <p className="text-sm font-medium">Book a strategy session</p>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Work with bloodstock specialists who combine professional judgement with catalogue intelligence, inspection data, and market analytics.
          </p>
          <div className="mt-4 inline-flex text-[11px] font-medium text-secondary">Schedule consultation →</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Active mandates", value: ADVISORY_PANEL_STATS.activeMandates },
            { label: "Avg ROI", value: ADVISORY_PANEL_STATS.avgRoi },
            { label: "Sales covered", value: ADVISORY_PANEL_STATS.salesCovered },
            { label: "Reports delivered", value: ADVISORY_PANEL_STATS.reportsDelivered },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-white p-3">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-lg font-medium mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModulePanel({ id }: { id: ModuleId }) {
  switch (id) {
    case "dashboard": return <DashboardHomePanel />;
    case "sales": return <SalesPanel />;
    case "pedigree": return <PedigreePanel />;
    case "inspection": return <InspectionPanel />;
    case "training": return <TrainingPanel />;
    case "reports": return <ReportsPanel />;
    case "database": return <DatabasePanel />;
    case "advisory": return <AdvisoryPanel />;
  }
}

export const DashboardPreviewSection = () => {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const activeModule = modules.find((m) => m.id === active)!;

  return (
    <LandingSection
      eyebrow="Platform Preview"
      title={
        <>
          See the entire system.
          <br />
          <span className="text-muted-foreground font-extralight">No account required.</span>
        </>
      }
      subtitle="Click any module to explore how the real platform works — sales intelligence, pedigree, inspection, training and more."
      className="bg-[hsl(210_16%_98%)]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 rounded-2xl border border-border/60 bg-white shadow-[0_24px_80px_-32px_hsl(222_47%_11%_/_0.12)] overflow-hidden min-h-[480px]">
          <div className="lg:w-56 shrink-0 bg-[hsl(var(--navy-deep))] p-4 lg:py-6">
            <p className="text-[10px] uppercase tracking-wider text-white/40 px-3 mb-4 hidden lg:block">
              Modules
            </p>
            <nav className="flex flex-wrap gap-1 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {modules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActive(m.id)}
                  className={cn(
                    "whitespace-nowrap text-left text-xs px-3 py-2 rounded-lg transition-colors shrink-0 w-full",
                    active === m.id
                      ? "bg-secondary/15 text-secondary font-medium"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-4 md:p-6 lg:p-8 bg-[hsl(210_16%_98%)] min-h-[360px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4 lg:hidden">
              {activeModule.label}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <ModulePanel id={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </LandingSection>
  );
};
