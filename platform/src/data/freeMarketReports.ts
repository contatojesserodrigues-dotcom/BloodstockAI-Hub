/** Free lead-gated market & catalog reports — download via /reports */
export type FreeMarketReport = {
  id: string;
  title: string;
  description: string;
  report_type: "trends" | "auction";
  auction_house: string | null;
  fileUrl: string;
  published_at: string;
};

export const FREE_MARKET_REPORTS: FreeMarketReport[] = [
  {
    id: "free-may-2026-market",
    title: "BloodstockAI — May 2026 Market Report",
    description:
      "Comprehensive global market analysis: yearling and breeze-up trends, top sires, regional benchmarks and outlook for the months ahead.",
    report_type: "trends",
    auction_house: null,
    fileUrl: "/reports/BloodstockAI_May2026_Market_Report.pdf",
    published_at: "2026-05-15",
  },
  {
    id: "obs-june-2026",
    title: "OBS June 2026 — Analyzed Catalog",
    description: "Lot-by-lot pedigree, performance and commercial intelligence for OBS June Two-Year-Olds & Horses of Racing Age.",
    report_type: "auction",
    auction_house: "obs",
    fileUrl: "/reports/BloodstockAI_OBS_June_2026_Report.pdf",
    published_at: "2026-06-01",
  },
  {
    id: "goffs-london-2026",
    title: "Goffs London Sale 2026 — Analyzed Catalog",
    description: "Elite racehorses and international prospects offered on the eve of Royal Ascot.",
    report_type: "auction",
    auction_house: "goffs",
    fileUrl: "/reports/BloodstockAI_Goffs_London_2026_Report.pdf",
    published_at: "2026-06-01",
  },
  {
    id: "arqana-summer-2026",
    title: "Arqana Summer Sale 2026 — Analyzed Catalog",
    description: "Flat, National Hunt and breeding prospects with black-type opportunity spotlight.",
    report_type: "auction",
    auction_house: "arqana",
    fileUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
    published_at: "2026-06-01",
  },
  {
    id: "tatts-derby-2026",
    title: "Tattersalls Ireland Derby Sale 2026 — Analyzed Catalog",
    description: "National Hunt store horses — pedigree depth and commercial indicators.",
    report_type: "auction",
    auction_house: "tattersalls_ie",
    fileUrl: "/reports/BloodstockAI_Derby_Sale_2026_Report.pdf",
    published_at: "2026-06-01",
  },
  {
    id: "tatts-breezeup-2026",
    title: "Tattersalls Breeze-Up 2026 — Analyzed Catalog",
    description: "Integrated pedigree and breeze-up assessment for two-year-olds in training.",
    report_type: "auction",
    auction_house: "tattersalls_uk",
    fileUrl: "/reports/BloodstockAI_Tattersalls_BreezeUp_2026_Report.pdf",
    published_at: "2026-04-01",
  },
  {
    id: "goffs-breezeup-2026",
    title: "Goffs Classic Breeze-Up 2026 — Analyzed Catalog",
    description: "Full lot-by-lot intelligence with pedigree, athletic and market scorecards.",
    report_type: "auction",
    auction_house: "goffs",
    fileUrl: "/reports/BloodstockAI_Goffs_Classic_BreezeUp_2026_Report.pdf",
    published_at: "2026-05-01",
  },
];
