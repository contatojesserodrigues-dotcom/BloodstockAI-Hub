import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, CheckCircle2, FileText, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePublishedReports, useUserPurchases, usePurchaseReport } from "@/integrations/supabase/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCredits } from "@/hooks/useCredits";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";
import ReportLeadGateModal, { isAlreadyRegistered, triggerReportDownload } from "@/components/ReportLeadGateModal";
import { FREE_MARKET_REPORTS } from "@/data/freeMarketReports";
import keenelandLogo from "@/assets/auction-houses/keeneland.png";
import magicMillionsLogo from "@/assets/auction-houses/magic-millions.png";
import goffsLogo from "@/assets/auction-houses/goffs.png.asset.json";
import tattersallsIELogo from "@/assets/auction-houses/tattersalls-ie.png";
import tattersallsUKLogo from "@/assets/auction-houses/tattersalls-uk.png";

const auctionHouses = [
  { id: "keeneland", name: "Keeneland", logo: keenelandLogo },
  { id: "magic_millions", name: "Magic Millions", logo: magicMillionsLogo },
  { id: "goffs", name: "Goffs", logo: goffsLogo.url },
  { id: "tattersalls_ie", name: "Tattersalls Ireland", logo: tattersallsIELogo },
  { id: "tattersalls_uk", name: "Tattersalls UK", logo: tattersallsUKLogo },
  { id: "obs", name: "OBS", logo: null },
  { id: "arqana", name: "Arqana", logo: null },
];

const reportTypes = [
  { value: "auction", label: "Auction Analysis" },
  { value: "pedigree", label: "Pedigree Report" },
  { value: "performance", label: "Performance Analysis" },
  { value: "trends", label: "Market Trends" },
];

const freeReports = FREE_MARKET_REPORTS;

