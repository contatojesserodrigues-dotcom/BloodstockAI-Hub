import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardMarket } from "@/components/dashboard/DashboardMarket";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

const MarketUpdate = () => {
  return (
    <div className="report-theme min-h-screen bg-white">
      <SEO
        title="Market Update — Thoroughbred Auction Intelligence"
        description="AI-powered market analysis and trends from Tattersalls, Goffs, Keeneland, Fasig-Tipton and Magic Millions sales cycles."
        path="/market-update"
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Thoroughbred Market Update",
          description: "AI-powered analysis of recent auction results, trends and benchmarks across major bloodstock sales.",
          author: { "@type": "Organization", name: "BloodstockAI" },
          publisher: { "@type": "Organization", name: "BloodstockAI" },
        }}
      />
      {/* Header */}
      <div className="border-b border-[#E8E0D0] bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={logo} alt="BloodstockAI" className="h-10 sm:h-12 w-auto object-contain" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="!text-[#9B8E7A] hover:!text-[#1C1A14] text-xs uppercase tracking-wider">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
        <DashboardMarket />
      </main>

      <Footer />
    </div>
  );
};

export default MarketUpdate;
