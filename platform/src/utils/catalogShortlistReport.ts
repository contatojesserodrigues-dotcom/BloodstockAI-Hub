import jsPDF from "jspdf";

export interface ShortlistLot {
  lot_number: string | number;
  sire: string | null;
  dam: string | null;
  sex: string | null;
  score: number;
  consignor: string | null;
  sales_hook: string;
}

export interface ShortlistReportInput {
  saleName: string;
  saleDate?: string;
  lots: ShortlistLot[];
}

const NAVY: [number, number, number] = [13, 30, 64];
const GOLD: [number, number, number] = [199, 161, 70];

export function generateCatalogShortlistPdf(input: ShortlistReportInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;

  // Header
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("BLOODSTOCKAI", M, 14);
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Selected Lots — Sales Shortlist", M, 22);

  let y = 38;
  doc.setTextColor(13, 30, 64); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(input.saleName, M, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 110);
  doc.text(`${input.saleDate ?? ""} · ${input.lots.length} lots shortlisted`, M, y); y += 8;

  // Table header
  doc.setFillColor(...NAVY); doc.rect(M, y, W - M * 2, 7, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  const cols = [
    { l: "Lot", w: 12 },
    { l: "Sire × Dam", w: 70 },
    { l: "Sex", w: 14 },
    { l: "Score", w: 14 },
    { l: "Consignor", w: 28 },
    { l: "Destaque", w: 40 },
  ];
  let x = M + 1;
  cols.forEach((c) => { doc.text(c.l, x, y + 5); x += c.w; });
  y += 8;

  doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  input.lots.forEach((l, idx) => {
    if (y > H - 30) { doc.addPage(); y = M; }
    if (idx % 2 === 0) { doc.setFillColor(248, 248, 245); doc.rect(M, y - 1, W - M * 2, 6, "F"); }
    const hook = doc.splitTextToSize(l.sales_hook, cols[5].w - 1);
    const rowH = Math.max(5, hook.length * 3.2);
    let cx = M + 1;
    doc.text(String(l.lot_number), cx, y + 3); cx += cols[0].w;
    doc.text(doc.splitTextToSize(`${l.sire ?? "?"} × ${l.dam ?? "?"}`, cols[1].w - 2), cx, y + 3); cx += cols[1].w;
    doc.text(String(l.sex ?? ""), cx, y + 3); cx += cols[2].w;
    doc.text(String(l.score), cx, y + 3); cx += cols[3].w;
    doc.text(doc.splitTextToSize(String(l.consignor ?? ""), cols[4].w - 2), cx, y + 3); cx += cols[4].w;
    doc.text(hook, cx, y + 3);
    y += rowH + 1;
  });

  // Footer
  doc.setFillColor(...NAVY); doc.rect(0, H - 18, W, 18, "F");
  doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("BLOODSTOCKAI", M, H - 10);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("agentbloodstockai.com · contact@agentbloodstockai.com", W - M, H - 10, { align: "right" });

  doc.save(`BloodstockAI_${input.saleName.replace(/\s+/g, "_")}_Shortlist.pdf`);
}