export default function Reports() {
  const { user } = useAuth();
  const { isPremium, isSuperAdmin } = useUserRole();
  const { plan } = useCredits();
  const isPaidSubscriber = isSuperAdmin || ['starter', 'pro', 'enterprise'].includes(plan);
  const isPremiumPlan = isPaidSubscriber;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedAuction, setSelectedAuction] = useState<string>("");
  const [paywallReport, setPaywallReport] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [activeFreeReport, setActiveFreeReport] = useState<(typeof freeReports)[number] | null>(null);
  const { data: reports, isLoading } = usePublishedReports({
    searchQuery: searchQuery || undefined,
    reportType: selectedType || undefined,
    auctionHouse: selectedAuction || undefined,
    paidOnly: true,
  });

  const { data: purchases } = useUserPurchases(user?.id);
  const { mutate: purchaseReport, isPending: isPurchasing } = usePurchaseReport();
  const purchasedReportIds = new Set(purchases?.map(p => p.report_id) || []);

  const isFreeReport = (report: any) => !report.price || report.price === 0;
  const hasAccess = (reportId: string, report?: any) => {
    if (report && isFreeReport(report)) return true;
    return isPremiumPlan || purchasedReportIds.has(reportId);
  };

  const handleReportClick = (report: any) => {
    if (hasAccess(report.id, report)) {
      handleDownload(report.pdf_url, report.title);
    } else {
      setPaywallReport(report);
    }
  };

  const handleDownload = async (pdfUrl: string, title: string) => {
    try {
      if (pdfUrl.startsWith('reports/')) {
        window.open(`/${pdfUrl}`, '_blank');
        return;
      }
      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .createSignedUrl(pdfUrl, 120);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error generating download URL:', err);
    }
  };

  const handleFreeReportClick = (report: (typeof freeReports)[number]) => {
    if (isAlreadyRegistered()) {
      triggerReportDownload(report.fileUrl);
      return;
    }
    setActiveFreeReport(report);
    setGateOpen(true);
  };

  return (
    <div className="report-theme min-h-screen bg-white">
      <SEO
        title="Reports — BloodstockAI Auction & Market Analysis"
        description="Browse ready-made auction catalogue analyses and market reports from Keeneland, Tattersalls, Goffs, Magic Millions and more."
        path="/reports"
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

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold !text-[#1C1A14]">Market Reports</h1>
            <p className="!text-[#9B8E7A] text-sm sm:text-base">
              Weekly analysis and insights from the world's top auction houses
            </p>
          </div>

          {/* Search & Filters */}
          <div className="border border-[#E8E0D0] rounded-xl bg-white p-4 md:p-6 space-y-3">
            <div>
              <h2 className="text-lg md:text-xl font-semibold !text-[#1C1A14]">Search Reports</h2>
              <p className="text-sm !text-[#9B8E7A] mt-1">
                Find specific reports by title, date, or type
                {isPremiumPlan && (
                  <span className="ml-2 inline-flex items-center rt-badge-access text-xs font-semibold px-2 py-0.5 rounded">Unlimited Access</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 !text-[#9B8E7A]" />
                <Input
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-[#D9D0BE] bg-white !text-[#1C1A14] placeholder:!text-[#9B8E7A]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full sm:w-[200px] border-[#D9D0BE] bg-white !text-[#1C1A14]">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Types</SelectItem>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedAuction} onValueChange={setSelectedAuction}>
                  <SelectTrigger className="w-full sm:w-[200px] border-[#D9D0BE] bg-white !text-[#1C1A14]">
                    <SelectValue placeholder="Auction House" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Houses</SelectItem>
                    {auctionHouses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>{house.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="border border-[#E8E0D0] rounded-xl bg-white p-4 md:p-6 space-y-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold !text-[#1C1A14]">Free Reports & Analyzed Catalogs</h2>
              <p className="text-sm !text-[#9B8E7A] mt-1">Enter your name and email once to download — market intelligence and completed sale catalogues</p>
            </div>
            {/* Free featured reports */}
            {freeReports.length > 0 && (
              <div className="grid gap-4">
                {freeReports.map((report) => {
                  const reportType = reportTypes.find(t => t.value === report.report_type);
                  return (
                    <div
                      key={report.id}
                      className="border border-[#C9A84C]/60 rounded-lg p-4 hover:border-[#C9A84C] transition-colors cursor-pointer bg-[#FFFBF0]"
                      onClick={() => handleFreeReportClick(report)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold !text-[#1C1A14] text-base sm:text-lg">{report.title}</h3>
                            <span className="inline-flex items-center bg-[#C9A84C] text-white text-xs font-semibold px-2 py-0.5 rounded">
                              FREE
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {reportType && <span className="rt-badge-auction text-xs px-2 py-0.5 rounded">{reportType.label}</span>}
                            <span className="rt-tag text-xs px-2 py-0.5 rounded">
                              {new Date(report.published_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm !text-[#9B8E7A] line-clamp-2">{report.description}</p>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                          <button className="rt-btn-download font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" />Free Download
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse border border-[#E8E0D0] rounded-lg p-4">
                    <div className="h-4 bg-[#F0EBE0] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-[#F0EBE0] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : !reports || reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 !text-[#9B8E7A] opacity-50" />
                <p className="!text-[#1C1A14]">No reports available yet</p>
                <p className="text-sm !text-[#9B8E7A]">Check back soon for new reports</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {reports.map((report) => {
                  const userHasAccess = hasAccess(report.id, report);
                  const reportType = reportTypes.find(t => t.value === report.report_type);
                  const auctionHouse = auctionHouses.find(h => h.id === report.auction_house);

                  return (
                    <div
                      key={report.id}
                      className="border border-[#E8E0D0] rounded-lg p-4 hover:border-[#C9A84C] transition-colors cursor-pointer bg-white"
                      onClick={() => handleReportClick(report)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-start gap-3">
                            {report.cover_image_url && (
                              <img src={report.cover_image_url} alt={report.title} className="w-16 h-22 sm:w-20 sm:h-28 object-cover rounded border border-[#E8E0D0] flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold !text-[#1C1A14] text-base sm:text-lg">{report.title}</h3>
                                {userHasAccess && (
                                  <span className="inline-flex items-center rt-badge-access text-xs font-semibold px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />Access
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {reportType && <span className="rt-badge-auction text-xs px-2 py-0.5 rounded">{reportType.label}</span>}
                                {auctionHouse && <span className="rt-tag text-xs px-2 py-0.5 rounded">{auctionHouse.name}</span>}
                                <span className="rt-tag text-xs px-2 py-0.5 rounded">
                                  {new Date(report.published_at).toLocaleDateString()}
                                </span>
                              </div>
                              {report.description && (
                                <p className="text-sm !text-[#9B8E7A] line-clamp-2">{report.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                          {userHasAccess ? (
                            <button className="rt-btn-download font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center gap-2">
                              <Download className="w-4 h-4" />{isFreeReport(report) ? 'Free Download' : 'Download'}
                            </button>
                          ) : (
                            <div className="text-right">
                              <p className="text-lg font-bold !text-[#C9A84C]">${report.price?.toFixed(2) ?? '67.00'}</p>
                              <p className="text-xs !text-[#9B8E7A]">One-time</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paywall Modal */}
      <Dialog open={!!paywallReport} onOpenChange={() => setPaywallReport(null)}>
        <DialogContent className="sm:max-w-md bg-white border-[#E8E0D0]">
          <div className="text-center space-y-6 py-4">
            <div className="text-4xl">🐎</div>
            <h2 className="text-xl font-bold !text-[#1C1A14]">BloodstockAI Report</h2>
            <div className="space-y-2">
              <p className="!text-[#9B8E7A]">Unlock this professional report</p>
              <p className="!text-[#9B8E7A]">for a one-time payment of</p>
              <p className="text-3xl font-bold !text-[#C9A84C] mt-2">${paywallReport?.price?.toFixed(2) ?? '67.00'}</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-xs !text-[#9B8E7A] -mt-2">No account required — instant download after payment</p>
              <button
                className="w-full font-medium text-sm py-3 px-4 rounded-md transition-colors disabled:opacity-50 text-white"
                style={{ background: '#C9A84C' }}
                disabled={isRedirecting}
                onClick={async () => {
                  if (!paywallReport) return;
                  setIsRedirecting(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('create-guest-report-payment', {
                      body: { reportId: paywallReport.id },
                    });
                    if (error) throw error;
                    if (data?.checkout_url) {
                      // Use direct navigation to avoid popup blockers
                      window.location.href = data.checkout_url;
                      return;
                    } else if (data?.error) {
                      console.error('Payment error:', data.error);
                      alert(data.error);
                    }
                  } catch (err) {
                    console.error('Failed to create payment:', err);
                    alert('Failed to start payment. Please try again.');
                  } finally {
                    setIsRedirecting(false);
                  }
                }}
              >
                {isRedirecting ? 'Redirecting...' : `Purchase Report — $${paywallReport?.price?.toFixed(0) ?? '67'}`}
              </button>
              <button
                className="w-full !text-[#9B8E7A] hover:!text-[#1C1A14] font-medium text-sm py-3 px-4 rounded-md transition-colors"
                onClick={() => setPaywallReport(null)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activeFreeReport && (
        <ReportLeadGateModal
          open={gateOpen}
          onOpenChange={(o) => {
            setGateOpen(o);
            if (!o) setActiveFreeReport(null);
          }}
          reportTitle={activeFreeReport.title}
          fileUrl={activeFreeReport.fileUrl}
        />
      )}
    </div>
  );
}
