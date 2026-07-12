import jsPDF from "jspdf";
import {
  addPdfPageFooters,
  drawPdfBarChart,
  drawPdfCoverPage,
  drawPdfLineChart,
  drawPdfRadarChart,
  drawPdfScoreBars,
  drawPdfSectionTitle,
  drawPdfStallionComparisonChart,
  ensurePdfSpace,
  PDF_COLORS,
  PDF_PAGE,
  pdfRect,
  pdfText,
  sanitizePdfText,
  type ChartDatum,
} from "@/utils/pdfBrandKit";

const RT = "Mating Analysis";

type StallionRow = {
  name?: string;
  rank?: number;
  total_score?: number;
  score_breakdown?: Record<string, any>;
  nick_analysis?: string;
  risk_explanation?: string;
  hype_explanation?: string;
  est_yearling_value?: number;
  target_auction?: string;
  farm?: string;
  fee?: number;
  origin?: string;
  projected_foal?: Record<string, string>;
};

function stallionList(data: any): StallionRow[] {
  if (data?.stallion_suggestions?.length) return data.stallion_suggestions;
  if (data?.comparison_results?.length) return data.comparison_results;
  return [];
}

function drawKvGrid(doc: jsPDF, y: number, rows: [string, string][], reportLabel: string): number {
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  const colW = cw / 2;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) y = ensurePdfSpace(doc, y, 14, reportLabel);
    const x = margin + (i % 2) * colW;
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(k.toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sanitizePdfText(v).slice(0, 42), x, y + 4);
    if (i % 2 === 1) y += 12;
  });
  if (rows.length % 2 === 1) y += 12;
  return y + 2;
}

