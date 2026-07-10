import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import PhotoGallery from "@/components/marketplace/PhotoGallery";
import OfferTracker from "@/components/marketplace/OfferTracker";
import PlaceOfferForm from "@/components/marketplace/PlaceOfferForm";
import CountdownTimer from "@/components/marketplace/CountdownTimer";
import VideoShowcase, { type ShowcaseVideo } from "@/components/marketplace/VideoShowcase";
import HorseIntelligencePanel from "@/components/marketplace/HorseIntelligencePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarketplaceListing, inferListingCurrency, formatLocalMoney, resolveMarketplaceAsset } from "@/types/marketplace";
import { ChevronLeft, ChevronRight, Download, RotateCcw, Share2 } from "lucide-react";
import { SEO } from "@/components/SEO";

const lotNumberFrom = (reference?: string | null) => reference?.match(/\d+/)?.[0] ?? "";

const formatLongDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

const formatCloseDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : null;

const singularCategory = (category?: string | null) => {
  if (!category) return null;
  if (category === "Yearlings") return "Yearling";
  if (category === "Broodmares") return "Broodmare";
  if (category === "Foals") return "Foal";
  if (category === "Weanlings") return "Weanling";
  return category;
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

const DetailRow = ({ label, value, accent = false }: { label: string; value?: React.ReactNode; accent?: boolean }) => (
  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 text-[13px] leading-6 sm:text-sm">
    <dt className="font-bold text-foreground">{label}:</dt>
    <dd className={accent ? "text-secondary" : "text-foreground"}>{value || "—"}</dd>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">
    <h2 className="text-lg font-bold text-foreground">{children}</h2>
    <div className="mt-2 h-px w-full bg-secondary/70" />
  </div>
);

const DottedName = ({ children }: { children?: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-xs text-foreground">
    <span className="shrink-0">{children || "—"}</span>
    <span className="h-px flex-1 border-b border-dotted border-foreground/50" />
  </div>
);

const PedigreeCell = ({ children, className = "", rowSpan }: { children?: React.ReactNode; className?: string; rowSpan?: number }) => (
  <td rowSpan={rowSpan} className={`border border-foreground/60 px-3 py-2 align-middle ${className}`}>
    {children}
  </td>
);

const CataloguePedigreeTable = ({ listing }: { listing: MarketplaceListing }) => {
  const p = (listing.pedigree_json ?? {}) as Record<string, string>;
  const sire = p.sire || listing.sire || "—";
  const dam = p.dam || listing.dam || "—";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse border border-foreground/70 bg-card text-foreground">
        <tbody>
          <tr>
            <PedigreeCell rowSpan={8} className="w-[18%] text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {listing.horse_name}
            </PedigreeCell>
            <PedigreeCell rowSpan={4} className="w-[22%]">
              <div className="text-base font-bold uppercase leading-tight">{sire}</div>
              {p.sire_year && <div className="mt-1 text-xs text-muted-foreground">{p.sire_year}</div>}
            </PedigreeCell>
            <PedigreeCell rowSpan={2} className="w-[25%] text-sm font-medium uppercase">{p.sire_sire || "—"}</PedigreeCell>
            <PedigreeCell className="w-[35%]"><DottedName>{p.sire_sire_sire}</DottedName></PedigreeCell>
          </tr>
          <tr><PedigreeCell><DottedName>{p.sire_sire_dam}</DottedName></PedigreeCell></tr>
          <tr>
            <PedigreeCell rowSpan={2} className="text-sm font-medium uppercase">{p.sire_dam || "—"}</PedigreeCell>
            <PedigreeCell><DottedName>{p.sire_dam_sire}</DottedName></PedigreeCell>
          </tr>
          <tr><PedigreeCell><DottedName>{p.sire_dam_dam}</DottedName></PedigreeCell></tr>
          <tr>
            <PedigreeCell rowSpan={4}>
              <div className="text-base font-bold uppercase leading-tight">{dam}</div>
              {p.dam_year && <div className="mt-1 text-xs text-muted-foreground">{p.dam_year}</div>}
            </PedigreeCell>
            <PedigreeCell rowSpan={2} className="text-sm font-medium uppercase">{p.dam_sire || listing.dam_sire || "—"}</PedigreeCell>
            <PedigreeCell><DottedName>{p.dam_sire_sire}</DottedName></PedigreeCell>
          </tr>
          <tr><PedigreeCell><DottedName>{p.dam_sire_dam}</DottedName></PedigreeCell></tr>
          <tr>
            <PedigreeCell rowSpan={2} className="text-sm font-medium uppercase">{p.dam_dam || "—"}</PedigreeCell>
            <PedigreeCell><DottedName>{p.dam_dam_sire}</DottedName></PedigreeCell>
          </tr>
          <tr><PedigreeCell><DottedName>{p.dam_dam_dam}</DottedName></PedigreeCell></tr>
        </tbody>
      </table>
    </div>
  );
};

export default function HorseListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [lotGroup, setLotGroup] = useState<MarketplaceListing[]>([]);
  const [lotJump, setLotJump] = useState("");
  const [highest, setHighest] = useState<number>(0);
  const [offerCount, setOfferCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("marketplace_listings_public" as any).select(PUBLIC_LISTING_COLUMNS).eq("id", id).maybeSingle();
      const current = (data ?? null) as unknown as MarketplaceListing | null;
      setListing(current);
      setLotJump(lotNumberFrom(current?.reference_code));
      if (current) {
        const { data: group } = await supabase
          .from("marketplace_listings_public" as any)
          .select(PUBLIC_LISTING_COLUMNS)
          .in("status", ["active", "sold"])
          .eq("category", (current as any).category ?? "")
          .order("reference_code", { ascending: true });
        setLotGroup((group ?? []) as unknown as MarketplaceListing[]);
      }
      const { data: offers } = await supabase.rpc("get_public_offers", { _listing_id: id });
      const arr = (offers ?? []) as { amount: number }[];
      setHighest(arr.reduce((m, o) => Math.max(m, o.amount), 0));
      setOfferCount(arr.length);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-light min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="h-96 bg-card animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="dashboard-light min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl text-foreground">Listing not found</h1>
          <Button asChild variant="outline" className="mt-6"><Link to="/horses-for-sale">Back to listings</Link></Button>
        </div>
      </div>
    );
  }

  const minOffer = Math.max(highest, listing.guide_price || 0);
  const isSold = listing.status === "sold";
  const lotNumber = lotNumberFrom(listing.reference_code);
  const category = (listing as any).category as string | undefined;
  const typeLabel = singularCategory(category) || listing.breed;
  const hasSaleHeader = Boolean(listing.auction_sale_name && listing.sale_stage !== "private_treaty");
  const currentIndex = lotGroup.findIndex((item) => item.id === listing.id);
  const previousListing = currentIndex > 0 ? lotGroup[currentIndex - 1] : null;
  const nextListing = currentIndex >= 0 && currentIndex < lotGroup.length - 1 ? lotGroup[currentIndex + 1] : null;
  const vetLines = listing.x_rays_available || listing.scoping_video_available || listing.repository_url;
  const damNoteBlocks = [listing.first_dam_notes_html, listing.second_dam_notes_html, listing.third_dam_notes_html, listing.description_html].filter(Boolean);
  const localCurrency = inferListingCurrency(listing);
  const formatLocal = (n?: number | null) => formatLocalMoney(n, localCurrency);
  const reportUrl = resolveMarketplaceAsset(listing.report_pdf_url);
  const extraVideos: ShowcaseVideo[] = Array.isArray((listing.pedigree_json as any)?.videos)
    ? ((listing.pedigree_json as any).videos as ShowcaseVideo[])
    : [];

  const jumpToLot = () => {
    const target = lotGroup.find((item) => lotNumberFrom(item.reference_code) === lotJump.trim());
    if (target) navigate(`/horses-for-sale/${target.id}`);
  };

  const shareListing = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: listing.horse_name, url });
    else await navigator.clipboard.writeText(url);
  };

  return (
    <div className="dashboard-light min-h-screen bg-background flex flex-col">
      <SEO path={`/horses-for-sale/${listing.id}`} title={`${listing.horse_name} — Lot ${lotNumber || listing.reference_code || "Listing"} | BloodstockAI`} description={`${listing.horse_name} — ${typeLabel ?? "horse listing"}. ${listing.sire ?? ""} × ${listing.dam ?? ""}.`} />
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6 space-y-6">
          {hasSaleHeader && (
            <section className="border border-border/60 bg-card rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">{listing.auction_sale_name}</h1>
                {isSold ? (
                  <Badge variant="outline" className="shrink-0 border-muted-foreground/40 text-muted-foreground">SOLD</Badge>
                ) : listing.status === "withdrawn" ? (
                  <Badge variant="outline" className="shrink-0 border-muted-foreground/40 text-muted-foreground">WITHDRAWN</Badge>
                ) : (
                  <Badge className="shrink-0 bg-secondary text-secondary-foreground">PRE-SALE</Badge>
                )}
              </div>
              <div className="mt-4 h-px w-full bg-secondary/70" />
            </section>
          )}

          {hasSaleHeader && (
            <nav className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <Button asChild={Boolean(previousListing)} variant="outline" size="sm" disabled={!previousListing}>
                  {previousListing ? <Link to={`/horses-for-sale/${previousListing.id}`}><ChevronLeft className="h-4 w-4" /> Previous</Link> : <span><ChevronLeft className="h-4 w-4" /> Previous</span>}
                </Button>
                <Button asChild={Boolean(nextListing)} variant="outline" size="sm" disabled={!nextListing}>
                  {nextListing ? <Link to={`/horses-for-sale/${nextListing.id}`}>Next <ChevronRight className="h-4 w-4" /></Link> : <span>Next <ChevronRight className="h-4 w-4" /></span>}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Lot:</span>
                <Input value={lotJump} onChange={(event) => setLotJump(event.target.value)} onKeyDown={(event) => event.key === "Enter" && jumpToLot()} className="h-10 w-24" />
                <Button variant="outline" size="sm" onClick={jumpToLot}>GO</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={shareListing} aria-label="Share listing"><Share2 className="h-4 w-4" /></Button>
                <Button asChild variant="outline" size="icon" aria-label="Back to listings"><Link to="/horses-for-sale"><RotateCcw className="h-4 w-4" /></Link></Button>
              </div>
            </nav>
          )}

          <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
            <div className="space-y-8">
              <section className="space-y-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Lot {lotNumber || listing.reference_code || "—"}</p>
                  <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">{listing.horse_name}</h1>
                  {(listing.sire || listing.dam) && (
                    <p className="mt-2 text-sm uppercase tracking-[0.08em] text-muted-foreground">
                      {listing.sire || "—"} × {listing.dam || "—"}
                    </p>
                  )}
                </div>
                <dl className="space-y-1.5">
                  <DetailRow label="Type" value={typeLabel} />
                  <DetailRow label="Vendor" value={listing.consignor_name} accent />
                  <DetailRow label="Sire" value={listing.sire} />
                  <DetailRow label="Dam" value={listing.dam} />
                  <DetailRow label="Colour" value={listing.colour} />
                  <DetailRow label="Sex" value={listing.sex} />
                  <DetailRow label="DOB" value={formatLongDate(listing.date_of_birth)} />
                  <DetailRow label="Bonus Schemes" value={listing.bonus_schemes} />
                  <DetailRow label="COB" value={listing.cob || listing.country} />
                  {isSold && <DetailRow label="Status" value="Sold" />}
                </dl>

                {vetLines && (
                  <div className="space-y-2 pt-2 text-[13px] text-muted-foreground">
                    {listing.x_rays_available && <p>This lot has X-Rays available.</p>}
                    {listing.scoping_video_available && <p>This lot has a scoping video available.</p>}
                    {listing.repository_url && <p>Registered vets can access via the <a href={listing.repository_url} target="_blank" rel="noopener noreferrer" className="text-secondary underline underline-offset-4">Repository</a></p>}
                  </div>
                )}
              </section>

              <HorseIntelligencePanel listing={listing} highestOffer={highest} />

              <section>
                <SectionTitle>Pedigree</SectionTitle>
                <CataloguePedigreeTable listing={listing} />
              </section>

              {listing.sire_notes_html && (
                <section
                  className="text-[13px] font-bold leading-6 text-foreground text-justify"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: listing.sire_notes_html }}
                />
              )}

              {damNoteBlocks.map((html, index) => (
                <section
                  key={index}
                  className="text-[13px] leading-6 text-foreground [&_p]:mb-2 [&_strong]:font-bold"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: html as string }}
                />
              ))}
            </div>

            <aside className="space-y-5 min-[900px]:sticky min-[900px]:top-28 self-start">
              <PhotoGallery photos={listing.photos ?? []} videoUrl={listing.video_url} alt={listing.horse_name} />

              {reportUrl && (
                <div className="space-y-2">
                  <Button asChild variant="premium" className="w-full">
                    <a href={reportUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" /> Open Full Pedigree & Breeze Report (PDF)
                    </a>
                  </Button>
                  <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
                    <object data={`${reportUrl}#view=FitH`} type="application/pdf" className="block h-[480px] w-full sm:h-[600px]">
                      <iframe src={reportUrl} title="Pedigree & Breeze Report" className="block h-[480px] w-full sm:h-[600px]" />
                    </object>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Tap the button above to open the full PDF in a new tab.</p>
                </div>
              )}

              {extraVideos.length > 0 && <VideoShowcase videos={extraVideos} />}

              <Card className="overflow-hidden rounded-[10px] border-border/60 bg-card shadow-sm">
                <div className="h-[3px] bg-secondary" />
                <div className="space-y-4 p-5">
                  {isSold ? (
                    <>
                      <Badge variant="outline" className="border-destructive/40 text-destructive">SOLD</Badge>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Sold</div>
                        <div className="text-2xl font-bold text-secondary">Sold</div>
                      </div>
                      <p className="border-t border-border/50 pt-4 text-sm text-muted-foreground">This lot is no longer available.</p>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Guide Price: <span className="text-2xl text-secondary">{formatLocal(listing.guide_price)}</span></div>
                        {listing.offers_close_at && <p className="mt-1 text-xs text-muted-foreground">Offers close: {formatCloseDate(listing.offers_close_at)}</p>}
                        {listing.offers_close_at && <div className="mt-2 text-lg font-bold text-secondary"><CountdownTimer targetIso={listing.offers_close_at} /></div>}
                      </div>
                      <div className="border-t border-border/50 pt-4">
                        <OfferTracker listingId={listing.id} guidePrice={listing.guide_price} maxRows={4} currency={localCurrency} onStatsChange={({ highest: nextHighest, count }) => { setHighest(nextHighest); setOfferCount(count); }} />
                        {offerCount > 4 && <p className="mt-2 text-xs text-muted-foreground">Showing latest 4 offers.</p>}
                      </div>
                      <div className="border-t border-border/50 pt-4">
                        <PlaceOfferForm listingId={listing.id} minOffer={minOffer} defaultCurrency={localCurrency} />
                      </div>
                    </>
                  )}
                </div>
              </Card>

            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}