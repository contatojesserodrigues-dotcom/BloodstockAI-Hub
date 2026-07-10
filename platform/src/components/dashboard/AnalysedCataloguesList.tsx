import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMonthlySalesCatalogDownloads } from "@/data/salesCatalogDownloads";

export function AnalysedCataloguesList() {
  const catalogs = getMonthlySalesCatalogDownloads();

  return (
    <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
      {catalogs.map((catalog) => (
        <div
          key={catalog.slug}
          className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/20 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                {catalog.flag} {catalog.title}
              </p>
              {catalog.status === "coming_soon" && (
                <Badge variant="outline" className="text-[10px] h-5 border-secondary/30 text-secondary">
                  Coming soon
                </Badge>
              )}
              {catalog.status === "ended" && !catalog.pdfUrl && (
                <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                  Ended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {catalog.dates} · {catalog.location}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {catalog.pdfUrl ? (
              <>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={catalog.pdfUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-3 h-3 mr-1.5" /> Report
                  </a>
                </Button>
                {catalog.spreadsheetUrl ? (
                  <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                    <a href={catalog.spreadsheetUrl} download target="_blank" rel="noopener noreferrer">
                      Spreadsheet
                    </a>
                  </Button>
                ) : null}
              </>
            ) : (
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link to={`/sales-catalogs?auction=${catalog.slug}`}>
                  View sale
                </Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
