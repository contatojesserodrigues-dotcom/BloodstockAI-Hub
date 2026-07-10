import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardList,
  GitCompare,
  LineChart,
  Radar,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import { LandingSection } from "./LandingSection";
import { cn } from "@/lib/utils";

const modules = [
  "Dashboard",
  "Sales Intelligence",
  "Pedigree Analysis",
  "Sale Inspection",
  "Training Analysis Center",
  "Market Reports",
  "Horse Database",
  "Agent Bloodstock Advisory",
];

const widgets = [
  { icon: ClipboardList, label: "Today's Analyses", value: "24", col: "md:col-span-1" },
  { icon: Calendar, label: "Upcoming Sales", value: "8", col: "md:col-span-1" },
  { icon: Target, label: "Watchlist", value: "12", col: "md:col-span-1" },
  { icon: LineChart, label: "Performance Graph", value: "↑ 18%", col: "md:col-span-2" },
  { icon: TrendingUp, label: "Market Trends", value: "Bullish", col: "md:col-span-2" },
  { icon: GitCompare, label: "Pedigree Comparison", value: "3 active", col: "md:col-span-1" },
  { icon: Activity, label: "Horse Timeline", value: "Updated", col: "md:col-span-1" },
  { icon: ClipboardList, label: "Inspection Queue", value: "5 pending", col: "md:col-span-1" },
  { icon: Stethoscope, label: "Veterinary Notes", value: "2 new", col: "md:col-span-1" },
  { icon: AlertTriangle, label: "Risk Alerts", value: "3", col: "md:col-span-1" },
  { icon: Radar, label: "Biomechanics Radar", value: "91 avg", col: "md:col-span-2" },
  { icon: BarChart3, label: "Conformation Scores", value: "8.7", col: "md:col-span-1" },
  { icon: Target, label: "Market Opportunities", value: "6 flagged", col: "md:col-span-2" },
];

export const DashboardPreviewSection = () => (
  <LandingSection
    eyebrow="Platform Preview"
    title={
      <>
        See the entire system.
        <br />
        <span className="text-muted-foreground font-extralight">No account required.</span>
      </>
    }
    subtitle="Explore every module — from sales intelligence to AI advisory — in one unified workspace."
    className="bg-[hsl(210_16%_98%)]"
  >
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 rounded-2xl border border-border/60 bg-white shadow-[0_24px_80px_-32px_hsl(222_47%_11%_/_0.12)] overflow-hidden">
        {/* Sidebar nav */}
        <div className="lg:w-56 shrink-0 bg-[hsl(var(--navy-deep))] p-4 lg:py-6">
          <p className="text-[10px] uppercase tracking-wider text-white/40 px-3 mb-4 hidden lg:block">
            Modules
          </p>
          <nav className="flex flex-wrap gap-1 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {modules.map((m, i) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "whitespace-nowrap text-left text-xs px-3 py-2 rounded-lg transition-colors shrink-0",
                  i === 0
                    ? "bg-secondary/15 text-secondary font-medium"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5",
                )}
              >
                {m}
              </button>
            ))}
          </nav>
        </div>

        {/* Widget grid */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 bg-[hsl(210_16%_98%)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {widgets.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={w.label}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
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
        </div>
      </div>
    </div>
  </LandingSection>
);
