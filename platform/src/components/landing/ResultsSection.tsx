import { motion } from "framer-motion";
import { RESULT_CASES } from "@/data/landing";
import { LandingSection } from "./LandingSection";
import { cn } from "@/lib/utils";

export const ResultsSection = () => (
  <LandingSection
    eyebrow="Proven Results"
    title="Helping Professionals Make Better Decisions."
    subtitle="Real outcomes from major sales worldwide — pedigree scores, biomechanics, and market intelligence combined."
  >
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
      {RESULT_CASES.map((c, i) => (
        <motion.article
          key={`${c.sale}-${c.lot}`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06 }}
          className="group rounded-xl border border-border/40 bg-white overflow-hidden premium-card hover:border-border/60"
        >
          {/* Horse placeholder */}
          <div className="h-36 bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-light))] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,hsl(43_76%_48%_/_0.2),transparent_60%)]" />
            <div className="absolute bottom-3 left-4">
              <p className="text-white/60 text-[10px] uppercase tracking-wider">{c.sale}</p>
              <p className="text-white font-medium text-sm">{c.lot}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">{c.horse}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pedigree</p>
                <p className="text-lg font-semibold">{c.pedigreeScore}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Biomechanics</p>
                <p className="text-lg font-semibold">{c.biomechanicsScore}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated</p>
                <p className="text-sm font-medium">{c.estimatedValue}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Final Price</p>
                <p className="text-sm font-semibold text-foreground">{c.finalPrice}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full",
                  c.recommendation === "Strong Buy"
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-secondary/10 text-secondary",
                )}
              >
                {c.recommendation}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ROI: <span className="font-medium text-foreground">{c.roi}</span>
              </span>
            </div>

            <p className="text-xs text-muted-foreground">{c.outcome}</p>
          </div>
        </motion.article>
      ))}
    </div>
  </LandingSection>
);
