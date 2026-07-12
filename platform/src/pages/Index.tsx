import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import { SEO } from "@/components/SEO";
import { HeroSection } from "@/components/landing/HeroSection";
import { GlobalTrustSection } from "@/components/landing/GlobalTrustSection";
import { ResultsSection } from "@/components/landing/ResultsSection";
import { ROISection } from "@/components/landing/ROISection";
import { DashboardPreviewSection } from "@/components/landing/DashboardPreviewSection";
import { PlatformModulesSection } from "@/components/landing/PlatformModulesSection";
import { WhoUsesSection } from "@/components/landing/WhoUsesSection";
import { AdvisoryLandingSection } from "@/components/landing/AdvisoryLandingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { InspectionShowcaseSection } from "@/components/landing/InspectionShowcaseSection";
import { LandingChartsSection } from "@/components/landing/LandingChartsSection";
import { UpcomingSales } from "@/components/UpcomingSales";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BloodstockAI — The Intelligence Platform for Thoroughbred Decisions"
        description="Pedigree, biomechanics, performance and market intelligence for buyers, agents, consignors and trainers. Make better bloodstock decisions with confidence."
        path="/"
      />
      <Header />
      <HeroSection />
      <InspectionShowcaseSection />
      <GlobalTrustSection />
      <ResultsSection />
      <ROISection />
      <DashboardPreviewSection />
      <LandingChartsSection />
      <PlatformModulesSection />
      <WhoUsesSection />
      <UpcomingSales />
      <AdvisoryLandingSection />
      <FinalCTASection />
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Index;
