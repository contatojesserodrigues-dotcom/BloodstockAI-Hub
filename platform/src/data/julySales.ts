export type JulySaleStatus = "Active" | "Coming Soon" | "Ended";

export type JulySale = {
  slug: string;
  date: string;
  country: string;
  flag: string;
  name: string;
  location: string;
  category: string;
  status: JulySaleStatus;
  totalLots: number;
  potentialLots: number;
  blackTypeLots: number;
  analyzedLots: number;
  auctionHouse: string;
  saleDateIso: string;
};

export const JULY_SALES: JulySale[] = [
  {
    slug: "arqana-summer-sale",
    date: "30 Jun – 2 Jul",
    country: "France",
    flag: "🇫🇷",
    name: "Arqana Summer Sale",
    location: "Deauville, France",
    category: "HIT, Stores, 2YOs",
    status: "Ended",
    totalLots: 412,
    potentialLots: 8,
    blackTypeLots: 14,
    analyzedLots: 412,
    auctionHouse: "Arqana",
    saleDateIso: "2026-07-01",
  },
  {
    slug: "tattersalls-july-sale",
    date: "7–9 Jul",
    country: "United Kingdom",
    flag: "🇬🇧",
    name: "Tattersalls July Sale",
    location: "Newmarket, UK",
    category: "HIT, Broodmares, Fillies",
    status: "Active",
    totalLots: 856,
    potentialLots: 6,
    blackTypeLots: 19,
    analyzedLots: 612,
    auctionHouse: "Tattersalls",
    saleDateIso: "2026-07-08",
  },
  {
    slug: "jrha-select-sale-yearlings",
    date: "13 Jul",
    country: "Japan",
    flag: "🇯🇵",
    name: "JRHA Select Sale – Yearlings",
    location: "Hokkaido, Japan",
    category: "Yearlings",
    status: "Coming Soon",
    totalLots: 124,
    potentialLots: 3,
    blackTypeLots: 7,
    analyzedLots: 89,
    auctionHouse: "Other",
    saleDateIso: "2026-07-13",
  },
  {
    slug: "jrha-select-sale-foals",
    date: "14 Jul",
    country: "Japan",
    flag: "🇯🇵",
    name: "JRHA Select Sale – Foals",
    location: "Hokkaido, Japan",
    category: "Foals",
    status: "Coming Soon",
    totalLots: 98,
    potentialLots: 2,
    blackTypeLots: 4,
    analyzedLots: 54,
    auctionHouse: "Other",
    saleDateIso: "2026-07-14",
  },
  {
    slug: "fasig-tipton-july-sale",
    date: "14 Jul",
    country: "United States",
    flag: "🇺🇸",
    name: "Fasig-Tipton July Sale",
    location: "Lexington, Kentucky",
    category: "Yearlings & Horses of Racing Age",
    status: "Coming Soon",
    totalLots: 234,
    potentialLots: 2,
    blackTypeLots: 11,
    analyzedLots: 118,
    auctionHouse: "Fasig-Tipton",
    saleDateIso: "2026-07-14",
  },
  {
    slug: "hokkaido-selection-sale",
    date: "20–21 Jul",
    country: "Japan",
    flag: "🇯🇵",
    name: "Hokkaido Selection Sale",
    location: "Hokkaido, Japan",
    category: "Yearlings",
    status: "Coming Soon",
    totalLots: 156,
    potentialLots: 1,
    blackTypeLots: 5,
    analyzedLots: 42,
    auctionHouse: "Other",
    saleDateIso: "2026-07-20",
  },
  {
    slug: "goffs-summer-sale",
    date: "23 Jul",
    country: "Ireland",
    flag: "🇮🇪",
    name: "Goffs Summer Sale",
    location: "Kildare, Ireland",
    category: "NH Stores, HIT, Breeding Stock",
    status: "Coming Soon",
    totalLots: 312,
    potentialLots: 1,
    blackTypeLots: 9,
    analyzedLots: 76,
    auctionHouse: "Goffs",
    saleDateIso: "2026-07-23",
  },
];

export const TOTAL_POTENTIAL_LOTS = JULY_SALES.reduce((sum, sale) => sum + sale.potentialLots, 0);
export const TOTAL_BLACK_TYPE_LOTS = JULY_SALES.reduce((sum, sale) => sum + sale.blackTypeLots, 0);

