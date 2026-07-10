export type ListingStatus = "draft" | "active" | "sold" | "withdrawn";

export interface MarketplaceListing {
  id: string;
  created_at: string;
  updated_at: string;
  horse_name: string;
  reference_code: string | null;
  date_of_birth: string | null;
  sex: string | null;
  breed: string | null;
  sire: string | null;
  dam: string | null;
  dam_sire: string | null;
  consignor_name: string | null;
  country: string | null;
  colour?: string | null;
  cob?: string | null;
  bonus_schemes?: string | null;
  x_rays_available?: boolean | null;
  scoping_video_available?: boolean | null;
  repository_url?: string | null;
  sire_notes_html?: string | null;
  first_dam_notes_html?: string | null;
  second_dam_notes_html?: string | null;
  third_dam_notes_html?: string | null;
  buyer_name?: string | null;
  sold_price?: number | null;
  auction_sale_name?: string | null;
  sale_stage?: "pre_sale" | "post_sale" | "private_treaty" | string | null;
  guide_price: number | null;
  offers_close_at: string | null;
  status: ListingStatus;
  description_html: string | null;
  pedigree_json: Record<string, any> | null;
  report_pdf_url: string | null;
  video_url: string | null;
  photos: string[] | null;
  internal_notes: string | null;
  created_by: string | null;
}

export interface PublicOffer {
  id: string;
  listing_id: string;
  offeror_initials: string;
  amount: number;
  created_at: string;
}

export interface MarketplaceOfferInput {
  listing_id: string;
  offeror_name: string;
  contact_number: string;
  email: string;
  amount: number;
  message?: string;
  is_genuine: boolean;
}

export const formatGBP = (n: number | null | undefined) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)
    : "—";

export type LocalCurrency = "GBP" | "EUR" | "USD" | "AUD" | "NZD";

export const formatLocalMoney = (n: number | null | undefined, currency: LocalCurrency = "GBP") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
    : "—";

export const resolveMarketplaceAsset = (url: string | null | undefined) => {
  if (!url) return "";
  if (!url.includes("/__l5e/assets-v1/")) return url;
  const filename = decodeURIComponent(url.split("/").pop() ?? "");
  if (filename.startsWith("lot49_")) return `/marketplace/lot49/${filename}`;
  return url;
};

/**
 * Infer the local trading currency for a listing from its auction sale name,
 * consignor country, or country-of-birth. Defaults to GBP.
 */
export const inferListingCurrency = (
  listing: Pick<MarketplaceListing, "auction_sale_name" | "country" | "cob" | "consignor_name"> | null | undefined,
): LocalCurrency => {
  if (!listing) return "GBP";
  const haystack = [listing.auction_sale_name, listing.country, listing.cob, listing.consignor_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(gold coast|magic millions|inglis|australia|sydney|melbourne|\baus\b|\bau\b)/.test(haystack)) return "AUD";
  if (/(karaka|new zealand|\bnz\b|nzb)/.test(haystack)) return "NZD";
  if (/(keeneland|fasig|saratoga|obs|united states|\busa?\b|\busd\b)/.test(haystack)) return "USD";
  if (/(arqana|deauville|baden|ger|france|\bfr\b|\bde\b|ireland|\bire\b|goffs|\beur\b|europe)/.test(haystack)) return "EUR";
  return "GBP";
};

export const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}.${last}.`.toUpperCase();
};

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
};