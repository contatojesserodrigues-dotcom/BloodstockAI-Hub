import jsPDF from "jspdf";
import type {
  BroodmarePlanResult,
  MareInput,
  StallionRecommendation,
} from "@/services/broodmarePlanningService";
import {
  addPdfPageFooters,
  drawPdfBarChart,
  drawPdfCoverPage,
  drawPdfLineChart,
  drawPdfRadarChart,
  drawPdfScoreBars,
  drawPdfSectionTitle,
  drawPdfContentHeader,
  ensurePdfSpace,
  PDF_COLORS,
  PDF_PAGE,
  pdfRect,
  pdfText,
  sanitizePdfText,
  type ChartDatum,
} from "@/utils/pdfBrandKit";

const RT = "Broodmare Planning";

function fmtUsd(n?: number): string {
  if (n == null || isNaN(n as number)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtRange(r?: { low: number; mid: number; high: number }): string {
  if (!r) return "—";
  return `${fmtUsd(r.low)} – ${fmtUsd(r.high)} (mid ${fmtUsd(r.mid)})`;
}

function kvBlock(doc: jsPDF, y: number, rows: [string, string][]): number {
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  const colW = cw / 2;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) y = ensurePdfSpace(doc, y, 14, RT);
    const x = margin + (i % 2) * colW;
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(k.toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sanitizePdfText(v).slice(0, 44), x, y + 4);
    if (i % 2 === 1) y += 12;
  });
  if (rows.length % 2 === 1) y += 12;
  return y + 2;
}

function stallionTable(doc: jsPDF, y: number, rows: StallionRecommendation[]): number {
  const cols = [
    { k: "rank", label: "#", w: 8 },
    { k: "name", label: "STALLION", w: 48 },
    { k: "compatibility_score", label: "SCORE", w: 16 },
    { k: "nick_rating", label: "NICK", w: 14 },
    { k: "commercial_score", label: "COMM", w: 14 },
    { k: "expected_roi_percent", label: "ROI%", w: 14 },
    { k: "expected_distance", label: "DIST", w: 22 },
    { k: "risk_rating", label: "RISK", w: 14 },
  ] as const;
  const { margin } = PDF_PAGE;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const startX = margin;

  const drawHeader = () => {
    pdfRect(doc, startX, y, totalW, 6, PDF_COLORS.navy);
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.white);
    doc.setFont("helvetica", "bold");
    let x = startX + 1;
    cols.forEach((c) => {
      doc.text(c.label, x, y + 4);
      x += c.w;
    });
    doc.setFont("helvetica", "normal");
    y += 8;
  };

  drawHeader();
  rows.forEach((s, i) => {
    if (y > PDF_PAGE.h - 24) {
      doc.addPage();
      y = drawPdfContentHeader(doc, RT);
      drawHeader();
    }
    if (i % 2 === 0) pdfRect(doc, startX, y - 3.5, totalW, 6, PDF_COLORS.card);
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.text);
    let x = startX + 1;
    cols.forEach((c) => {
      const v: any = (s as any)[c.k];
      const out = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v ?? "—");
      doc.text(out.slice(0, c.k === "name" ? 26 : 12), x, y);
      x += c.w;
    });
    y += 6;
  });
  return y + 4;
}

