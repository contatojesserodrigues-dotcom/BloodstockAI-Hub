import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROI_BENEFITS } from "@/data/landing";
import { LandingSection } from "./LandingSection";

const efficiencyData = [
  { month: "Jan", before: 12, after: 28 },
  { month: "Feb", before: 14, after: 32 },
  { month: "Mar", before: 11, after: 35 },
  { month: "Apr", before: 15, after: 38 },
  { month: "May", before: 13, after: 42 },
  { month: "Jun", before: 16, after: 48 },
];

export const ROISection = () => (
  <LandingSection
      dark
      eyebrow="Return on Intelligence"
      title="Every Better Decision Has Value."
      subtitle="One better buying decision can save significantly more than the annual platform subscription."
      className="overflow-hidden"
    >
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          {ROI_BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-colors"
            >
              <p className="text-secondary text-lg font-light mb-1">{b.metric}</p>
              <p className="text-sm font-medium text-white mb-1">{b.title}</p>
              <p className="text-xs text-white/50">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Efficiency Gain</p>
          <p className="text-xl font-light text-white mb-6">Horses evaluated per week</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={efficiencyData}>
                <defs>
                  <linearGradient id="afterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(43 76% 48%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(43 76% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 11%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="before" stroke="rgba(255,255,255,0.25)" fill="transparent" strokeWidth={1.5} name="Before" />
                <Area type="monotone" dataKey="after" stroke="hsl(43 76% 48%)" fill="url(#afterGrad)" strokeWidth={2} name="With BloodstockAI" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-sm text-white/60 leading-relaxed font-light">
            BloodstockAI does not sell features. It sells better decisions — reducing risk, accelerating
            evaluation, and giving professionals the confidence to act when opportunity appears.
          </p>
        </motion.div>
      </div>
    </LandingSection>
);
