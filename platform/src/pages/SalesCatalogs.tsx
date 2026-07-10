import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Eye, Loader2, Lock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

type Catalog = {
  id: string;
  title: string;
  subtitle: string;
  auctionHouse: string;
  location: string;
  dates: string;
  price: number;
  currency: string;
  description: string;
  pdfUrl: string;
  previewImages: string[];
  highlights: string[];
  packageFiles?: { label: string; url: string }[];
  soldOut?: boolean;
};

const catalogs: Catalog[] = [
  {
    id: "obs-june-2026",
    title: "OBS June 2026",
    subtitle: "Two-Year-Olds & Horses of Racing Age",
    auctionHouse: "Ocala Breeders' Sales",
    location: "Ocala, Florida, USA",
    dates: "June 2026",
    price: 129,
    currency: "USD",
    description: "Lot-by-lot pedigree, performance and commercial intelligence for one of the season's final major breeze-up opportunities.",
    pdfUrl: "/reports/BloodstockAI_OBS_June_2026_Report.pdf",
    previewImages: ["/catalog-previews/obs-june-2026-01.jpg", "/catalog-previews/obs-june-2026-02.jpg"],
    highlights: ["Pedigree scores", "Breeze-up indicators", "Market estimates", "Shortlist recommendations"],
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_OBS_June_2026_Spreadsheet.pdf" },
    ],
  },
  {
    id: "goffs-london-2026",
    title: "Goffs London Sale 2026",
    subtitle: "Eve of Royal Ascot",
    auctionHouse: "Goffs",
    location: "London, United Kingdom",
    dates: "June 2026",
    price: 129,
    currency: "USD",
    description: "Concise intelligence on elite racehorses and international prospects offered on the eve of Royal Ascot.",
    pdfUrl: "/reports/BloodstockAI_Goffs_London_2026_Report.pdf",
    previewImages: ["/catalog-previews/goffs-london-2026-01.jpg", "/catalog-previews/goffs-london-2026-02.jpg"],
    highlights: ["Race performance", "Pedigree depth", "Commercial profile", "Value opportunities"],
  },
  {
    id: "arqana-summer-2026",
    title: "Arqana Summer Sale 2026",
    subtitle: "Flat & National Hunt prospects",
    auctionHouse: "Arqana",
    location: "Deauville, France",
    dates: "June 2026",
    price: 129,
    currency: "USD",
    description: "Complete analysis of Flat, National Hunt and breeding prospects, with a dedicated black-type opportunity spotlight.",
    pdfUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
    previewImages: ["/catalog-previews/arqana-summer-2026-01.png", "/catalog-previews/arqana-summer-2026-02.png"],
    highlights: ["Black-type spotlight", "Pedigree scores", "Market tiers", "Lot spreadsheet"],
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf" },
      { label: "Black-Type Spotlight (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_BlackType_Spotlight.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Arqana_Summer_2026_Spreadsheet.pdf" },
    ],
  },
  {
    id: "tatts-derby-2026",
    title: "Tattersalls Ireland Derby Sale 2026",
    subtitle: "Selected National Hunt stores",
    auctionHouse: "Tattersalls Ireland",
    location: "Fairyhouse, Ireland",
    dates: "June 2026",
    price: 129,
    currency: "USD",
    description: "Professional analysis of the Derby Sale's National Hunt store horses, combining pedigree depth and commercial indicators.",
    pdfUrl: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf",
    previewImages: ["/catalog-previews/tatts-derby-2026-01.png", "/catalog-previews/tatts-derby-2026-02.png"],
    highlights: ["NH pedigree intelligence", "Physical profile", "Market estimate", "Professional shortlist"],
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Derby_Sale_2026_Spreadsheet.pdf" },
    ],
  },
  {
    id: "tatts-breezeup-2026",
    title: "Tattersalls Breeze-Up 2026",
    subtitle: "Two-Year-Olds in training",
    auctionHouse: "Tattersalls",
    location: "Newmarket, United Kingdom",
    dates: "April 2026",
    price: 129,
    currency: "USD",
    description: "Integrated pedigree and breeze-up assessment designed to surface athletic potential and commercial value.",
    pdfUrl: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf",
    previewImages: ["/catalog-previews/tatts-breezeup-2026-01.jpg", "/catalog-previews/tatts-breezeup-2026-02.jpg"],
    highlights: ["Breeze-up assessment", "Pedigree intelligence", "Risk flags", "Value ranking"],
  },
  {
    id: "goffs-breezeup-2026",
    title: "Goffs Classic Breeze-Up 2026",
    subtitle: "Selected Two-Year-Olds",
    auctionHouse: "Goffs",
    location: "Naas, Ireland",
    dates: "May 2026",
    price: 129,
    currency: "USD",
    description: "Full lot-by-lot intelligence for the Classic Breeze-Up, with pedigree, athletic and market scorecards.",
    pdfUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf",
    previewImages: ["/catalog-previews/goffs-breezeup-2026-01.png", "/catalog-previews/goffs-breezeup-2026-02.png"],
    highlights: ["Lot scorecards", "Breeze indicators", "Pedigree analysis", "Market opportunities"],
    packageFiles: [
      { label: "Full Analyzed Catalog (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf" },
      { label: "Lot-by-Lot Score Spreadsheet (PDF)", url: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Spreadsheet.pdf" },
    ],
  },
];

