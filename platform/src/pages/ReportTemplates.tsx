import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Heart, Target, TrendingUp, Library } from "lucide-react";
import logo from "@/assets/logo.png";
import ReportLeadGateModal, {
  triggerReportDownload,
  isAlreadyRegistered,
} from "@/components/ReportLeadGateModal";

const templates = [
  {
    title: "Full Horse Analysis Report",
    description: "Complete professional report covering pedigree, performance, sales history, and AI-driven recommendations (~12 pages).",
    icon: FileText,
    sampleUrl: "/samples/BloodstockAI_Justify_Performance.pdf",
  },
  {
    title: "Broodmare Plan Report",
    description: "Breeding strategy with stallion compatibility, nick ratings, and 3-year plan recommendations.",
    icon: Heart,
    sampleUrl: "/samples/Broodmare_Plan_Rosalba.pdf",
  },
  {
    title: "Lope de Vega — Full Analysis",
    description: "Complete professional analysis of Lope de Vega covering pedigree, stallion statistics, progeny performance, and market valuation.",
    icon: TrendingUp,
    sampleUrl: "/samples/Lope_de_Vega_Report.pdf",
  },
  {
    title: "Yearling Analysis Report",
    description: "Unnamed horse and yearling evaluation based on pedigree, siblings, and market positioning.",
    icon: Target,
    sampleUrl: "/samples/BloodstockAI_Yearling_Analysis_Report.pdf",
  },
  {
    title: "Auction Catalogue Processing Report",
    description: "Full catalogue processing example — Magic Millions Gold Coast 2026. Hip-by-hip pedigree, performance, and market analysis across the entire sale.",
    icon: Library,
    sampleUrl: "/samples/BloodstockAI_GoldCoast2026_FullReport.pdf",
  },
];

export default function ReportTemplates() {
  const [gateOpen, setGateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<{ title: string; url: string } | null>(null);

  const handleDownloadClick = (title: string, url: string) => {
    if (isAlreadyRegistered()) {
      triggerReportDownload(url);
      return;
    }
    setActiveTemplate({ title, url });
    setGateOpen(true);
  };

  return (
    <div className="report-theme min-h-screen bg-white">
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

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        {/* Page Title */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold !text-[#1C1A14]">
            See what BloodstockAI can generate for your horses
          </h1>
          <p className="!text-[#9B8E7A] text-sm sm:text-base max-w-2xl mx-auto">
            Download free sample reports and explore the power of AI-driven bloodstock analysis
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.title}
                className="group border border-[#E8E0D0] rounded-xl bg-white hover:border-[#C9A84C]/50 transition-all duration-300 hover:shadow-lg p-5 flex flex-col relative"
              >
                {/* FREE SAMPLE badge */}
                {template.sampleUrl && (
                  <span className="absolute top-3 right-3 rt-badge-auction text-xs font-semibold px-2 py-0.5 rounded">
                    FREE SAMPLE
                  </span>
                )}

                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-[#F0EBE0] flex items-center justify-center mb-4 group-hover:bg-[#E8E0D0] transition-colors">
                  <Icon className="w-6 h-6 !text-[#C9A84C]" />
                </div>

                {/* Content */}
                <h3 className="font-semibold !text-[#1C1A14] text-sm mb-2">{template.title}</h3>
                <p className="text-xs !text-[#9B8E7A] mb-4 flex-1">{template.description}</p>

                {/* Download button */}
                <button
                  className={`w-full mt-auto font-semibold text-sm py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
                    template.sampleUrl
                      ? "rt-btn-download"
                      : "bg-[#F0EBE0] !text-[#9B8E7A] cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (template.sampleUrl) {
                      handleDownloadClick(template.title, template.sampleUrl);
                    }
                  }}
                  disabled={!template.sampleUrl}
                >
                  <Download className="w-4 h-4" />
                  {template.sampleUrl ? "Download Free Sample" : "Coming Soon"}
                </button>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 space-y-4">
          <p className="!text-[#9B8E7A] text-sm">
            Ready to generate real reports for your horses?
          </p>
          <Link to="/dashboard">
            <button className="rt-btn-manage font-medium text-sm py-3 px-8 rounded-md transition-colors uppercase tracking-wider">
              Start Analysis Now
            </button>
          </Link>
        </div>
      </div>

      {activeTemplate && (
        <ReportLeadGateModal
          open={gateOpen}
          onOpenChange={setGateOpen}
          reportTitle={activeTemplate.title}
          fileUrl={activeTemplate.url}
        />
      )}
    </div>
  );
}
