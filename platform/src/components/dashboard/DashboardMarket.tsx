import { useState } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, Download } from "lucide-react";
import { useMarketInsights } from "@/integrations/supabase/hooks/useMarketInsights";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/UpgradeModal";
import { MarketNewsFeed } from "@/components/dashboard/MarketNewsFeed";
import { generateMarketReportPDF, downloadPdf } from "@/utils/professionalPdfReport";

export const DashboardMarket = () => {
  const { data: insights, isLoading, refetch } = useMarketInsights();
  const { isPaidPlan } = useCredits();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { gate, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const handleRefresh = () => {
    if (gate("market")) return;
    refetch();
  };

  const handleDownload = async () => {
    if (!insights || !isPaidPlan) { setShowUpgrade(true); return; }
    const doc = await generateMarketReportPDF(insights);
    downloadPdf(doc, "Market_Intelligence", "Market");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Market Intelligence</h2>
          <p className="text-sm text-muted-foreground">AI-powered market analysis and trends</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline" className="w-full sm:w-auto">
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {/* Industry Headlines */}
      <MarketNewsFeed />

      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : insights ? (
        <>

          {/* Download Report Button */}
          <Card className="border-secondary/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Download Full Market Report</p>
                <p className="text-xs text-muted-foreground">Comprehensive PDF with all analysis data</p>
              </div>
              <Button onClick={handleDownload} className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Download Professional Report
              </Button>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {insights.insights && (
            <>
              {insights.insights.market_trends && (
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl">Market Trends</CardTitle>
                    <CardDescription>AI-powered market analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
                    <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium mb-2">Overall Trend</p>
                      <p className="text-sm md:text-base text-foreground">
                        {insights.insights.market_trends.overall_trend}
                      </p>
                    </div>

                    {insights.insights.market_trends.hot_bloodlines &&
                      insights.insights.market_trends.hot_bloodlines.length > 0 && (
                        <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-2">Hot Bloodlines</p>
                          <div className="flex flex-wrap gap-2">
                            {insights.insights.market_trends.hot_bloodlines.map((bloodline: string, i: number) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-xs sm:text-sm"
                              >
                                {bloodline}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {insights.insights.market_trends.value_opportunities &&
                      insights.insights.market_trends.value_opportunities.length > 0 && (
                        <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-2">Value Opportunities</p>
                          <ul className="space-y-1.5">
                            {insights.insights.market_trends.value_opportunities.map((opp: string, i: number) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{opp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}


              {insights.insights.predictions && (
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-lg md:text-xl">Market Predictions</CardTitle>
                    <CardDescription>AI-generated market forecasts</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
                    {insights.insights.predictions.short_term && (
                      <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                        <p className="text-sm font-medium mb-2">Short-term Outlook</p>
                        <p className="text-sm text-foreground">
                          {insights.insights.predictions.short_term}
                        </p>
                      </div>
                    )}

                    {insights.insights.predictions.long_term && (
                      <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                        <p className="text-sm font-medium mb-2">Long-term Forecast</p>
                        <p className="text-sm text-foreground">
                          {insights.insights.predictions.long_term}
                        </p>
                      </div>
                    )}

                    {insights.insights.predictions.recommendations &&
                      insights.insights.predictions.recommendations.length > 0 && (
                        <div className="p-3 md:p-4 rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-2">Recommendations</p>
                          <ul className="space-y-1">
                            {insights.insights.predictions.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm text-foreground">
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No market data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
