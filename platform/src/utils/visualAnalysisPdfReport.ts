import jsPDF from "jspdf";
import logoSrc from "@/assets/logo.png";
import type { FrameAnnotation } from "./breezeFrameAnnotation";

// ============================================================
// BloodstockAI® — Visual Analysis PDF Report
// Conformation & biomechanics with annotated frames
// ============================================================

let logoBase64: string | null = null;
const logoPromise = new Promise<void>((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    const s = 4;
    c.width = img.naturalWidth * s;
    c.height = img.naturalHeight * s;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      logoBase64 = c.toDataURL("image/png", 1.0);
    }
    resolve();
  };
  img.onerror = () => resolve();
  img.src = logoSrc;
});

// Light theme — white background, dark text, gold accents
const BG = [255, 255, 255] as const;          // page background (white)
const GOLD = [170, 138, 30] as const;         // darker gold for contrast on white
const WHITE = [255, 255, 255] as const;
const IVORY = [40, 40, 45] as const;          // body text (dark slate)
const MID = [110, 110, 115] as const;         // muted text
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const YELLOW = [202, 138, 4] as const;
const CARD_BG = [248, 248, 245] as const;     // soft ivory card background
const BORDER = [220, 215, 200] as const;      // subtle border

const PW = 210;
const PH = 297;
const M = 18;
const CW = PW - 2 * M;
type RGB = readonly [number, number, number];

function s(t: any): string {
  if (t === null || t === undefined) return "N/A";
  return String(t)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[^\x00-\x7F]/g, (ch) => {
      const c = ch.charCodeAt(0);
      if (c >= 0xC0 && c <= 0x17F) return ch;
      if (c >= 0x2010 && c <= 0x2015) return "-";
      if (c === 0x2014) return " -- ";
      if (c >= 0x2018 && c <= 0x201F) return "'";
      if (c === 0x2026) return "...";
      return "";
    })
    .replace(/\s+/g, " ")
    .trim() || "N/A";
}

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, c: RGB) {
  doc.setFillColor(...c);
  doc.rect(x, y, w, h, "F");
}

function txt(doc: jsPDF, text: string, x: number, y: number, maxW: number, fs: number, color: RGB, lh = 1.6, align: "left" | "center" | "right" = "left"): number {
  doc.setFontSize(fs);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(s(text), maxW);
  const step = fs * 0.353 * lh;
  for (const line of lines) {
    if (y > PH - 22) {
      doc.addPage();
      y = pageHeader(doc);
    }
    doc.text(line, x, y, { align });
    y += step;
  }
  return y;
}

function pageHeader(doc: jsPDF): number {
  rect(doc, 0, 0, PW, PH, BG);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M, 8, 14, 14); } catch {}
  }
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("BloodstockAI®", M + 18, 14);
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text("Visual Analysis Report", M + 18, 19);
  rect(doc, M, 26, CW, 0.3, GOLD);
  return 34;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > PH - 40) {
    doc.addPage();
    y = pageHeader(doc);
  }
  rect(doc, M, y, 1.5, 6, GOLD);
  doc.setFontSize(12);
  doc.setTextColor(...GOLD);
  doc.text(s(title).toUpperCase(), M + 4, y + 4.5);
  rect(doc, M, y + 8, CW, 0.2, BORDER);
  return y + 14;
}

function scoreColor(score: number): RGB {
  if (score >= 80) return GREEN;
  if (score >= 65) return YELLOW;
  return RED;
}

function scoreCard(doc: jsPDF, label: string, score: number, x: number, y: number, w: number) {
  // Card background + subtle border
  rect(doc, x, y, w, 20, CARD_BG);
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
  doc.rect(x, y, w, 20, "S");
  // Color status bar (left)
  rect(doc, x, y, 1.6, 20, scoreColor(score));
  // Label
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text(s(label).toUpperCase(), x + 4, y + 7);
  // Score number — measure at correct font size
  doc.setFontSize(16);
  doc.setTextColor(...scoreColor(score));
  const scoreStr = `${score}`;
  doc.text(scoreStr, x + 4, y + 16);
  const scoreW = doc.getTextWidth(scoreStr);
  // "/100" suffix — at smaller size, with proper spacing
  doc.setFontSize(9);
  doc.setTextColor(...MID);
  doc.text("/100", x + 4 + scoreW + 1.5, y + 16);
}