function drawStallionPage(doc: jsPDF, stallion: StallionRow, idx: number, mareName: string): number {
  let y = drawPdfSectionTitle(doc, `#${stallion.rank ?? idx + 1} — ${sanitizePdfText(stallion.name)}`, 36, RT);
  const bd = stallion.score_breakdown || {};

  y = drawKvGrid(doc, y, [
    ["Total Score", `${stallion.total_score ?? "—"}/100`],
    ["Nick Rating", String(bd.nick_rating ?? "—")],
    ["COI", bd.coi_percent != null ? `${bd.coi_percent}%` : "—"],
    ["Dosage Index", String(bd.dosage_index_projected ?? "—")],
    ["Stud Fee", stallion.fee ? `$${Number(stallion.fee).toLocaleString()}` : "—"],
    ["Farm", String(stallion.farm ?? stallion.origin ?? "—")],
    ["Est. Yearling", stallion.est_yearling_value ? `$${Number(stallion.est_yearling_value).toLocaleString()}` : "—"],
    ["Target Sale", String(stallion.target_auction ?? "—")],
  ], RT);

  const scoreComponents: ChartDatum[] = [
    { label: "Nick Points", value: Number(bd.nick_points) || 0 },
    { label: "COI Points", value: Number(bd.coi_points) || 0 },
    { label: "Dosage Points", value: Number(bd.dosage_points) || 0 },
    { label: "Performance", value: Number(bd.performance_points) || 0 },
    { label: "Commercial", value: Number(bd.commercial_points) || 0 },
  ].filter((x) => x.value > 0);

  if (scoreComponents.length) {
    y = drawPdfSectionTitle(doc, "Score Breakdown", y, RT);
    y = drawPdfBarChart(doc, y, RT, scoreComponents, { height: 40, maxValue: Math.max(...scoreComponents.map((c) => c.value), 20) });
  }

  const speedStamina: ChartDatum[] = [
    { label: "Speed Index", value: Number(bd.speed_index) || 0 },
    { label: "Stamina Index", value: Number(bd.stamina_index) || 0 },
  ].filter((x) => x.value > 0);

  if (speedStamina.length) {
    y = drawPdfSectionTitle(doc, "Speed & Stamina Profile", y, RT);
    y = drawPdfScoreBars(doc, y, RT, speedStamina);
  }

  if (bd.coi_ancestor_note) {
    y = drawPdfSectionTitle(doc, "Inbreeding & Pedigree Repetition", y, RT);
    y = pdfText(doc, `COI ${bd.coi_percent ?? "—"}% — ${bd.coi_ancestor_note}`, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 4;
  }

  if (stallion.nick_analysis) {
    y = drawPdfSectionTitle(doc, "Nick Analysis", y, RT);
    y = pdfText(doc, stallion.nick_analysis, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 4;
  }

  const foal = stallion.projected_foal || {};
  if (foal.best_distance || foal.surface) {
    y = drawPdfSectionTitle(doc, "Projected Foal Profile", y, RT);
    y = drawKvGrid(doc, y, [
      ["Best Distance", String(foal.best_distance ?? "—")],
      ["Surface", String(foal.surface ?? "—")],
      ["Runner Type", String(foal.runner_type ?? "—")],
      ["Objective Fit", String(foal.breeding_objective ?? "—")],
    ], RT);
  }

  if (stallion.risk_explanation) {
    y = drawPdfSectionTitle(doc, "Risk Assessment", y, RT);
    y = pdfText(doc, stallion.risk_explanation, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 4;
  }

  if (stallion.hype_explanation) {
    y = drawPdfSectionTitle(doc, "Commercial Hype Alert", y, RT);
    y = pdfText(doc, stallion.hype_explanation, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.red);
    y += 4;
  }

  return y;
}

export async function generateMatingReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const mare = data?.mare_profile || {};
  const mareName = mare.name || "Mating Plan";
  const mode = data?.analysis_mode || "compare";
  const stallions = stallionList(data);

  let y = await drawPdfCoverPage(doc, {
    reportTitle: "Mating Analysis",
    subtitle: "Genetic compatibility · Nick rating · COI · Commercial projection",
    subject: mareName,
    meta: [
      mode === "suggest" ? "AI Stallion Suggestions" : mode === "single" ? "Single Stallion Analysis" : "Stallion Comparison",
      mare.sire ? `Sire: ${mare.sire}` : "",
      mare.dam ? `Dam: ${mare.dam}` : "",
      mare.dam_sire ? `Dam sire: ${mare.dam_sire}` : "",
    ].filter(Boolean),
  });

  y = drawPdfSectionTitle(doc, "Mare Profile", y, RT);
  y = drawKvGrid(doc, y, [
    ["Sire", String(mare.sire ?? "—")],
    ["Dam", String(mare.dam ?? "—")],
    ["Dam Sire", String(mare.dam_sire ?? "—")],
    ["Dosage", String(mare.dosage_profile ?? "—")],
    ["Dosage Index", mare.dosage_index ? String(mare.dosage_index) : "—"],
    ["Distance", String(mare.distance_tendency ?? "—")],
    ["Surface", String(mare.surface_tendency ?? "—")],
    ["Status", mare.is_maiden ? "Maiden" : "Proven"],
  ], RT);

  if (mare.racing_record) {
    y = pdfText(doc, mare.racing_record, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.muted);
    y += 4;
  }

  if (mare.pedigree_traits?.length) {
    y = drawPdfSectionTitle(doc, "Pedigree Strengths", y, RT);
    y = pdfText(doc, mare.pedigree_traits.join(" · "), PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 6;
  }

  if (mare.ideal_stallion_traits?.length) {
    y = drawPdfSectionTitle(doc, "Ideal Stallion Traits", y, RT);
    y = pdfText(doc, mare.ideal_stallion_traits.join(" · "), PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
    y += 6;
  }

  if (stallions.length > 1) {
    y = drawPdfSectionTitle(doc, "Stallion Comparison Chart", y, RT);
    y = drawPdfStallionComparisonChart(
      doc,
      y,
      RT,
      stallions.map((s, i) => ({
        name: (s.name || `Stallion ${i + 1}`).split(" ")[0],
        score: Number(s.total_score) || 0,
      })),
    );
  }

  if (data?.breeding_strategy) {
    y = drawPdfSectionTitle(doc, "Breeding Strategy", y, RT);
    const bs = data.breeding_strategy;
    if (bs.primary_recommendation) {
      pdfRect(doc, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 16, PDF_COLORS.card);
      y = pdfText(doc, bs.primary_recommendation, PDF_PAGE.margin + 4, y + 6, PDF_PAGE.w - PDF_PAGE.margin * 2 - 8, 10, PDF_COLORS.text);
      y += 20;
    }
    if (bs.alternative_approach) {
      y = pdfText(doc, `Alternative: ${bs.alternative_approach}`, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.muted);
      y += 4;
    }
    if (bs.hype_alert) {
      y = pdfText(doc, `Hype alert: ${bs.hype_alert}`, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.amber);
      y += 4;
    }
    if (bs.timing_note) {
      y = pdfText(doc, `Timing: ${bs.timing_note}`, PDF_PAGE.margin, y, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.muted);
      y += 6;
    }
  }

  for (let i = 0; i < stallions.length; i++) {
    doc.addPage();
    drawStallionPage(doc, stallions[i], i, mareName);
  }

  if (data?.comparative_analysis) {
    doc.addPage();
    let yy = drawPdfSectionTitle(doc, "Comparative Analysis", 36, RT);
    for (const [key, val] of Object.entries(data.comparative_analysis)) {
      if (key === "hype_traps" || !val || typeof val !== "object") continue;
      const item = val as any;
      yy = drawPdfSectionTitle(doc, key.replace(/_/g, " "), yy, RT);
      if (item.summary) yy = pdfText(doc, item.summary, PDF_PAGE.margin, yy, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.text);
      yy += 4;
    }
    if (data.comparative_analysis.hype_traps?.length) {
      yy = drawPdfSectionTitle(doc, "Hype Traps to Avoid", yy, RT);
      for (const trap of data.comparative_analysis.hype_traps) {
        yy = pdfText(doc, `• ${trap.stallion || trap.name}: ${trap.reason || trap.explanation || ""}`, PDF_PAGE.margin, yy, PDF_PAGE.w - PDF_PAGE.margin * 2, 9, PDF_COLORS.red);
        yy += 2;
      }
    }
  }

  doc.addPage();
  y = drawPdfSectionTitle(doc, "Disclaimer", 36, RT);
  pdfText(
    doc,
    "This mating analysis is for bloodstock research purposes only. Nick ratings, COI figures and commercial projections are evidence-based estimates — not guaranteed outcomes. Always verify stud fees and availability with the stud farm directly.",
    PDF_PAGE.margin,
    y,
    PDF_PAGE.w - PDF_PAGE.margin * 2,
    8,
    PDF_COLORS.muted,
  );

  addPdfPageFooters(doc, RT);
  return doc;
}
