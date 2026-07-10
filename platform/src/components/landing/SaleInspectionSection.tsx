import { motion } from "framer-motion";
import { ArrowDown, Camera, FileText, Scan, Upload, Video } from "lucide-react";
import { LandingSection } from "./LandingSection";

const steps = [
  { icon: Camera, label: "Upload Photos" },
  { icon: Video, label: "Upload Videos" },
  { icon: Scan, label: "Computer Vision Analysis" },
  { icon: Upload, label: "Biomechanics Evaluation" },
  { icon: FileText, label: "Conformation Assessment" },
  { icon: FileText, label: "Professional Report" },
];

const metrics = [
  { label: "Skeleton Tracking", value: "Active", pct: 94 },
  { label: "Joint Angles", value: "142° avg", pct: 88 },
  { label: "Stride Length", value: "2.4m", pct: 91 },
  { label: "Balance", value: "Good", pct: 86 },
  { label: "Movement", value: "Fluid", pct: 92 },
  { label: "Conformation", value: "8.7/10", pct: 87 },
];

export const SaleInspectionSection = () => (
  <LandingSection
    eyebrow="Sale Inspection"
    title="Professional Sale Inspection."
    subtitle="From raw footage to institutional-grade inspection reports — powered by computer vision and domain expertise."
    align="left"
  >
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl">
      {/* Flow */}
      <div className="space-y-0">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label}>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 py-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--navy-deep))] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-secondary" />
                </div>
                <p className="text-sm font-medium">{s.label}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="flex justify-start pl-5 py-1">
                  <ArrowDown className="w-4 h-4 text-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Analysis simulation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-border/60 bg-[hsl(var(--navy-deep))] overflow-hidden"
      >
        <div className="aspect-video relative bg-gradient-to-br from-[hsl(var(--navy-light))] to-[hsl(var(--navy-deep))]">
          {/* Skeleton overlay mock */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 225" aria-hidden>
            <line x1="200" y1="60" x2="200" y2="120" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="200" y1="80" x2="160" y2="100" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="200" y1="80" x2="240" y2="100" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="200" y1="120" x2="175" y2="170" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="200" y1="120" x2="225" y2="170" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="175" y1="170" x2="170" y2="210" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            <line x1="225" y1="170" x2="230" y2="210" stroke="hsl(43 76% 48%)" strokeWidth="2" opacity="0.8" />
            {[
              [200, 50],
              [200, 80],
              [160, 100],
              [240, 100],
              [200, 120],
              [175, 170],
              [225, 170],
              [170, 210],
              [230, 210],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="4" fill="hsl(43 76% 48%)" />
            ))}
          </svg>
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur text-[10px] text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Analysing frame 847/1200
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="rounded-lg bg-white/5 border border-white/10 p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">{m.label}</p>
                <p className="text-xs font-medium text-secondary">{m.value}</p>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${m.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                  className="h-full bg-secondary rounded-full"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </LandingSection>
);