export interface VisualAnalysisReportData {
  horseName?: string;
  sire?: string;
  dam?: string;
  analysisMode: "walk" | "gallop";
  result: any;
  annotatedFrames?: FrameAnnotation[];
}

export async function generateVisualAnalysisPDF(data: VisualAnalysisReportData): Promise<void> {
  await logoPromise;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ═══ COVER ═══
  rect(doc, 0, 0, PW, PH, BG);
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", PW / 2 - 14, 50, 28, 28); } catch {}
  }
  doc.setFontSize(28);
  doc.setTextColor(...GOLD);
  doc.text("VISUAL ANALYSIS", PW / 2, 100, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(...IVORY);
  doc.text(data.analysisMode === "gallop" ? "Gallop Biomechanics Report" : "Conformation & Posture Report", PW / 2, 110, { align: "center" });
  rect(doc, PW / 2 - 20, 116, 40, 0.4, GOLD);

  let y = 140;
  if (data.horseName) {
    doc.setFontSize(20);
    doc.setTextColor(...IVORY);
    doc.text(s(data.horseName), PW / 2, y, { align: "center" });
    y += 8;
  }
  if (data.sire || data.dam) {
    doc.setFontSize(10);
    doc.setTextColor(...MID);
    doc.text(`${s(data.sire)} x ${s(data.dam)}`, PW / 2, y, { align: "center" });
  }
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), PW / 2, PH - 30, { align: "center" });
  doc.text("BloodstockAI® Confidential Report", PW / 2, PH - 24, { align: "center" });

  // ═══ SCORES ═══
  doc.addPage();
  y = pageHeader(doc);
  y = sectionTitle(doc, "Biomechanical Scores", y);

  const scores = data.result?.scores || {};
  const cats: Array<[string, number | undefined]> = [
    ["Posture", scores.posture],
    ["Forelimb Alignment", scores.forelimb_alignment ?? scores.forelimbAlignment],
    ["Hindlimb Alignment", scores.hindlimb_alignment ?? scores.hindlimbAlignment],
    ["Gait", scores.gait],
    ["Hoof Health", scores.hoof_health ?? scores.hoofHealth],
    ["Health Indicators", scores.health_indicators ?? scores.healthIndicators],
    ["Overall", scores.overall],
  ];

  const cardW = (CW - 6) / 2;
  let col = 0;
  for (const [label, val] of cats) {
    if (typeof val !== "number") continue;
    const x = M + col * (cardW + 6);
    scoreCard(doc, label, val, x, y, cardW);
    col = (col + 1) % 2;
    if (col === 0) y += 24;
  }
  if (col !== 0) y += 24;
  y += 4;

  const r = data.result || {};

  // ═══ EXECUTIVE SUMMARY ═══
  const summary = r.summary || r.executiveSummary;
  if (summary) {
    y = sectionTitle(doc, "Executive Summary", y);
    y = txt(doc, summary, M, y, CW, 10, IVORY, 1.6);
    y += 6;
  }

  // ═══ HOOF STRUCTURE ANALYSIS (walk mode) ═══
  if (r.hoofAnalysis) {
    y = sectionTitle(doc, "Hoof Structure Analysis", y);
    y = txt(doc, r.hoofAnalysis, M, y, CW, 10, IVORY, 1.6);
    y += 6;
  }

  // ═══ FULL ANALYSIS ═══
  if (r.analysis) {
    y = sectionTitle(doc, "Full Analysis", y);
    y = txt(doc, r.analysis, M, y, CW, 10, IVORY, 1.6);
    y += 6;
  }

  // ═══ CLINICAL SUMMARY (walk mode) ═══
  if (r.clinicalSummary) {
    y = sectionTitle(doc, "Clinical Summary", y);
    y = txt(doc, r.clinicalSummary, M, y, CW, 10, IVORY, 1.6);
    y += 6;
  }

  // ═══ STRENGTHS ═══
  if (Array.isArray(r.strengths) && r.strengths.length > 0) {
    y = sectionTitle(doc, "Strengths", y);
    for (const item of r.strengths) {
      const text = typeof item === "string" ? item : (item.text || JSON.stringify(item));
      if (y > PH - 22) { doc.addPage(); y = pageHeader(doc); }
      rect(doc, M, y - 2, 1, 5, GREEN);
      doc.setFontSize(9); doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold");
      doc.text("+", M + 3, y + 1);
      doc.setFont("helvetica", "normal");
      y = txt(doc, text, M + 7, y + 1, CW - 7, 9, IVORY, 1.5);
      y += 3;
    }
    y += 4;
  }

  // ═══ CONCERNS ═══
  if (Array.isArray(r.concerns) && r.concerns.length > 0) {
    y = sectionTitle(doc, "Concerns", y);
    for (const item of r.concerns) {
      const text = typeof item === "string" ? item : (item.text || JSON.stringify(item));
      if (y > PH - 22) { doc.addPage(); y = pageHeader(doc); }
      rect(doc, M, y - 2, 1, 5, RED);
      doc.setFontSize(9); doc.setTextColor(...RED); doc.setFont("helvetica", "bold");
      doc.text("!", M + 3, y + 1);
      doc.setFont("helvetica", "normal");
      y = txt(doc, text, M + 7, y + 1, CW - 7, 9, IVORY, 1.5);
      y += 3;
    }
    y += 4;
  }

  // ═══ ANNOTATED FRAMES ═══
  if (data.annotatedFrames && data.annotatedFrames.length > 0) {
    doc.addPage();
    y = pageHeader(doc);
    y = sectionTitle(doc, "Annotated Biomechanical Frames", y);

    for (let i = 0; i < data.annotatedFrames.length; i++) {
      const f = data.annotatedFrames[i];
      if (y > PH - 90) {
        doc.addPage();
        y = pageHeader(doc);
        y = sectionTitle(doc, "Annotated Biomechanical Frames (cont.)", y);
      }
      doc.setFontSize(9);
      doc.setTextColor(...GOLD);
      doc.text(`Frame ${f.frameIndex + 1} — ${s(f.label)}`, M, y);
      y += 4;
      try {
        const imgW = CW;
        const imgH = imgW * 0.5625;
        doc.addImage(f.annotatedDataUrl, "JPEG", M, y, imgW, imgH);
        y += imgH + 8;
      } catch (e) {
        y = txt(doc, "[frame unavailable]", M, y, CW, 9, MID);
      }
    }
  }

  // ═══ FINDINGS ═══
  const findings = r.findings || r.observations;
  if (findings && Array.isArray(findings) && findings.length > 0) {
    if (y > PH - 50) { doc.addPage(); y = pageHeader(doc); }
    y = sectionTitle(doc, "Key Findings", y);
    for (const f of findings) {
      const text = typeof f === "string" ? f : (f.text || f.note || JSON.stringify(f));
      rect(doc, M, y, 1, 5, GOLD);
      y = txt(doc, text, M + 4, y + 4, CW - 4, 9, IVORY, 1.5);
      y += 4;
    }
  }

  // ═══ VERDICT ═══
  if (r.verdict) {
    if (y > PH - 60) { doc.addPage(); y = pageHeader(doc); }
    y = sectionTitle(doc, "Final Verdict & Recommendation", y);
    y = txt(doc, r.verdict, M, y, CW, 10, IVORY, 1.6);
    y += 8;
  }

  // ═══ MEDICAL DISCLAIMER ═══
  if (y > PH - 40) { doc.addPage(); y = pageHeader(doc); }
  rect(doc, M, y, CW, 22, [255, 248, 225] as RGB);
  doc.setDrawColor(...YELLOW); doc.setLineWidth(0.4);
  doc.rect(M, y, CW, 22, "S");
  rect(doc, M, y, 1.6, 22, YELLOW);
  doc.setFontSize(8); doc.setTextColor(...YELLOW); doc.setFont("helvetica", "bold");
  doc.text("IMPORTANT DISCLAIMER", M + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8); doc.setTextColor(...IVORY);
  const disclaimer = "This AI assessment does not replace physical veterinary examination or professional farriery assessment. Always consult qualified professionals for diagnosis and treatment.";
  const lines = doc.splitTextToSize(disclaimer, CW - 8);
  let dy = y + 10;
  for (const ln of lines) { doc.text(ln, M + 4, dy); dy += 4; }

  // ═══ FOOTER on every page ═══
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text(`BloodstockAI® · Visual Analysis · Page ${p} of ${total}`, PW / 2, PH - 8, { align: "center" });
  }

  const fname = `BloodstockAI_VisualAnalysis_${s(data.horseName || "Horse").replace(/\s+/g, "_")}_${Date.now()}.pdf`;
  doc.save(fname);
}