export const JULY_ACTIVITY_SERIES = [
  { day: "Jul 1", lots: 48, potential: 4, sold: 12 },
  { day: "Jul 2", lots: 62, potential: 5, sold: 18 },
  { day: "Jul 3", lots: 55, potential: 3, sold: 22 },
  { day: "Jul 4", lots: 71, potential: 6, sold: 15 },
  { day: "Jul 5", lots: 84, potential: 7, sold: 28 },
  { day: "Jul 6", lots: 93, potential: 8, sold: 31 },
  { day: "Jul 7", lots: 118, potential: 9, sold: 44 },
  { day: "Jul 8", lots: 136, potential: 11, sold: 52 },
  { day: "Jul 9", lots: 152, potential: 12, sold: 61 },
  { day: "Jul 10", lots: 167, potential: 13, sold: 58 },
];

export const TOP_LOTS = [
  { lot: "142", sale: "Tattersalls July", horse: "Bay Colt", sire: "Frankel", score: 9.4, est: "£420k" },
  { lot: "89", sale: "Tattersalls July", horse: "Chestnut Filly", sire: "Galileo", score: 9.2, est: "£385k" },
  { lot: "56", sale: "Arqana Summer", horse: "Dark Bay Colt", sire: "Wootton Bassett", score: 9.1, est: "€310k" },
  { lot: "201", sale: "JRHA Yearlings", horse: "Bay Colt", sire: "Deep Impact", score: 9.0, est: "¥48m" },
  { lot: "78", sale: "Goffs Summer", horse: "Bay Gelding", sire: "Walk In The Park", score: 8.9, est: "€185k" },
];

export const STALLION_TRENDS = [
  { name: "Frankel", demand: 94, lots: 28 },
  { name: "Justify", demand: 88, lots: 19 },
  { name: "I Am Invincible", demand: 82, lots: 16 },
  { name: "Constitution", demand: 79, lots: 14 },
  { name: "Galileo", demand: 76, lots: 22 },
  { name: "Deep Impact", demand: 74, lots: 11 },
];

export const BROODMARE_TRENDS = [
  { name: "Family 1-x", strength: 91, count: 34 },
  { name: "Sadler's Wells", strength: 86, count: 28 },
  { name: "Storm Cat", strength: 83, count: 24 },
  { name: "Danehill", strength: 80, count: 31 },
  { name: "Mr Prospector", strength: 77, count: 19 },
];

export const MARKET_UPDATES = [
  { time: "16:42", sale: "Tattersalls July", update: "Lot 142 — strong bidding interest, 3 underbidders", type: "hot" },
  { time: "16:38", sale: "Tattersalls July", update: "19 black-type families flagged with commercial upside", type: "intel" },
  { time: "16:31", sale: "JRHA Yearlings", update: "Deep Impact progeny trending +12% vs. 2025 session", type: "trend" },
  { time: "16:24", sale: "Goffs Summer", update: "NH stores session — Walk In The Park demand elevated", type: "trend" },
  { time: "16:18", sale: "Fasig-Tipton July", update: "Constitution yearlings clearing above reserve", type: "sold" },
];

export type AnalyzedCatalog = {
  id: string;
  title: string;
  location: string;
  dates: string;
  pdfUrl: string;
  spreadsheetUrl?: string;
};

export const ANALYZED_CATALOGS: AnalyzedCatalog[] = [
  {
    id: "obs-june-2026",
    title: "OBS June 2026",
    location: "Ocala, Florida, USA",
    dates: "June 2026",
    pdfUrl: "/reports/BloodstockAI_OBS_June_2026_Report.pdf",
    spreadsheetUrl: "/reports/BloodstockAI_OBS_June_2026_Spreadsheet.pdf",
  },
  {
    id: "goffs-london-2026",
    title: "Goffs London Sale 2026",
    location: "London, United Kingdom",
    dates: "June 2026",
    pdfUrl: "/reports/BloodstockAI_Goffs_London_2026_Report.pdf",
  },
  {
    id: "arqana-summer-2026",
    title: "Arqana Summer Sale 2026",
    location: "Deauville, France",
    dates: "June–July 2026",
    pdfUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
    spreadsheetUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Spreadsheet.pdf",
  },
  {
    id: "tatts-derby-2026",
    title: "Tattersalls Ireland Derby Sale 2026",
    location: "Fairyhouse, Ireland",
    dates: "June 2026",
    pdfUrl: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf",
    spreadsheetUrl: "/reports/BloodstockAI_Derby_Sale_2026_Spreadsheet.pdf",
  },
  {
    id: "tatts-breezeup-2026",
    title: "Tattersalls Breeze-Up 2026",
    location: "Newmarket, United Kingdom",
    dates: "April 2026",
    pdfUrl: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf",
  },
  {
    id: "goffs-breezeup-2026",
    title: "Goffs Classic Breeze-Up 2026",
    location: "Kildare, Ireland",
    dates: "May 2026",
    pdfUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf",
    spreadsheetUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Spreadsheet.pdf",
  },
];

export function getSaleBySlug(slug: string) {
  return JULY_SALES.find((sale) => sale.slug === slug);
}
