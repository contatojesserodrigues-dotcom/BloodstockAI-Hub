import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FinalCTASection = () => (
  <section className="relative py-24 md:py-32 bg-background overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,hsl(43_76%_48%_/_0.08),transparent)] pointer-events-none" />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative text-center max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2
          className="font-semibold tracking-tight text-foreground mb-5"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
        >
          The next lot could define your season. Know more before you bid.
        </h2>
        <p className="text-muted-foreground text-base md:text-lg font-normal leading-relaxed mb-10">
          Whether you&apos;re assessing one horse or managing an international portfolio,
          BloodstockAI turns complex evidence into a clear commercial decision — before the market
          moves.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[hsl(var(--navy-deep))] text-white hover:bg-[hsl(var(--navy-light))] rounded-lg px-8"
            >
              Explore Platform
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-lg px-8">
              Book a Demo
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);
