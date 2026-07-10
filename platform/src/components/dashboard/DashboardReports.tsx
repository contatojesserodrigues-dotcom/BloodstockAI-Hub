import { useState } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, ShoppingCart, CheckCircle2, FileText } from "lucide-react";
import { usePublishedReports, useUserPurchases, usePurchaseReport } from "@/integrations/supabase/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useCredits } from "@/hooks/useCredits";
import keenelandLogo from "@/assets/auction-houses/keeneland.png";
import magicMillionsLogo from "@/assets/auction-houses/magic-millions.png";
import goffsLogo from "@/assets/auction-houses/goffs.png.asset.json";
import tattersallsIELogo from "@/assets/auction-houses/tattersalls-ie.png";
import tattersallsUKLogo from "@/assets/auction-houses/tattersalls-uk.png";

const auctionHouses = [
  { id: "keeneland", name: "Keeneland", logo: keenelandLogo, url: "https://www.keeneland.com" },
  { id: "magic_millions", name: "Magic Millions", logo: magicMillionsLogo, url: "https://www.magicmillions.com.au" },
  { id: "goffs", name: "Goffs", logo: goffsLogo.url, url: "https://www.goffs.com" },
  { id: "tattersalls_ie", name: "Tattersalls Ireland", logo: tattersallsIELogo, url: "https://www.tattersalls.ie" },
  { id: "tattersalls_uk", name: "Tattersalls UK", logo: tattersallsUKLogo, url: "https://www.tattersalls.com" },
];

const reportTypes = [
  { value: "auction", label: "Auction Analysis" },
  { value: "pedigree", label: "Pedigree Report" },
  { value: "performance", label: "Performance Analysis" },
  { value: "trends", label: "Market Trends" },
];

export const DashboardReports = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedAuction, setSelectedAuction] = useState<string>("");

  const { data: reports, isLoading } = usePublishedReports({
    searchQuery: searchQuery || undefined,
    reportType: selectedType || undefined,
    auctionHouse: selectedAuction || undefined,
    freeOnly: true,
  });

  const { data: purchases } = useUserPurchases(user?.id);
  const { mutate: purchaseReport, isPending: isPurchasing } = usePurchaseReport();

  const { isPremium, isSuperAdmin } = useUserRole();
  const { plan } = useCredits();
  const isPaidSubscriber = isSuperAdmin || ['starter', 'pro', 'enterprise'].includes(plan);
  const isPremiumPlan = isPaidSubscriber;
  const purchasedReportIds = new Set(purchases?.map(p => p.report_id) || []);
  const { gate, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const hasAccess = (reportId: string) => {
    return isPremiumPlan || purchasedReportIds.has(reportId);
  };

  const handlePurchase = (reportId: string, price: number) => {
    if (gate("reports")) return;
    purchaseReport({ reportId, price });
  };

  const handleDownload = async (pdfUrl: string, title: string) => {
    if (gate("reports")) return;
    try {
      // If it's a public path (starts with reports/), open directly
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

  return (
    <div className="space-y-4 md:space-y-6">
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
      {/* Search and Filters */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Search Reports</CardTitle>
          <CardDescription className="text-sm">
            Find specific reports by title, date, or type
            {isPremiumPlan && (
              <Badge variant="default" className="ml-2">Unlimited Access</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Types</SelectItem>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedAuction} onValueChange={setSelectedAuction}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Auction House" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Houses</SelectItem>
                  {auctionHouses.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Weekly Reports</CardTitle>
          <CardDescription className="text-sm">
            Professional analysis and insights from top auction houses
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {/* Breeze-Up Analysis Report */}
          <div className="grid gap-4 mb-6">
            <div className="border rounded-lg p-4 hover:border-primary transition-colors bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base">Breeze-Up Analysis</h3>
                      <Badge variant="secondary" className="text-xs">Report</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Breeze-Up evaluation combining visual biomechanics analysis with pedigree research and market valuation.</p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto flex-shrink-0"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/samples/BloodstockAI_BreezeUp_Analysis.pdf";
                    a.download = "";
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Global Sales Intelligence Report - Free Copy */}
            <div className="border rounded-lg p-4 hover:border-primary transition-colors bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base">Global Sales Intelligence Report April 2026</h3>
                      <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">FREE</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Comprehensive global bloodstock market intelligence for April 2026 covering UK, IRE, USA and AUS sales data and trends.</p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto flex-shrink-0"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/reports/BloodstockAI_April2026_Market_Intelligence_Report.pdf";
                    a.download = "";
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Free
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reports found</p>
              <p className="text-sm">Try adjusting your search filters</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const userHasAccess = hasAccess(report.id);
                const reportType = reportTypes.find(t => t.value === report.report_type);
                const auctionHouse = auctionHouses.find(h => h.id === report.auction_house);

                return (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    {/* Mobile: stacked layout */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start gap-3">
                          {report.cover_image_url && (
                            <img
                              src={report.cover_image_url}
                              alt={report.title}
                              className="w-16 h-22 sm:w-20 sm:h-28 object-cover rounded border flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base sm:text-lg">{report.title}</h3>
                              {userHasAccess && (
                                <Badge variant="default">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Access
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {reportType && (
                                <Badge variant="secondary" className="text-xs">{reportType.label}</Badge>
                              )}
                              {auctionHouse && (
                                <Badge variant="outline" className="text-xs">{auctionHouse.name}</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {new Date(report.published_at).toLocaleDateString()}
                              </Badge>
                            </div>
                            {report.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Price + Action */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                        {!isPremiumPlan && !userHasAccess && report.price != null && (
                          <div className="text-left sm:text-right">
                            <p className="text-xl sm:text-2xl font-bold text-primary">${report.price.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">One-time purchase</p>
                          </div>
                        )}
                        
                        {userHasAccess ? (
                          <Button
                            onClick={() => handleDownload(report.pdf_url, report.title)}
                            variant="default"
                            className="w-full sm:w-auto"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePurchase(report.id, report.price)}
                            disabled={isPurchasing}
                            variant="default"
                            className="w-full sm:w-auto"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Purchase
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Upgrade CTA */}
      {!isPremiumPlan && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Upgrade to Starter</CardTitle>
            <CardDescription className="text-sm">
              Get unlimited access to all reports starting at $99/month
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Professional Plan Benefits:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Unlimited report downloads</li>
                  <li>✓ Weekly new reports</li>
                  <li>✓ Market Insights</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent w-full sm:w-auto" onClick={() => window.location.href = "/pricing"}>
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
