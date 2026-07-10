import { motion } from "framer-motion";
import { USER_PERSONAS } from "@/data/landing";
import { LandingSection } from "./LandingSection";

export const WhoUsesSection = () => (
  <LandingSection
    eyebrow="Who Uses BloodstockAI"
    title="Built for every professional in the bloodstock ecosystem."
  >
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {USER_PERSONAS.map((p, i) => (
        <motion.div
          key={p.role}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-border/60 bg-white p-5 hover:shadow-[0_8px_30px_-12px_hsl(222_47%_11%_/_0.1)] transition-shadow"
        >
          <h3 className="text-sm font-bold text-foreground mb-2">{p.role}</h3>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">{p.desc}</p>
        </motion.div>
      ))}
    </div>
  </LandingSection>
);