type UpcomingCatalog = {
  date: string;
  country: string;
  flag: string;
  name: string;
  location: string;
  category: string;
};

const upcomingCatalogs: UpcomingCatalog[] = [
  { date: "7–9 Jul", country: "United Kingdom", flag: "🇬🇧", name: "Tattersalls July Sale", location: "Newmarket, UK", category: "HIT, Broodmares, Fillies, Breeding Stock" },
  { date: "13 Jul", country: "Japan", flag: "🇯🇵", name: "JRHA Select Sale – Yearlings", location: "Hokkaido, Japan", category: "Yearlings" },
  { date: "14 Jul", country: "Japan", flag: "🇯🇵", name: "JRHA Select Sale – Foals", location: "Hokkaido, Japan", category: "Foals" },
  { date: "14 Jul", country: "United States", flag: "🇺🇸", name: "Fasig-Tipton July Sale", location: "Lexington, Kentucky, USA", category: "Selected Yearlings & Horses of Racing Age" },
  { date: "20–21 Jul", country: "Japan", flag: "🇯🇵", name: "Hokkaido Selection Sale", location: "Hokkaido, Japan", category: "Yearlings" },
  { date: "23 Jul", country: "Ireland", flag: "🇮🇪", name: "Goffs Summer Sale", location: "Kildare, Ireland", category: "NH Stores, HIT, Point-to-Pointers, Breeding Stock" },
];

