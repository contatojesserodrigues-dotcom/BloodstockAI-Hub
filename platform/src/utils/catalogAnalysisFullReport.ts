import jsPDF from "jspdf";

type ScoredLot = {
  lot_number: string | number;
  sire: string | null;
  dam: string | null;
  sex: string | null;
  foaling_month: string | number | null;
  black_type_counts: { g1?: number; g2?: number; g3?: number; listed?: number };
  black_type_sibling: boolean;
  group_listed_dam: boolean;
  ebf_nominated: boolean;
  consignor: string | null;
  sire_tier: string;
  score: number;
  classification: string;
  analyst_read: string;
};

type Sections = {
  executive_summary?: { intro?: string; key_findings?: string[] };
  methodology?: string;
  catalogue_overview?: string;
  sire_intelligence?: Array<{ sire: string; profile: string }>;
  dam_family_intelligence?: string;
  headline_commentary?: string;
  commercial_commentary?: string;
  market_estimate?: { intro?: string; bands?: Array<{ profile: string; indicative_band: string }> };
  disclaimer?: string;
};

export interface FullReportInput {
  saleName: string;
  saleDate?: string;
  saleLocation?: string;
  breedType: "Flat" | "NH";
  foalingYear?: number;
  currency?: string;
  scoredLots: ScoredLot[];
  sections: Sections;
  marketResearch?: { summary?: string | null; sources?: string[] } | null;
}

const NAVY: [number, number, number] = [13, 30, 64];
const GOLD: [number, number, number] = [199, 161, 70];
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];

