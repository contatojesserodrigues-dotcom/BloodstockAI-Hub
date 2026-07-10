import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicOffer, formatLocalMoney, LocalCurrency, timeAgo } from "@/types/marketplace";

export const OfferTracker = ({
  listingId,
  guidePrice,
  maxRows = 4,
  currency = "GBP",
  onStatsChange,
}: {
  listingId: string;
  guidePrice: number | null;
  maxRows?: number;
  currency?: LocalCurrency;
  onStatsChange?: (stats: { highest: number; count: number }) => void;
}) => {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [pulse, setPulse] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("get_public_offers", { _listing_id: listingId });
    if (data) {
      const nextOffers = data as PublicOffer[];
      setOffers(nextOffers);
      onStatsChange?.({ highest: nextOffers[0]?.amount ?? 0, count: nextOffers.length });
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`offers-${listingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_offer_events", filter: `listing_id=eq.${listingId}` },
        () => {
          load();
          setPulse(true);
          setTimeout(() => setPulse(false), 500);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const highest = offers[0]?.amount ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-muted-foreground">Highest Offer:</div>
        <div
          className={`text-lg font-bold text-secondary transition-transform duration-300 ${pulse ? "scale-105" : "scale-100"}`}
          title={guidePrice ? `Guide ${formatLocalMoney(guidePrice, currency)}` : undefined}
        >
          {highest ? formatLocalMoney(highest, currency) : <span className="text-muted-foreground font-medium">No offers yet</span>}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {offers.length} {offers.length === 1 ? "offer submitted" : "offers submitted"}
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {offers.length === 0 && (
          <div className="text-xs text-muted-foreground italic">No offers yet — be the first.</div>
        )}
        {offers.slice(0, maxRows).map((o) => (
          <div key={o.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
            <span className="text-muted-foreground font-medium">{o.offeror_initials}</span>
            <span className="text-secondary font-semibold">{formatLocalMoney(o.amount, currency)}</span>
            <span className="text-muted-foreground/70 text-[10px]">{timeAgo(o.created_at)}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] italic text-muted-foreground/80 leading-relaxed">
        Offers are non-binding expressions of interest. The seller reserves the right to accept or decline any offer.
      </p>
    </div>
  );
};

export default OfferTracker;