import { motion } from "framer-motion";
import { MONITORED_SALES } from "@/data/landing";
import { LandingSection } from "./LandingSection";
import { cn } from "@/lib/utils";

export const SalesCoverageLandingSection = () => (
  <LandingSection
    eyebrow="Sales Coverage"
    title="Every major sale. Fully monitored."
    subtitle="Dates, coverage levels, and analysis availability across the world's leading auction houses."
    className="bg-[hsl(210_16%_98%)] border-y border-border/60"
  >
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[640px] max-w-4xl mx-auto text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {["Sale", "Dates", "Coverage", "Status"].map((h) => (
              <th
                key={h}
                className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MONITORED_SALES.map((s, i) => (
            <motion.tr
              key={s.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="border-b border-border/40 hover:bg-white/80 transition-colors"
            >
              <td className="py-4 px-4 font-medium">{s.name}</td>
              <td className="py-4 px-4 text-muted-foreground">{s.dates}</td>
              <td className="py-4 px-4 text-muted-foreground">{s.coverage}</td>
              <td className="py-4 px-4">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full",
                    s.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.status}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  </LandingSection>
);
