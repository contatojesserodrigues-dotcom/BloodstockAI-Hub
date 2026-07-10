import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Camera,
  Database,
  FileText,
  LineChart,
  Search,
} from "lucide-react";
import { PLATFORM_MODULES } from "@/data/landing";
import { LandingSection } from "./LandingSection";

const icons = [BarChart3, Search, Camera, LineChart, FileText, Database, Brain];

export const PlatformModulesSection = () => (
  <LandingSection
    dark
    eyebrow="Platform"
    title="Every module. One intelligence layer."
    subtitle="Seven integrated modules designed for the complete bloodstock decision workflow."
    className="bg-[hsl(var(--navy-deep))]"
  >
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {PLATFORM_MODULES.map((m, i) => {
        const Icon = icons[i] ?? Brain;
        return (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Icon className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{m.name}</h3>
            <p className="text-sm text-white/50 leading-relaxed font-light">{m.desc}</p>
          </motion.div>
        );
      })}
    </div>
  </LandingSection>
);