// ═══════════════════════════════════════════════════════════════════════
// Horse Sale Inspection Analysis — multi-block PDF
// ═══════════════════════════════════════════════════════════════════════

const MEDIA_PURPOSE_LABEL: Record<string, string> = {
  STATIC_CONFORMATION: "Static Conformation",
  GAIT_WALK: "Gait — Walk",
  GAIT_TROT: "Gait — Trot",
  HOOF_DETAIL: "Hoof Detail",
  MUSCULATURE: "Musculature & Condition",
  FULL_BODY_VIDEO: "Full Body Video",
};

const CATEGORY_LABEL_PDF: Record<string, string> = {
  FOAL: "Foal (0–12 months)",
  YEARLING: "Yearling (12–24 months)",
  FLAT_IN_TRAINING: "Flat — in training",
  NH_STORE_YOUNG: "NH — store/young",
  NH_IN_TRAINING: "NH — in training",
  BROODMARE_STALLION: "Broodmare / Stallion",
};

export interface InspectionReportData {
  analysis: {
    horse_name: string;
    lot_ref?: string | null;
    sale_context?: string | null;
    horse_category: string;
    consolidated_score: number | null;
    created_at: string;
  };
  blocks: Array<{
    id: string;
    media_purpose: string;
    block_score: number | null;
    score_breakdown: any;
    measurements_json: any;
    attention_points: string[] | null;
    observations: string | null;
    bloodstock_insight: string | null;
    created_at: string;
    biomechanics_image_url?: string | null;
  }>;
  /** Optional: pedigree research output (rating, dimensions, narrative). */
  pedigreeResearch?: any | null;
  /** Optional: full market estimate + ROI + commercial adjustment + future potential. */
  marketRoi?: any | null;
  /** Optional: final consolidated bloodstock conclusion narrative. */
  conclusion?: string | null;
  /** Optional: blended BloodstockAI score (different from consolidated_score). */
  bloodstockScore?: number | null;
  /** Optional: pedigree rating /10. */
  pedigreeRating?: number | string | null;
}

