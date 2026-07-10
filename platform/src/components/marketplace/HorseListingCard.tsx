import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarketplaceListing, formatLocalMoney, inferListingCurrency, resolveMarketplaceAsset } from "@/types/marketplace";

interface Props {
  listing: MarketplaceListing;
  highestOffer?: number;
  offerCount?: number;
  lotNumber?: number;
  onPlaceOffer: (l: MarketplaceListing) => void;
}

const ageFromDob = (dob: string | null) => {
  if (!dob) return null;
  const years = new Date().getFullYear() - new Date(dob).getFullYear();
  if (years <= 0) return "Foal";
  if (years === 1) return "Yearling";
  if (years === 2) return "2yo";
  return `${years}yo`;
};

const HorseSilhouette = () => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 text-muted-foreground/40" fill="currentColor" aria-hidden="true">
    <path d="M54 22c-1-3-4-5-7-4l-6 2-3-4c-2-3-6-4-9-3l-12 4c-2 1-3 3-3 5v3l-4 2c-2 1-3 3-2 5l2 4c1 2 3 3 5 2v10c0 1 1 2 2 2h3c1 0 2-1 2-2v-7h14v7c0 1 1 2 2 2h3c1 0 2-1 2-2V31l5-2c3-1 5-4 6-7z" />
  </svg>
);

export const HorseListingCard = ({ listing, highestOffer, offerCount = 0, lotNumber, onPlaceOffer }: Props) => {
  const cover = resolveMarketplaceAsset(listing.photos?.[0]);
  const [imageFailed, setImageFailed] = useState(false);
  const age = ageFromDob(listing.date_of_birth);
  const isSold = listing.status === "sold";
  const currency = inferListingCurrency(listing);
  const formatMoney = (n?: number | null) => formatLocalMoney(n, currency);
  const category = (listing as any).category as string | undefined;
  const lotLabel = [
    lotNumber ? `LOT ${lotNumber}` : (listing.reference_code || null),
    category ? category.toUpperCase() : null,
  ].filter(Boolean).join(" - ");

  const attrLine = [age, listing.sex, listing.breed].filter(Boolean).join(" | ");

  return (
    <Link to={`/horses-for-sale/${listing.id}`} className="group block">
      <Card className="overflow-hidden bg-card border-border/60 hover:shadow-lg hover:border-secondary/40 transition-all duration-300 flex flex-col md:flex-row rounded-[10px] cursor-pointer">
        <div className="relative md:w-[280px] md:flex-shrink-0 h-[200px] md:h-auto md:min-h-[200px] bg-muted/60 overflow-hidden flex items-center justify-center">
          {cover && !imageFailed ? (
            <img src={cover} alt={listing.horse_name} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
          ) : (
            <HorseSilhouette />
          )}
          {isSold && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-destructive/80 text-destructive-foreground uppercase tracking-wider">Sold</Badge>
            </div>
          )}
        </div>

        <div className="p-5 md:p-6 flex flex-col gap-2 flex-1 min-w-0">
          {lotLabel && (
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              {lotLabel}
            </div>
          )}
          <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-secondary transition-colors">
            {listing.horse_name}
          </h3>
          {(listing.sire || listing.dam) && (
            <p className="text-[13px] text-muted-foreground uppercase tracking-wider">
              {(listing.sire ?? "—")} x {(listing.dam ?? "—")}
            </p>
          )}
          {attrLine && (
            <p className="text-[13px] text-muted-foreground">{attrLine}</p>
          )}
          {listing.consignor_name && (
            <p className="text-[13px] text-muted-foreground">
              Consignor : <span className="italic">{listing.consignor_name}</span>
            </p>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
            {isSold ? (
              <div className="text-muted-foreground">
                Sold: <span className="font-semibold">{formatMoney(listing.sold_price || highestOffer || listing.guide_price)}</span>
              </div>
            ) : highestOffer ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-muted-foreground text-sm">Highest offer:</span>
                <span className="text-secondary font-bold text-lg">{formatMoney(highestOffer)}</span>
                <span className="text-xs text-muted-foreground">({offerCount} {offerCount === 1 ? "offer" : "offers"})</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-muted-foreground text-sm">Guide:</span>
                <span className="text-secondary font-bold text-lg">{formatMoney(listing.guide_price)}</span>
              </div>
            )}

            {!isSold && (
              <Button
                variant="premium"
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlaceOffer(listing); }}
              >
                Make an offer →
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default HorseListingCard;