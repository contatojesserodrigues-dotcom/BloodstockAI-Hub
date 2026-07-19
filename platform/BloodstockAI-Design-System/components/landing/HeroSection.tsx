import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./DashboardMockup";

export const HeroSection = () => (
  <section className="relative overflow-hidden bg-background pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-32">
    <div className="absolute inset-0 bg-[var(--gradient-hero)] pointer-events-none" />

    <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-10 sm:gap-14 xl:grid-cols-2 xl:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl xl:max-w-xl"
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-secondary font-medium mb-5">
            Intelligence Platform
          </p>
          <h1 className="mb-7 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-foreground sm:mb-8">
            The Intelligence Platform Behind Better Bloodstock Decisions.
          </h1>
          <p className="mb-8 max-w-[65ch] text-base font-normal leading-[1.75] tracking-[-0.01em] text-muted-foreground md:text-[17px]">
            See risk earlier. Identify upside faster. Buy, sell and train with evidence — not
            instinct alone. Pedigree, biomechanics, inspection and market intelligence in one
            professional platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/dashboard">
              <Button size="lg" variant="premium" className="w-full sm:w-auto gap-1.5">
                Explore Platform
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Book a Demo
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-[11px] font-medium text-muted-foreground">
            One better decision can repay the platform many times over.
          </p>
        </motion.div>

        <DashboardMockup />
      </div>
    </div>
  </section>
);
