import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import HorseListingCard from "@/components/marketplace/HorseListingCard";
import FilterBar, { MarketFilters, defaultFilters, CountryCode } from "@/components/marketplace/FilterBar";
import { MarketplaceListing, inferListingCurrency } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlaceOfferForm from "@/components/marketplace/PlaceOfferForm";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_MATCHERS: Record<CountryCode, string[]> = {
  UK: ["uk", "united kingdom", "gb", "great britain", "england"],
  IRE: ["ire", "ireland", "irl"],
  FR: ["fr", "france", "fra"],
  USA: ["usa", "us", "united states", "america"],
  AUS: ["aus", "australia", "au"],
};

const PUBLIC_LISTING_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "horse_name",
  "reference_code",
  "date_of_birth",
  "sex",
  "breed",
  "sire",
  "dam",
  "dam_sire",
  "consignor_name",
  "country",
  "guide_price",
  "offers_close_at",
  "status",
  "description_html",
  "pedigree_json",
  "report_pdf_url",
  "video_url",
  "photos",
  "created_by",
  "category",
  "colour",
  "cob",
  "bonus_schemes",
  "x_rays_available",
  "scoping_video_available",
  "repository_url",
  "sire_notes_html",
  "first_dam_notes_html",
  "second_dam_notes_html",
  "third_dam_notes_html",
  "auction_sale_name",
  "sale_stage",
].join(",");

const matchesCountry = (listingCountry: string | null, selected: CountryCode[]) => {
  if (selected.length === 0) return true;
  if (!listingCountry) return false;
  const lc = listingCountry.toLowerCase().trim();
  return selected.some((code) => COUNTRY_MATCHERS[code].includes(lc));
};

export default function HorsesForSale() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [offerStats, setOfferStats] = useState<Record<string, { count: number; highest: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MarketFilters>(defaultFilters);
  const [activeOffer, setActiveOffer] = useState<MarketplaceListing | null>(null);
  const [sortBy, setSortBy] = useState<"lot" | "price_asc" | "price_desc" | "newest">("lot");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketplace_listings_public" as any)
        .select(PUBLIC_LISTING_COLUMNS)
        .in("status", ["active", "sold"])
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as MarketplaceListing[];
      setListings(rows);
      // Load offer stats per listing in parallel
      const stats: Record<string, { count: number; highest: number }> = {};
      await Promise.all(
        rows.map(async (l) => {
          const { data: offers } = await supabase.rpc("get_public_offers", { _listing_id: l.id });
          const arr = (offers ?? []) as { amount: number }[];
          stats[l.id] = {
            count: arr.length,
            highest: arr.reduce((m, o) => Math.max(m, o.amount), 0),
          };
        })
      );
      setOfferStats(stats);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const out = listings.filter((l) => {
      if (filters.status !== "all" && l.status !== filters.status) return false;
      if (filters.sex !== "all" && l.sex !== filters.sex) return false;
      if (!matchesCountry(l.country, filters.countries)) return false;
      if (filters.category !== "all" && (l as any).category !== filters.category) return false;
      const price = offerStats[l.id]?.highest || l.guide_price || 0;
      if (filters.priceMin && price < Number(filters.priceMin)) return false;
      if (filters.priceMax && price > Number(filters.priceMax)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [l.horse_name, l.sire, l.dam, l.reference_code, l.consignor_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const priceOf = (l: MarketplaceListing) => offerStats[l.id]?.highest || l.guide_price || 0;
    const sorted = [...out];
    if (sortBy === "lot") sorted.sort((a, b) => {
      const lotA = Number(a.reference_code?.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
      const lotB = Number(b.reference_code?.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
      return lotA - lotB;
    });
    else if (sortBy === "price_asc") sorted.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === "price_desc") sorted.sort((a, b) => priceOf(b) - priceOf(a));
    else if (sortBy === "newest") sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted;
  }, [listings, filters, offerStats, sortBy]);

  return (
    <div className="dashboard-light min-h-screen bg-background flex flex-col">
      <SEO path="/horses-for-sale" title="Sales — BloodstockAI" description="Private treaty horse sales powered by BloodstockAI intelligence. Browse listings with full pedigree, performance and verified market data." />
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <section className="relative mb-10 overflow-hidden rounded-2xl border border-border/60 bg-foreground px-5 py-12 text-center text-background sm:px-10 sm:py-16">
            <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-secondary" />
            <p className="marketplace-hero-eyebrow text-[11px] font-bold uppercase tracking-[0.22em]">BloodstockAI Marketplace</p>
            <h1 className="marketplace-hero-title mt-4 text-4xl font-bold tracking-[-0.035em] md:text-5xl">
              Horses for Sale
            </h1>
            <p className="marketplace-hero-copy mx-auto mt-5 max-w-2xl text-sm leading-7 sm:text-base">
              Browse private sales with pedigree, physical and market intelligence already connected to every horse.
              Compare the evidence, review the complete profile and submit a confidential offer in your preferred currency.
            </p>
          </section>

          <div className="mb-8">
            <FilterBar filters={filters} onChange={setFilters} />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[220px] bg-card border border-border/40 rounded-[10px] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/50 rounded-lg">
              <p className="text-foreground text-lg">No horses listed at the moment.</p>
              <p className="text-muted-foreground text-sm mt-2">Check back soon — new lots are added regularly.</p>
              <Button variant="outline" className="mt-5" onClick={() => setFilters(defaultFilters)}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">{filtered.length}</span> {filtered.length === 1 ? "horse" : "horses"} listed
                </p>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lot">Lot number</SelectItem>
                    <SelectItem value="price_asc">Price: low to high</SelectItem>
                    <SelectItem value="price_desc">Price: high to low</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((l) => (
                <HorseListingCard
                  key={l.id}
                  listing={l}
                  highestOffer={offerStats[l.id]?.highest || undefined}
                  offerCount={offerStats[l.id]?.count || 0}
                  onPlaceOffer={setActiveOffer}
                />
              ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!activeOffer} onOpenChange={(o) => !o && setActiveOffer(null)}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Place Offer — {activeOffer?.horse_name}</DialogTitle>
          </DialogHeader>
          {activeOffer && (
            <PlaceOfferForm
              listingId={activeOffer.id}
              minOffer={offerStats[activeOffer.id]?.highest || activeOffer.guide_price || 0}
              defaultCurrency={inferListingCurrency(activeOffer)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}