export default function SalesCatalogs() {
  const { user } = useAuth();
  const access = useFeatureAccess();
  const [active, setActive] = useState<Catalog | null>(null);
  const [previewOpen, setPreviewOpen] = useState<Catalog | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedCatalogEmails = new Set(["contarojesserodrigues@gmail.com"]);
  const canDownloadCatalogs =
    access.canDownloadPDF || allowedCatalogEmails.has((user?.email ?? "").trim().toLowerCase());

  const catalogFiles = (catalog: Catalog) =>
    catalog.packageFiles?.length
      ? catalog.packageFiles
      : [{ label: "Full Analyzed Catalog (PDF)", url: catalog.pdfUrl }];

  const handleDownloadCatalog = (catalog: Catalog) => {
    catalogFiles(catalog).forEach((file, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = file.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = file.url.split("/").pop() || "BloodstockAI_Catalog.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 150);
    });
  };

  const handleBuy = async () => {
    if (!active) return;
    setError(null);
    if (fullName.trim().length < 2) { setError("Please enter your full name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email"); return; }
    if (allowedCatalogEmails.has(email.trim().toLowerCase())) {
      handleDownloadCatalog(active);
      setActive(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("purchase-catalog", {
        body: { catalogId: active.id, full_name: fullName.trim(), email: email.trim().toLowerCase() },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("Could not start checkout");
    } catch (e: any) {
      setError(e?.message || "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-theme min-h-screen bg-white flex flex-col">
      <SEO
        title="Sales Catalogs Analyzed — BloodstockAI"
        description="Browse fully analyzed thoroughbred sales catalogs from major auction houses worldwide. Pedigree, performance and value intelligence for every lot."
        path="/sales-catalogs"
      />

      <Header />

      <main className="flex-1 container mx-auto max-w-5xl px-4 pb-8 pt-28 sm:px-6">
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold !text-[#1C1A14]">Sales Catalogs Analyzed</h1>
            <p className="!text-[#9B8E7A] text-sm sm:text-base">
              Complete BloodstockAI analysis for upcoming auction sales — lot by lot.
            </p>
          </div>

          <div className="grid gap-6">
            {catalogs.map((c) => (
              <article
                key={c.id}
                className="border border-[#E8E0D0] rounded-xl bg-white overflow-hidden hover:border-[#C9A84C] transition-colors"
              >
                <div className="grid md:grid-cols-[260px_1fr] gap-0">
                  {/* Preview cover */}
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(c)}
                    className="relative bg-[#F8F4EA] border-b md:border-b-0 md:border-r border-[#E8E0D0] group"
                  >
                    <img
                      src={c.previewImages[0]}
                      alt={`${c.title} — page preview`}
                      className="w-full h-56 md:h-full object-cover object-top"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center text-white text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100">
                      <Eye className="w-4 h-4 mr-2" /> Preview pages
                    </span>
                    <span className="absolute top-2 left-2 bg-[#C9A84C] text-white text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                      Analyzed
                    </span>
                    {c.soldOut && (
                      <span className="absolute top-2 right-2 bg-[#1C1A14] text-white text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                        Sold Out
                      </span>
                    )}
                  </button>

                  <div className="p-5 sm:p-6 flex flex-col gap-4">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] !text-[#9B8E7A]">
                        {c.auctionHouse} · {c.location}
                      </p>
                      <h2 className="text-lg sm:text-xl font-semibold !text-[#1C1A14] leading-snug">
                        {c.title}
                      </h2>
                      <p className="text-sm !text-[#9B8E7A]">{c.dates}</p>
                    </div>

                    <p className="text-sm !text-[#1C1A14]/80 leading-relaxed">{c.description}</p>

                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm !text-[#1C1A14]/80">
                      {c.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    {c.packageFiles && c.packageFiles.length > 1 && (
                      <div className="rounded-lg bg-[#FFFBF0] border border-[#C9A84C]/40 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] !text-[#9B8E7A] mb-2">
                          Package includes · {c.packageFiles.length} PDFs
                        </p>
                        <ul className="space-y-1">
                          {c.packageFiles.map((f) => (
                            <li key={f.url} className="flex items-center gap-2 text-sm !text-[#1C1A14]">
                              <Download className="w-3.5 h-3.5 !text-[#C9A84C] flex-shrink-0" />
                              <span>{f.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[#E8E0D0]">
                      <div>
                        {c.soldOut ? (
                          <>
                            <p className="text-2xl font-bold !text-[#1C1A14] leading-none uppercase tracking-wider">Sold Out</p>
                            <p className="text-xs !text-[#9B8E7A] mt-1">No longer available</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-bold !text-[#C9A84C] leading-none">${c.price}</p>
                            <p className="text-xs !text-[#9B8E7A] mt-1">
                              One-time · {c.packageFiles && c.packageFiles.length > 1
                                ? `${c.packageFiles.length}-PDF package`
                                : "Full analyzed catalog · PDF"}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          className="border-[#D9D0BE] !text-[#1C1A14] hover:bg-[#F8F4EA] w-full sm:w-auto"
                          onClick={() => setPreviewOpen(c)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Preview
                        </Button>
                        {canDownloadCatalogs ? (
                          <Button
                            className="text-white w-full sm:w-auto"
                            style={{ background: "#C9A84C" }}
                            onClick={() => handleDownloadCatalog(c)}
                          >
                            <Download className="w-4 h-4 mr-2" /> Download full catalog
                          </Button>
                        ) : (
                          <Button
                            className="text-white w-full sm:w-auto"
                            style={{ background: "#C9A84C" }}
                            disabled={c.soldOut}
                            onClick={() => {
                              if (c.soldOut) return;
                              setActive(c);
                              setError(null);
                              setFullName("");
                              setEmail("");
                            }}
                          >
                            <Lock className="w-4 h-4 mr-2" /> {c.soldOut ? "Sold Out" : "Buy full catalog"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Upcoming July catalogs */}
          <div className="mt-12">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold !text-[#1C1A14]">July Sales Calendar</h2>
              <p className="!text-[#9B8E7A] text-sm">
                Analyzed catalogs coming soon for the following upcoming sales.
              </p>
            </div>
            <div className="border border-[#E8E0D0] rounded-xl bg-white overflow-hidden divide-y divide-[#E8E0D0]">
              {upcomingCatalogs.map((u) => (
                <div
                  key={`${u.date}-${u.name}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-[#F8F4EA]/50 transition-colors"
                >
                  <div className="sm:w-28 flex-shrink-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] !text-[#C9A84C] font-semibold">
                      {u.date}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold !text-[#1C1A14]">
                      <span className="mr-1.5">{u.flag}</span>
                      {u.name}
                    </p>
                    <p className="text-xs !text-[#9B8E7A] mt-0.5">{u.location}</p>
                    <p className="text-xs !text-[#1C1A14]/70 mt-1">{u.category}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F8F4EA] !text-[#9B8E7A] border border-[#E8E0D0]">
                      Coming Soon
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Preview modal */}
      <Dialog open={!!previewOpen} onOpenChange={(o) => !o && setPreviewOpen(null)}>
        <DialogContent className="sm:max-w-3xl bg-white border-[#E8E0D0] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="!text-[#1C1A14]">{previewOpen?.title}</DialogTitle>
            <DialogDescription className="!text-[#9B8E7A]">
              Preview · first 2 pages — full catalog includes every lot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            {previewOpen?.previewImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Page ${i + 1} preview`}
                className="w-full h-auto rounded border border-[#E8E0D0] shadow-sm"
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="text-white w-full sm:w-auto sm:ml-auto"
              style={{ background: "#C9A84C" }}
              onClick={() => {
                if (!previewOpen) return;
                if (canDownloadCatalogs) {
                  handleDownloadCatalog(previewOpen);
                  return;
                }
                setActive(previewOpen);
                setPreviewOpen(null);
              }}
            >
              <Download className="w-4 h-4 mr-2" /> {canDownloadCatalogs ? "Download full catalog" : `Buy full catalog — $${previewOpen?.price}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy modal */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-md bg-white border-[#E8E0D0]">
          <DialogHeader>
            <DialogTitle className="!text-[#1C1A14]">Complete your purchase</DialogTitle>
            <DialogDescription className="!text-[#9B8E7A]">
              {active?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-[#FFFBF0] border border-[#C9A84C]/40 p-3 text-sm flex items-center justify-between">
              <span className="!text-[#1C1A14]">Full analyzed catalog · PDF</span>
              <span className="text-lg font-bold !text-[#C9A84C]">${active?.price}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="!text-[#1C1A14]">Full name</Label>
              <Input
                id="cat-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="border-[#D9D0BE] bg-white !text-[#1C1A14]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-email" className="!text-[#1C1A14]">Email</Label>
              <Input
                id="cat-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-[#D9D0BE] bg-white !text-[#1C1A14]"
              />
              <p className="text-[11px] !text-[#9B8E7A]">We'll send the catalog download link to this email after payment.</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full text-white"
              style={{ background: "#C9A84C" }}
              disabled={loading}
              onClick={handleBuy}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
              ) : active && allowedCatalogEmails.has(email.trim().toLowerCase()) ? (
                <><Download className="w-4 h-4 mr-2" /> Download full catalog</>
              ) : (
                <>Pay ${active?.price} with Revolut</>
              )}
            </Button>
            <p className="text-[11px] !text-[#9B8E7A] text-center">
              Secure payment via Revolut · No account required
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}