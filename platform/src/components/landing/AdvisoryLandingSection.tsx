import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Gavel, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSection } from "./LandingSection";

export const AdvisoryLandingSection = () => (
  <LandingSection eyebrow="Advisory" title="Self-Service Platform or Professional Advisory.">
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-border/60 bg-white p-8 md:p-10"
      >
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--navy-deep))] flex items-center justify-center mb-6">
          <Layers className="w-6 h-6 text-secondary" />
        </div>
        <h3 className="text-xl font-bold mb-3">Self-Service Platform</h3>
        <p className="text-muted-foreground font-light leading-relaxed mb-6">
          Full access to every module. Upload catalogues, run analyses, generate reports, and manage
          your entire evaluation workflow independently.
        </p>
        <Link to="/pricing">
          <Button variant="outline" className="rounded-lg">
            View Plans <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-light))] p-8 md:p-10 text-white"
      >
        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-6">
          <Gavel className="w-6 h-6 text-secondary" />
        </div>
        <h3 className="text-xl font-bold mb-3">Professional Advisory</h3>
        <p className="text-white/60 font-light leading-relaxed mb-6">
          Work directly with our bloodstock team. Managed shortlists, sale attendance, mating plans,
          and portfolio strategy — backed by the full platform.
        </p>
        <Link to="/advisory">
          <Button className="rounded-lg bg-secondary text-[hsl(var(--navy-deep))] hover:bg-secondary/90">
            Learn About Advisory <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </motion.div>
    </div>
  </LandingSection>
);
