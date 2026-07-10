import { JULY_SALES, type JulySale } from "@/data/julySales";

export type CatalogDownloadStatus = "available" | "coming_soon" | "ended";

export type SalesCatalogDownload = {
  slug: string;
  title: string;
  location: string;
  dates: string;
  flag: string;
  status: CatalogDownloadStatus;
  pdfUrl?: string;
  spreadsheetUrl?: string;
};

const DOWNLOADS_BY_SLUG: Record<
  string,
  { pdfUrl?: string; spreadsheetUrl?: string }
> = {
  "arqana-summer-sale": {
    pdfUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Report.pdf",
    spreadsheetUrl: "/reports/BloodstockAI_Arqana_Summer_2026_Spreadsheet.pdf",
  },
};

function mapSaleStatus(sale: JulySale): CatalogDownloadStatus {
  const downloads = DOWNLOADS_BY_SLUG[sale.slug];
  if (downloads?.pdfUrl) return "available";
  if (sale.status === "Ended") return "ended";
  return "coming_soon";
}

export function getMonthlySalesCatalogDownloads(): SalesCatalogDownload[] {
  return JULY_SALES.map((sale) => {
    const downloads = DOWNLOADS_BY_SLUG[sale.slug];
    return {
      slug: sale.slug,
      title: sale.name,
      location: sale.location,
      dates: sale.date,
      flag: sale.flag,
      status: mapSaleStatus(sale),
      pdfUrl: downloads?.pdfUrl,
      spreadsheetUrl: downloads?.spreadsheetUrl,
    };
  });
}