export async function generateInspectionReportPDF(data: InspectionReportData): Promise<void> {
  await logoPromise;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Cover
  rect(doc, 0, 0, PW, PH, BG);
  if (logoBase64) { try { doc.addImage(logoBase64, "PNG", PW / 2 - 25, 42, 50, 24); } catch {} }
  doc.setFontSize(22); doc.setTextColor(...GOLD);
  doc.text("SALE INSPECTION ANALYSIS", PW / 2, 90, { align: "center" });
  rect(doc, PW / 2 - 22, 96, 44, 0.5, GOLD);
  doc.setFontSize(11); doc.setTextColor(...IVORY);
  doc.text(s(data.analysis.horse_name), PW / 2, 130, { align: "center" });
  doc.setFontSize(9); doc.setTextColor(...MID);
  doc.text(CATEGORY_LABEL_PDF[data.analysis.horse_category] || data.analysis.horse_category, PW / 2, 138, { align: "center" });
  if (data.analysis.sale_context) doc.text(s(data.analysis.sale_context), PW / 2, 144, { align: "center" });

  // Headline KPI trio
  const kpiY = 158;
  const kpiW = (CW - 8) / 3;
  const cs = data.analysis.consolidated_score;
  const bs = data.bloodstockScore ?? cs;
  const pr = data.pedigreeRating != null ? String(data.pedigreeRating) : "—";
  const drawKpi = (x: number, label: string, value: string, color: RGB) => {
    rect(doc, x, kpiY, kpiW, 28, CARD_BG);
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
    doc.rect(x, kpiY, kpiW, 28, "S");
    rect(doc, x, kpiY, kpiW, 1.4, GOLD);
    doc.setFontSize(7); doc.setTextColor(...MID);
    doc.text(label.toUpperCase(), x + kpiW / 2, kpiY + 7, { align: "center" });
    doc.setFontSize(20); doc.setTextColor(...color);
    doc.text(value, x + kpiW / 2, kpiY + 21, { align: "center" });
  };
  drawKpi(M, "BloodstockAI Score", bs != null ? `${Math.round(bs)}/100` : "—", bs != null ? scoreColor(bs) : MID);
  drawKpi(M + kpiW + 4, "Pedigree Rating", pr !== "—" ? `${pr}/10` : "—", GOLD);
  const adj = data.marketRoi?.adjustment?.pct;
  drawKpi(
    M + 2 * (kpiW + 4),
    "Commercial Adj.",
    typeof adj === "number" ? `${adj > 0 ? "+" : ""}${adj}%` : "—",
    typeof adj === "number" ? (adj < 0 ? RED : adj > 0 ? GREEN : MID) : MID,
  );

  doc.setFontSize(8); doc.setTextColor(...MID);
  doc.text(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), PW / 2, PH - 30, { align: "center" });
  doc.text("BloodstockAI® Confidential Report", PW / 2, PH - 24, { align: "center" });

  // ═══ DIMENSIONS BAR CHART ═══
  doc.addPage();
  let yy = pageHeader(doc);
  yy = sectionTitle(doc, "Score by Dimension", yy);
  const dims = computeDimensions(data);
  for (const d of dims) {
    if (yy > PH - 22) { doc.addPage(); yy = pageHeader(doc); }
    doc.setFontSize(9); doc.setTextColor(...IVORY);
    doc.text(d.label, M, yy + 4);
    const trackX = M + 42;
    const trackW = CW - 42 - 18;
    rect(doc, trackX, yy + 1.5, trackW, 5, [240, 236, 226] as RGB);
    const v = Math.max(0, Math.min(100, d.value));
    rect(doc, trackX, yy + 1.5, (trackW * v) / 100, 5, d.value > 0 ? scoreColor(d.value) : MID);
    doc.setFontSize(9); doc.setTextColor(...IVORY);
    doc.text(d.value > 0 ? `${Math.round(d.value)}/100` : "—", PW - M, yy + 5, { align: "right" });
    yy += 10;
  }
  yy += 4;

  // ═══ MARKET ESTIMATE TIERS ═══
  if (data.marketRoi?.market) {
    const m = data.marketRoi.market;
    if (yy > PH - 80) { doc.addPage(); yy = pageHeader(doc); }
    yy = sectionTitle(doc, "Market Estimate", yy);
    const tierColors: Array<[any, RGB, RGB]> = [
      [m.basic, [45, 106, 79] as RGB, WHITE],
      [m.median, [16, 26, 57] as RGB, WHITE],
      [m.maximum, [201, 168, 76] as RGB, WHITE],
    ];
    for (const [tier, bg, fg] of tierColors) {
      if (!tier) continue;
      if (yy > PH - 22) { doc.addPage(); yy = pageHeader(doc); }
      rect(doc, M, yy, CW, 14, bg);
      doc.setFontSize(9); doc.setTextColor(...fg); doc.setFont("helvetica", "bold");
      doc.text(s(tier.label).toUpperCase(), M + 4, yy + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(s(tier.scenario), M + 4, yy + 11);
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(s(tier.range), PW - M - 4, yy + 9, { align: "right" });
      doc.setFont("helvetica", "normal");
      yy += 16;
    }
    if (m.confidence) {
      doc.setFontSize(8); doc.setTextColor(...MID);
      doc.text(`Confidence: ${String(m.confidence).toUpperCase()}`, M, yy + 2);
      yy += 6;
    }
    yy += 2;
  }

  // ═══ COMMERCIAL ADJUSTMENT ═══
  if (data.marketRoi?.adjustment && Array.isArray(data.marketRoi.adjustment.reasons) && data.marketRoi.adjustment.reasons.length > 0) {
    const a = data.marketRoi.adjustment;
    if (yy > PH - 60) { doc.addPage(); yy = pageHeader(doc); }
    yy = sectionTitle(doc, `Commercial Price Adjustment  (${a.pct > 0 ? "+" : ""}${a.pct}%)`, yy);
    for (const r of a.reasons) {
      if (yy > PH - 22) { doc.addPage(); yy = pageHeader(doc); }
      const col: RGB = r.impact < 0 ? RED : GREEN;
      rect(doc, M, yy - 2, 1, 5, col);
      doc.setFontSize(9); doc.setTextColor(...IVORY);
      doc.text(s(r.label), M + 4, yy + 2);
      doc.setFontSize(9); doc.setTextColor(...col); doc.setFont("helvetica", "bold");
      doc.text(`${r.impact > 0 ? "+" : ""}${r.impact}%`, PW - M, yy + 2, { align: "right" });
      doc.setFont("helvetica", "normal");
      yy += 6;
    }
    if (a.narrative) { yy += 2; yy = txt(doc, a.narrative, M, yy, CW, 9, MID, 1.5); }
    yy += 4;
  }

  // ═══ FUTURE POTENTIAL — RACING PROJECTION ═══
  if (data.marketRoi?.future) {
    const f = data.marketRoi.future;
    if (yy > PH - 60) { doc.addPage(); yy = pageHeader(doc); }
    yy = sectionTitle(doc, "Future Potential — Racing Projection", yy);
    const cells: Array<[string, number]> = [
      ["G1 Chance", f.g1_pct],
      ["G2 Chance", f.g2_pct],
      ["G3 Chance", f.g3_pct],
      ["Black Type", f.black_type_pct],
      ["Winner", f.winner_pct],
    ];
    const cw = (CW - 4 * 3) / 5;
    cells.forEach(([label, v], i) => {
      const x = M + i * (cw + 3);
      rect(doc, x, yy, cw, 22, CARD_BG);
      doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
      doc.rect(x, yy, cw, 22, "S");
      doc.setFontSize(7); doc.setTextColor(...MID);
      doc.text(label.toUpperCase(), x + cw / 2, yy + 6, { align: "center" });
      doc.setFontSize(13); doc.setTextColor(...scoreColor(v));
      doc.text(typeof v === "number" ? `${v.toFixed(1)}%` : "—", x + cw / 2, yy + 16, { align: "center" });
    });
    yy += 26;
    if (f.verdict) yy = txt(doc, f.verdict, M, yy, CW, 9, IVORY, 1.55);
    yy += 4;
  }

  // Blocks
  for (let i = 0; i < data.blocks.length; i++) {
    const b = data.blocks[i];
    doc.addPage();
    let y = pageHeader(doc);
    y = sectionTitle(doc, `#${i + 1} — ${MEDIA_PURPOSE_LABEL[b.media_purpose] || b.media_purpose}`, y);
    doc.setFontSize(9); doc.setTextColor(...MID);
    doc.text(new Date(b.created_at).toLocaleString("en-GB"), M, y);
    y += 6;

    if (typeof b.block_score === "number") {
      scoreCard(doc, "Block Score", b.block_score, M, y, CW);
      y += 28;
    }

    // Biomechanics annotated image (fetched as base64)
    if (b.biomechanics_image_url) {
      try {
        const dataUrl = await urlToDataUrl(b.biomechanics_image_url);
        if (dataUrl) {
          const imgW = CW;
          const imgH = imgW * 0.56;
          if (y + imgH > PH - 22) { doc.addPage(); y = pageHeader(doc); }
          doc.setFontSize(9); doc.setTextColor(...GOLD);
          doc.text("Biomechanics map (AI-generated)", M, y);
          y += 4;
          doc.addImage(dataUrl, "JPEG", M, y, imgW, imgH);
          y += imgH + 6;
        }
      } catch { /* skip */ }
    }

    if (Array.isArray(b.measurements_json) && b.measurements_json.length > 0) {
      y = sectionTitle(doc, "Estimated measurements & angles", y);
      for (const m of b.measurements_json) {
        if (y > PH - 22) { doc.addPage(); y = pageHeader(doc); }
        y = txt(doc, `• ${m.label}: ${m.value} — ${m.classification}`, M, y, CW, 9, IVORY, 1.5);
        y += 1;
      }
      y += 4;
    }

    if (Array.isArray(b.attention_points) && b.attention_points.length > 0) {
      y = sectionTitle(doc, "Attention Points", y);
      for (const p of b.attention_points) {
        if (y > PH - 22) { doc.addPage(); y = pageHeader(doc); }
        y = txt(doc, `• ${p}`, M, y, CW, 9, IVORY, 1.5);
        y += 1;
      }
      y += 4;
    }

    if (b.observations) {
      y = sectionTitle(doc, "Observations", y);
      y = txt(doc, b.observations, M, y, CW, 9, IVORY, 1.5);
      y += 4;
    }

    if (b.bloodstock_insight) {
      y = sectionTitle(doc, "Bloodstock Insight", y);
      y = txt(doc, b.bloodstock_insight, M, y, CW, 9, IVORY, 1.5);
    }
  }

  // ═══ PEDIGREE RESEARCH NARRATIVE ═══
  const pr2 = data.pedigreeResearch;
  if (pr2 && (pr2.summary || pr2.narrative || pr2.analysis)) {
    doc.addPage();
    let y2 = pageHeader(doc);
    y2 = sectionTitle(doc, "Pedigree Research & Cross-Insight", y2);
    y2 = txt(doc, pr2.summary || pr2.narrative || pr2.analysis, M, y2, CW, 10, IVORY, 1.6);
  }

  // ═══ FINAL BLOODSTOCK CONCLUSION ═══
  if (data.conclusion && data.conclusion.trim().length > 0) {
    doc.addPage();
    let y3 = pageHeader(doc);
    y3 = sectionTitle(doc, "Final Bloodstock Conclusion", y3);
    rect(doc, M, y3, CW, 6, GOLD);
    y3 += 10;
    y3 = txt(doc, data.conclusion, M, y3, CW, 10, IVORY, 1.7);
  }

  // Footer pages
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(...MID);
    doc.text(`BloodstockAI® · Sale Inspection Analysis · Page ${p} of ${total}`, PW / 2, PH - 8, { align: "center" });
  }

  doc.save(`BloodstockAI_Inspection_${s(data.analysis.horse_name).replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

// ─── helpers ─────────────────────────────────────────────────────

function computeDimensions(data: InspectionReportData): Array<{ label: string; value: number }> {
  const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const pick = (key: string) => avg(
    data.blocks.map((b) => b?.score_breakdown?.[key]).filter((v: any) => typeof v === "number") as number[]
  );
  const conf = pick("conformation");
  const gait = pick("gait");
  const hoof = pick("hoof");
  const musc = pick("musculature");
  const pr = data.pedigreeResearch?.pedigree_rating;
  const pedigree = typeof pr === "number" ? Math.round(pr * 10) : 0;
  // Commercial proxy from adjustment %
  const adjPct = data.marketRoi?.adjustment?.pct;
  const commercial = typeof adjPct === "number" ? Math.max(30, Math.min(95, 70 + adjPct)) : 0;
  return [
    { label: "Conformation", value: conf },
    { label: "Gait", value: gait },
    { label: "Hoof", value: hoof },
    { label: "Muscle", value: musc },
    { label: "Pedigree", value: pedigree },
    { label: "Commercial", value: commercial },
  ];
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}