export async function generateBroodmarePlanningPdf(
  mare: MareInput,
  plan: BroodmarePlanResult,
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = await drawPdfCoverPage(doc, {
    reportTitle: "Broodmare Planning",
    subtitle: "Strategic breeding intelligence · multi-season stallion roadmap",
    subject: mare.name,
    meta: [
      `${plan.seasons?.length ?? 0}-season plan`,
      mare.breeding_status === "proven" ? "Proven broodmare" : "Maiden broodmare",
      mare.year_of_birth ? `YOB ${mare.year_of_birth}` : "",
      mare.country || "",
      mare.owner ? `Owner: ${mare.owner}` : "",
    ].filter(Boolean),
  });

  y = drawPdfSectionTitle(doc, "Executive Summary", y, RT);
  y = pdfText(doc, plan.executive_summary, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 10, PDF_COLORS.text);
  y += 6;

  const radarData: ChartDatum[] = Object.entries(plan.scores || {}).map(([k, v]) => ({
    label: k.replace(/_/g, " "),
    value: Math.max(0, Math.min(100, Number(v) || 0)),
  }));

  if (radarData.length >= 3) {
    y = drawPdfSectionTitle(doc, "Overall Score Dashboard", y, RT);
    y = drawPdfRadarChart(doc, y, RT, radarData, 54);
  }

  const perfData: ChartDatum[] = Object.entries(plan.performance_projection || {}).map(([k, v]) => ({
    label: k.replace(/_/g, " "),
    value: Math.round((Number(v) || 0) * 100),
  }));

  if (perfData.length) {
    y = drawPdfSectionTitle(doc, "Expected Performance Distribution", y, RT);
    y = drawPdfBarChart(doc, y, RT, perfData, { height: 46, maxValue: 100 });
  }

  const seasonCurve = (plan.seasons || []).map((s) => ({
    label: String(s.year),
    value: s.expected_roi_percent ?? s.expected_yearling_value_usd?.mid ?? 0,
  }));

  if (seasonCurve.length >= 2) {
    y = drawPdfSectionTitle(doc, "Season ROI & Value Curve", y, RT);
    y = drawPdfLineChart(doc, y, RT, seasonCurve, { height: 44 });
  }

  y = drawPdfSectionTitle(doc, "Broodmare Overview", y, RT);
  y = pdfText(doc, plan.broodmare_overview, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
  y += 4;
  y = kvBlock(doc, y, [
    ["Name", mare.name],
    ["YOB", String(mare.year_of_birth)],
    ["Colour", mare.colour || "—"],
    ["Owner", mare.owner || "—"],
    ["Farm", mare.farm || "—"],
    ["Country", mare.country || "—"],
    ["Registration", mare.registration_authority || "—"],
    ["Status", mare.breeding_status === "proven" ? "Proven" : "Maiden"],
    ["Previous foals", String(mare.previous_foals?.length ?? 0)],
  ]);

  y = drawPdfSectionTitle(doc, "Score Breakdown", y, RT);
  y = drawPdfScoreBars(doc, y, RT, radarData);

  y = drawPdfSectionTitle(doc, "Pedigree Analysis", y, RT);
  for (const [k, v] of Object.entries(plan.pedigree_analysis || {})) {
    y = ensurePdfSpace(doc, y, 12, RT);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.goldDark);
    doc.setFont("helvetica", "bold");
    doc.text(k.replace(/_/g, " ").toUpperCase(), PDF_PAGE.margin, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    y = pdfText(doc, String(v), PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 3;
  }

  y = drawPdfSectionTitle(doc, "Genetic Analysis", y, RT);
  y = kvBlock(
    doc,
    y,
    Object.entries(plan.genetic_analysis || {}).map(([k, v]) => [
      k.replace(/_/g, " "),
      typeof v === "number" ? v.toFixed(2) : String(v),
    ]),
  );

  y = drawPdfSectionTitle(doc, "Commercial Analysis", y, RT);
  const ca: any = plan.commercial_analysis || {};
  y = kvBlock(doc, y, [
    ["Demand index", String(ca.demand_index ?? "—")],
    ["Auction appeal", String(ca.auction_appeal_score ?? "—")],
    ["International appeal", String(ca.international_buyer_appeal ?? "—")],
    ["Est. yearling", fmtRange(ca.estimated_yearling_value_usd)],
    ["Est. breeze-up", fmtRange(ca.estimated_breeze_up_value_usd)],
    ["Est. ROI", ca.estimated_roi_percent != null ? `${ca.estimated_roi_percent}%` : "—"],
  ]);

  (plan.seasons || []).forEach((s, idx) => {
    doc.addPage();
    y = drawPdfContentHeader(doc, RT);
    y = drawPdfSectionTitle(doc, `Season ${idx + 1} — ${s.year}`, y, RT);
    y = kvBlock(doc, y, [
      ["Strategic goal", s.strategic_goal],
      ["Commercial goal", s.commercial_goal],
      ["Expected market", s.expected_market],
      ["Yearling value", fmtRange(s.expected_yearling_value_usd)],
      ["Expected ROI", `${s.expected_roi_percent ?? "—"}%`],
      ["Racing profile", s.expected_racing_profile],
    ]);
    y = pdfText(doc, s.reasoning, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 6;

    if (s.top_stallions?.length) {
      y = drawPdfSectionTitle(doc, "Top Stallion Recommendations", y, RT);
      y = drawPdfBarChart(
        doc,
        y,
        RT,
        s.top_stallions.slice(0, 8).map((st) => ({
          label: st.name.split(" ")[0],
          value: Number(st.compatibility_score) || 0,
        })),
        { height: 40, maxValue: 100 },
      );
      y = stallionTable(doc, y, s.top_stallions.slice(0, 25));
    }

    if (s.alternative_stallions?.length) {
      y = drawPdfSectionTitle(doc, "Alternative Stallions", y, RT);
      for (const a of s.alternative_stallions) {
        y = ensurePdfSpace(doc, y, 10, RT);
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.text);
        doc.setFont("helvetica", "bold");
        doc.text(`• ${a.name} — score ${a.compatibility_score}`, PDF_PAGE.margin, y);
        doc.setFont("helvetica", "normal");
        y += 4;
        y = pdfText(doc, a.rationale || "—", PDF_PAGE.margin + 4, y, PDF_PAGE.w - PDF_PAGE.margin * 2 - 4, 8, PDF_COLORS.muted);
        y += 2;
      }
    }
  });

  doc.addPage();
  y = drawPdfContentHeader(doc, RT);
  y = drawPdfSectionTitle(doc, "Risk Assessment", y, RT);
  y = pdfText(doc, plan.risk_assessment, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 10, PDF_COLORS.text);
  y += 6;
  y = drawPdfSectionTitle(doc, "Final Professional Recommendation", y, RT);
  pdfText(doc, plan.final_recommendation, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 10, PDF_COLORS.text);

  addPdfPageFooters(doc, RT);
  return doc.output("blob");
}