export function generateCatalogFullReport(input: FullReportInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = M;

  const newPage = () => { doc.addPage(); y = M; drawHeader(); };
  const ensure = (need: number) => { if (y + need > H - 18) newPage(); };

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("BLOODSTOCKAI", M, 8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text(input.saleName, W - M, 8, { align: "right" });
    y = 20;
  };

  const drawFooter = (pageNum: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `BloodstockAI · Catalogue Analysis Report · Page ${pageNum} of ${total}`,
      W / 2, H - 8, { align: "center" }
    );
  };

  const heading = (t: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...NAVY);
    doc.text(t, M, y); y += 5;
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(M, y, M + 30, y);
    y += 6;
  };

  const para = (text: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(text, W - M * 2);
    lines.forEach((ln: string) => { ensure(5); doc.text(ln, M, y); y += 5; });
    y += 2;
  };

  // --- COVER PAGE ---
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, H, "F");
  doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(32);
  doc.text("BLOODSTOCKAI", W / 2, 70, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Catalogue Analysis Report", W / 2, 80, { align: "center" });
  doc.setFontSize(22); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(input.saleName, W - 40);
  doc.text(titleLines, W / 2, 110, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  const meta = [
    input.saleDate ? `Date: ${input.saleDate}` : null,
    input.saleLocation ? `Location: ${input.saleLocation}` : null,
    `Breed type: ${input.breedType === "NH" ? "National Hunt" : "Flat"}`,
    input.foalingYear ? `Foaling year: ${input.foalingYear}` : null,
  ].filter(Boolean) as string[];
  doc.text(meta.join("  ·  "), W / 2, 135, { align: "center" });
  doc.setTextColor(...GOLD);
  doc.text("Prepared by BloodstockAI", W / 2, H - 30, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("en-GB"), W / 2, H - 22, { align: "center" });

  // --- BODY ---
  newPage();

  // Executive Summary
  heading("Executive Summary");
  const totals = {
    total: input.scoredLots.length,
    elite: input.scoredLots.filter((l) => l.classification === "Elite / Black-type").length,
    bt_sibling: input.scoredLots.filter((l) => l.black_type_sibling).length,
  };
  const boxW = (W - M * 2 - 12) / 4;
  const drawStat = (i: number, label: string, value: string) => {
    const x = M + i * (boxW + 4);
    doc.setFillColor(248, 248, 245);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
    doc.text(value, x + boxW / 2, y + 11, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(label, x + boxW / 2, y + 18, { align: "center" });
  };
  drawStat(0, "Lots analysed", String(totals.total));
  drawStat(1, "Elite / black-type", String(totals.elite));
  drawStat(2, "Black-type siblings", String(totals.bt_sibling));
  drawStat(3, "Prior-yr avg", input.marketResearch?.summary ? "see market" : "n/a");
  y += 28;
  if (input.sections.executive_summary?.intro) para(input.sections.executive_summary.intro);
  if (input.sections.executive_summary?.key_findings?.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    ensure(6); doc.text("Key findings", M, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...INK);
    input.sections.executive_summary.key_findings.forEach((f) => {
      const lines = doc.splitTextToSize(`• ${f}`, W - M * 2);
      lines.forEach((ln: string) => { ensure(5); doc.text(ln, M, y); y += 5; });
    });
    y += 2;
  }

  // Methodology
  heading("Methodology");
  para(input.sections.methodology || "Each lot is scored on sire commercial tier (max 35), female-family black-type (max 46), sex & foaling month (max 10) and EBF nomination (max 2). Sires outside the BloodstockAI commercial tier map are scored neutral. The model does not see the horse; physical inspection, breeze (where applicable) and veterinary examination are required before any decision.");

  // Catalogue Overview
  heading("Catalogue Overview");
  para(input.sections.catalogue_overview || `Catalogue composition: ${totals.elite} elite/black-type, ${input.scoredLots.filter(l => l.classification === "Commercial").length} commercial, ${input.scoredLots.filter(l => l.classification === "Value / Pedigree").length} value/pedigree.`);

  // Sire Intelligence
  if (input.sections.sire_intelligence?.length) {
    heading("Sire Intelligence");
    input.sections.sire_intelligence.slice(0, 12).forEach((s) => {
      ensure(12);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
      doc.text(s.sire, M, y); y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(s.profile, W - M * 2);
      lines.forEach((ln: string) => { ensure(4); doc.text(ln, M, y); y += 4; });
      y += 2;
    });
  }

  // Dam & Family Intelligence
  if (input.sections.dam_family_intelligence) {
    heading("Dam & Family Intelligence");
    para(input.sections.dam_family_intelligence);
  }

  // Headline Lots
  heading("Headline Lots — Elite / Black-type");
  if (input.sections.headline_commentary) para(input.sections.headline_commentary);
  drawLotsTable(doc, input.scoredLots.filter((l) => l.classification === "Elite / Black-type").sort((a, b) => b.score - a.score), { M, W, H, getY: () => y, setY: (v: number) => { y = v; }, newPage });

  // Commercial Lots
  heading("Commercial Lots");
  if (input.sections.commercial_commentary) para(input.sections.commercial_commentary);
  drawLotsTable(doc, input.scoredLots.filter((l) => l.classification === "Commercial").sort((a, b) => b.score - a.score), { M, W, H, getY: () => y, setY: (v: number) => { y = v; }, newPage });

  // Market Estimate
  heading("Market Estimate");
  if (input.sections.market_estimate?.intro) para(input.sections.market_estimate.intro);
  (input.sections.market_estimate?.bands || []).forEach((b) => {
    ensure(7);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(b.profile, M, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...INK);
    doc.text(b.indicative_band, M + 70, y);
    y += 6;
  });
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  ensure(5); doc.text("Indicative bands only — not an appraisal.", M, y); y += 6;

  // Appendix — full catalogue
  newPage();
  heading("Appendix — Full Catalogue");
  drawAppendix(doc, [...input.scoredLots].sort((a, b) => Number(a.lot_number) - Number(b.lot_number)), { M, W, H, getY: () => y, setY: (v: number) => { y = v; }, newPage });

  // Disclaimer
  newPage();
  heading("Contact & Disclaimer");
  para("BloodstockAI · agentbloodstockai.com · contact@agentbloodstockai.com");
  para(input.sections.disclaimer || "Commercial pedigree screen only. Not investment advice. No substitute for physical inspection, breeze (if applicable), or veterinary examination.");

  // Footers
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) { doc.setPage(i); drawFooter(i - 1, total - 1); }

  doc.save(`BloodstockAI_${input.saleName.replace(/\s+/g, "_")}_Full_Report.pdf`);
}

function drawLotsTable(
  doc: jsPDF,
  lots: ScoredLot[],
  ctx: { M: number; W: number; H: number; getY: () => number; setY: (n: number) => void; newPage: () => void }
) {
  if (!lots.length) { doc.setFontSize(9); doc.setTextColor(120, 120, 120); doc.text("No lots in this tier.", ctx.M, ctx.getY()); ctx.setY(ctx.getY() + 6); return; }
  const cols = [
    { label: "Lot", w: 12 },
    { label: "Sire × Dam", w: 70 },
    { label: "Sex", w: 14 },
    { label: "BT (G1/G2/G3/L)", w: 28 },
    { label: "Score", w: 14 },
    { label: "Analyst read", w: 40 },
  ];
  let y = ctx.getY();
  doc.setFillColor(13, 30, 64); doc.rect(ctx.M, y, ctx.W - ctx.M * 2, 6, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  let x = ctx.M + 1;
  cols.forEach((c) => { doc.text(c.label, x, y + 4); x += c.w; });
  y += 7;
  doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal");
  lots.forEach((l) => {
    const sd = `${l.sire ?? "?"} × ${l.dam ?? "?"}`;
    const bt = `${l.black_type_counts?.g1 ?? 0}/${l.black_type_counts?.g2 ?? 0}/${l.black_type_counts?.g3 ?? 0}/${l.black_type_counts?.listed ?? 0}`;
    const readLines = doc.splitTextToSize(l.analyst_read, 40);
    const rowH = Math.max(5, readLines.length * 3.5);
    if (y + rowH > ctx.H - 14) { ctx.setY(y); ctx.newPage(); y = ctx.getY(); }
    let cx = ctx.M + 1;
    doc.setFontSize(8);
    doc.text(String(l.lot_number), cx, y + 3); cx += cols[0].w;
    doc.text(doc.splitTextToSize(sd, cols[1].w - 2), cx, y + 3); cx += cols[1].w;
    doc.text(String(l.sex ?? ""), cx, y + 3); cx += cols[2].w;
    doc.text(bt, cx, y + 3); cx += cols[3].w;
    doc.text(String(l.score), cx, y + 3); cx += cols[4].w;
    doc.text(readLines, cx, y + 3);
    y += rowH + 1;
  });
  ctx.setY(y + 4);
}

function drawAppendix(
  doc: jsPDF,
  lots: ScoredLot[],
  ctx: { M: number; W: number; H: number; getY: () => number; setY: (n: number) => void; newPage: () => void }
) {
  const headers = ["Lot", "Sire × Dam", "Sex", "G1/G2/G3/L", "Score", "Class"];
  const widths = [10, 80, 12, 22, 12, 42];
  let y = ctx.getY();
  doc.setFillColor(13, 30, 64); doc.rect(ctx.M, y, ctx.W - ctx.M * 2, 5, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  let x = ctx.M + 1;
  headers.forEach((h, i) => { doc.text(h, x, y + 3.5); x += widths[i]; });
  y += 6;
  doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal");
  lots.forEach((l, idx) => {
    if (y > ctx.H - 14) { ctx.setY(y); ctx.newPage(); y = ctx.getY(); }
    if (idx % 2 === 0) { doc.setFillColor(248, 248, 245); doc.rect(ctx.M, y - 1, ctx.W - ctx.M * 2, 4.5, "F"); }
    let cx = ctx.M + 1;
    const row = [
      String(l.lot_number),
      `${l.sire ?? "?"} × ${l.dam ?? "?"}`,
      String(l.sex ?? ""),
      `${l.black_type_counts?.g1 ?? 0}/${l.black_type_counts?.g2 ?? 0}/${l.black_type_counts?.g3 ?? 0}/${l.black_type_counts?.listed ?? 0}`,
      String(l.score),
      l.classification,
    ];
    doc.setFontSize(7);
    row.forEach((v, i) => {
      const txt = doc.splitTextToSize(v, widths[i] - 2)[0];
      doc.text(txt ?? "", cx, y + 2.5); cx += widths[i];
    });
    y += 4.5;
  });
  ctx.setY(y);
}