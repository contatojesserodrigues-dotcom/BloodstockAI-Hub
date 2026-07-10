import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Award, DollarSign, Trophy } from "lucide-react";
import { useAnalysisReports } from "@/integrations/supabase/hooks/useAnalysis";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";

export const DashboardAnalytics = () => {
  const { user } = useAuth();
  const { data: reports, isLoading } = useAnalysisReports(user?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Analyses</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">{reports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Completed reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {reports && reports.length > 0
                ? (reports.reduce((acc, r) => acc + (r.performance_score || 0), 0) / reports.length).toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Out of 10.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Avg Pedigree</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {reports && reports.length > 0
                ? (reports.reduce((acc, r) => acc + (r.pedigree_score || 0), 0) / reports.length).toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Out of 10.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Avg Market Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              ${reports && reports.length > 0
                ? Math.round(reports.reduce((acc, r) => acc + (r.market_value_estimate || 0), 0) / reports.length).toLocaleString()
                : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Estimated value</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Recent Analysis Reports</CardTitle>
          <CardDescription>Your latest bloodstock analysis results</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {!reports || reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No analysis reports yet</p>
              <p className="text-sm">Start by uploading catalogs or using the search feature</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm md:text-base">
                          {(report.input_data as any)?.horse_name || "Analysis Report"}
                        </h3>
                        <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Type: {report.analysis_type}
                      </p>
                    </div>
                    {report.status === 'completed' && (
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>

                  {report.status === 'completed' && (
                    <div className="grid grid-cols-3 gap-3 md:gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                        <p className="text-base md:text-lg font-semibold">{report.performance_score || 'N/A'}/10</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pedigree</p>
                        <p className="text-base md:text-lg font-semibold">{report.pedigree_score || 'N/A'}/10</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Value</p>
                        <p className="text-base md:text-lg font-semibold">
                          ${report.market_value_estimate?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {report.recommendations && report.recommendations.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-2">Recommendations:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {report.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
