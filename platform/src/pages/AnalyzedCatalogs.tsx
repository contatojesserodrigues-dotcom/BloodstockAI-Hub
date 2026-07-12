import { Link } from "react-router-dom";
import { Calendar, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JULY_SALES, type JulySaleStatus } from "@/data/julySales";

const statusBadge = (status: JulySaleStatus) => {
  if (status === "Active") return "bg-emerald-600 text-white";
  if (status === "Ended") return "bg-muted text-muted-foreground";
  return "bg-secondary/15 text-secondary border border-secondary/30";
};

export default function AnalyzedCatalogs() {
  const upcoming = JULY_SALES.filter((s) => s.status === "Coming Soon" || s.status === "Active");
  const completed = JULY_SALES.filter((s) => s.status === "Ended");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Analyzed Catalogs — BloodstockAI"
        description="Upcoming auction catalogues with AI lot-by-lot intelligence. Full analyzed reports available on Market Reports."
        path="/analyzed-catalogs"
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Sale Intelligence</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Analyzed Catalogs</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Lot-by-lot pedigree and commercial intelligence for major international sales. Completed reports are free on{" "}
              <Link to="/reports" className="font-medium text-secondary hover:underline">Market Reports</Link>.
            </p>
          </div>

          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              <h2 className="text-lg font-semibold text-foreground">Upcoming Sales</h2>
            </div>
            <div className="space-y-3">
              {upcoming.map((sale) => (
                <article
                  key={sale.slug}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{sale.flag}</span>
                        <h3 className="text-base font-semibold text-foreground">{sale.name}</h3>
                        <Badge className={`text-[10px] uppercase tracking-wide ${statusBadge(sale.status)}`}>
                          {sale.status === "Coming Soon" ? "Coming Soon" : sale.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {sale.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {sale.location}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{sale.category} · {sale.auctionHouse}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
                      <p className="text-xs text-muted-foreground">{sale.totalLots} lots catalogued</p>
                      <Button variant="outline" size="sm" disabled className="text-xs opacity-70">
                        Analysis in preparation
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {completed.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Recently Completed</h2>
              <div className="space-y-3">
                {completed.map((sale) => (
                  <article
                    key={sale.slug}
                    className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{sale.flag}</span>
                          <h3 className="font-medium text-foreground">{sale.name}</h3>
                          <Badge variant="outline" className="text-[10px]">Report available</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{sale.date} · {sale.location}</p>
                      </div>
                      <Link to="/reports">
                        <Button size="sm" variant="premium" className="text-xs">
                          Download on Market Reports
                        </Button>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
