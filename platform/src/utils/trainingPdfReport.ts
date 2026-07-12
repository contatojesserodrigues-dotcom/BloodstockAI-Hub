import jsPDF from "jspdf";
import {
  addPdfPageFooters,
  captureElementAsImage,
  drawPdfCoverPage,
  drawPdfLineChart,
  drawPdfScoreBars,
  drawPdfSectionTitle,
  embedChartImage,
  sanitizePdfText,
} from "@/utils/pdfBrandKit";

const NAVY = [255, 255, 255] as const;
const GOLD = [170, 138, 30] as const;
const WHITE = [40, 40, 45] as const;
const LIGHT_GRAY = [248, 249, 250] as const;
const MID_GRAY = [110, 110, 115] as const;
const DARK_TEXT = [26, 26, 46] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const GOLD_BG = [255, 248, 231] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;
type RGB = readonly [number, number, number];

function sanitize(text: any): string {
  if (text === null || text === undefined) return "N/A";
  return String(text)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/[^\x00-\x7F]/g, (ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0xC0 && code <= 0x17F) return ch;
      if (code >= 0x2010 && code <= 0x2015) return "-";
      if (code === 0x2014) return " -- ";
      if (code >= 0x2018 && code <= 0x201F) return "'";
      if (code === 0x2026) return "...";
      return "";
    })
    .replace(/\s+/g, " ")
    .trim() || "N/A";
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB, fill = true) {
  doc.setFillColor(color[0], color[1], color[2]);
  if (fill) doc.rect(x, y, w, h, "F");
}

function addHeader(doc: jsPDF): number {
  drawRect(doc, 0, 0, PAGE_W, 14, NAVY);
  doc.setFontSize(8); doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]); doc.setFont("helvetica", "bold");
  doc.text("BloodstockAI — Training Analysis Report", PAGE_W / 2, 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${doc.getNumberOfPages()}`, PAGE_W - MARGIN, 8, { align: "right" });
  drawRect(doc, 0, 14, PAGE_W, 0.6, GOLD);
  return 22;
}

function addFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawRect(doc, 0, PAGE_H - 10, PAGE_W, 10, NAVY);
    drawRect(doc, 0, PAGE_H - 10, PAGE_W, 0.4, GOLD);
    doc.setFontSize(6); doc.setTextColor(MID_GRAY[0], MID_GRAY[1], MID_GRAY[2]);
    doc.text("BloodstockAI -- Confidential Training Report", MARGIN, PAGE_H - 4);
    doc.text(new Date().toLocaleDateString("en-GB"), PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }
}

function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > PAGE_H - 20) { doc.addPage(); return addHeader(doc); }
  return y;
}

function writeText(doc: jsPDF, text: string, x: number, y: number, maxW: number, fontSize: number, color: RGB, lineHeight = 1.6): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(sanitize(text), maxW);
  const lh = fontSize * 0.353 * lineHeight;
  for (const line of lines) {
    if (y > PAGE_H - 20) { doc.addPage(); y = addHeader(doc); }
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 15);
  drawRect(doc, MARGIN, y - 4, CONTENT_W, 8, GOLD_BG);
  doc.setFontSize(9); doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
  doc.text(sanitize(title).toUpperCase(), MARGIN + 3, y + 1);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, labelW = 40): number {
  doc.setFontSize(8); doc.setTextColor(MID_GRAY[0], MID_GRAY[1], MID_GRAY[2]); doc.text(sanitize(label), x, y);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
  doc.text(sanitize(value), x + labelW, y);
  doc.setFont("helvetica", "normal");
  return y + 5;
}

function scoreBar(doc: jsPDF, label: string, score: number, x: number, y: number, barW = 70): number {
  doc.setFontSize(7); doc.setTextColor(MID_GRAY[0], MID_GRAY[1], MID_GRAY[2]); doc.text(label, x, y);
  const color: RGB = score >= 80 ? GREEN : score >= 60 ? GOLD : RED;
  drawRect(doc, x + 50, y - 3, barW, 4, LIGHT_GRAY);
  drawRect(doc, x + 50, y - 3, barW * Math.max(0, Math.min(100, score)) / 100, 4, color);
  doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
  doc.text(`${score}`, x + 50 + barW + 3, y);
  doc.setFont("helvetica", "normal");
  return y + 7;
}

const SCORE_KEYS: Array<[string, string]> = [
  ["training_performance", "Training Performance"],
  ["race_readiness", "Race Readiness"],
  ["soundness_index", "Soundness Index"],
  ["mechanical_efficiency", "Mechanical Efficiency"],
  ["recovery", "Recovery"],
  ["fatigue_risk", "Fatigue Risk"],
  ["consistency", "Consistency"],
];

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function generateTrainingReportPDF(horse: any, analyses: any[], sessions: any[] = []): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const subtitle = [horse?.age ? `${horse.age}yo` : null, horse?.sex, horse?.breed].filter(Boolean).join(" · ");
  const dashboardChart = await captureElementAsImage("[data-pdf-chart='training-scores']");

  let y = await drawPdfCoverPage(doc, {
    reportTitle: "Training Performance Report",
    subtitle: subtitle || undefined,
    subject: sanitizePdfText(horse?.name || "Unnamed Horse"),
    meta: [`${analyses.length} session${analyses.length === 1 ? "" : "s"} analysed`],
  });

  // Aggregate scores
  const lastScores = analyses[analyses.length - 1]?.scores ?? {};
  const avgScores: Record<string, number> = {};
  for (const [k] of SCORE_KEYS) {
    avgScores[k] = average(analyses.map(a => Number(a?.scores?.[k])).filter(v => Number.isFinite(v)));
  }
  const overall = average(Object.values(avgScores).filter(v => v > 0));

  // Top score boxes
  const boxW = CONTENT_W / 3 - 2;
  const boxes = [
    { label: "Overall Training Score", value: `${overall}/100` },
    { label: "Sessions Analysed", value: `${analyses.length}` },
    { label: "Latest Readiness", value: `${lastScores?.race_readiness ?? "-"}/100` },
  ];
  for (let i = 0; i < 3; i++) {
    const bx = MARGIN + i * (boxW + 3);
    drawRect(doc, bx, y, boxW, 16, LIGHT_GRAY);
    doc.setFontSize(7); doc.setTextColor(MID_GRAY[0], MID_GRAY[1], MID_GRAY[2]);
    doc.text(boxes[i].label, bx + boxW / 2, y + 5, { align: "center" });
    doc.setFontSize(13); doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
    doc.text(sanitize(boxes[i].value), bx + boxW / 2, y + 13, { align: "center" });
    doc.setFont("helvetica", "normal");
  }
  y += 22;

  // Horse profile
  y = sectionTitle(doc, "Horse Profile", y);
  const leftX = MARGIN;
  const rightX = MARGIN + CONTENT_W / 2;
  let ly = y, ry = y;
  ly = labelValue(doc, "Name", String(horse?.name ?? "-"), leftX, ly);
  ly = labelValue(doc, "Age", horse?.age ? `${horse.age}yo` : "-", leftX, ly);
  ly = labelValue(doc, "Sex", String(horse?.sex ?? "-"), leftX, ly);
  ly = labelValue(doc, "Breed", String(horse?.breed ?? "-"), leftX, ly);
  ly = labelValue(doc, "Sire", String(horse?.sire ?? "-"), leftX, ly);
  ly = labelValue(doc, "Dam", String(horse?.dam ?? "-"), leftX, ly);
  ry = labelValue(doc, "Trainer", String(horse?.trainer ?? "-"), rightX, ry);
  ry = labelValue(doc, "Owner", String(horse?.owner ?? "-"), rightX, ry);
  ry = labelValue(doc, "Stable", String(horse?.stable ?? "-"), rightX, ry);
  ry = labelValue(doc, "Training Centre", String(horse?.training_centre ?? "-"), rightX, ry);
  ry = labelValue(doc, "Racing Code", String(horse?.racing_code ?? "-"), rightX, ry);
  ry = labelValue(doc, "Status", String(horse?.status ?? "-"), rightX, ry);
  y = Math.max(ly, ry) + 3;

  // Average Scores — brand kit charts
  y = drawPdfSectionTitle(doc, "Average Performance Scores", y, RT);
  y = drawPdfScoreBars(
    doc,
    y,
    RT,
    SCORE_KEYS.map(([k, label]) => ({ label, value: avgScores[k] ?? 0 })),
  );
  y += 2;

  if (dashboardChart) {
    y = drawPdfSectionTitle(doc, "Dashboard Snapshot", y, RT);
    y = await embedChartImage(doc, y, RT, dashboardChart, 58);
  }

  if (analyses.length >= 2) {
    y = drawPdfSectionTitle(doc, "Race Readiness Trend", y, RT);
    y = drawPdfLineChart(
      doc,
      y,
      RT,
      analyses.map((a) => ({
        label: new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: Number(a.scores?.race_readiness) || 0,
      })),
    );
  }

  if (sessions.length >= 2) {
    const gpsPoints = sessions
      .filter((s) => s?.avg_speed_kmh != null || s?.distance_km != null)
      .slice(-8);
    if (gpsPoints.length >= 2) {
      y = drawPdfSectionTitle(doc, "GPS Speed Trend", y, RT);
      y = drawPdfLineChart(
        doc,
        y,
        RT,
        gpsPoints.map((s, i) => ({
          label: s.session_date
            ? new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : `S${i + 1}`,
          value: Number(s.avg_speed_kmh ?? s.peak_speed_kmh ?? 0),
        })),
      );
    }
  }

  // Sessions table
  if (analyses.length > 0) {
    y = sectionTitle(doc, "Session Scores", y);
    const cols = ["Date", "Train", "Ready", "Sound", "Effic", "Recov", "Fatigue"];
    const colW = CONTENT_W / cols.length;
    doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, "F");
    doc.setFontSize(7); doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
    cols.forEach((c, i) => doc.text(c, MARGIN + i * colW + 2, y));
    doc.setFont("helvetica", "normal");
    y += 5;
    for (const a of analyses) {
      y = checkPage(doc, y, 7);
      const vals = [
        new Date(a.created_at).toLocaleDateString("en-GB"),
        String(a.scores?.training_performance ?? "-"),
        String(a.scores?.race_readiness ?? "-"),
        String(a.scores?.soundness_index ?? "-"),
        String(a.scores?.mechanical_efficiency ?? "-"),
        String(a.scores?.recovery ?? "-"),
        String(a.scores?.fatigue_risk ?? "-"),
      ];
      doc.setFontSize(7); doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
      vals.forEach((v, i) => doc.text(sanitize(v), MARGIN + i * colW + 2, y));
      y += 5;
    }
    y += 4;
  }

  // Per-session details
  for (const a of analyses) {
    doc.addPage();
    y = addHeader(doc);
    const date = new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    y = sectionTitle(doc, `Session -- ${date}`, y);

    // scores grid
    for (const [k, label] of SCORE_KEYS) {
      const v = Number(a?.scores?.[k]);
      if (!Number.isFinite(v)) continue;
      y = checkPage(doc, y, 10);
      y = scoreBar(doc, label, v, MARGIN, y);
    }

    if (a?.scores?.development_curve) {
      y = labelValue(doc, "Development Curve", String(a.scores.development_curve), MARGIN, y + 2, 50);
    }
    y += 2;

    if (a?.ai_narrative) {
      y = sectionTitle(doc, "AI Interpretation", y);
      y = writeText(doc, a.ai_narrative, MARGIN, y, CONTENT_W, 8, DARK_TEXT, 1.55);
      y += 3;
    }
    if (Array.isArray(a?.recommendations) && a.recommendations.length > 0) {
      y = sectionTitle(doc, "Recommendations", y);
      for (const r of a.recommendations) {
        y = checkPage(doc, y, 8);
        doc.setFontSize(8); doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]); doc.text("-", MARGIN, y);
        y = writeText(doc, String(r), MARGIN + 4, y, CONTENT_W - 4, 8, DARK_TEXT, 1.5);
        y += 1;
      }
    }

    if (a?.metrics && typeof a.metrics === "object") {
      const entries = Object.entries(a.metrics).filter(([, v]) => v !== null && v !== undefined && v !== "");
      if (entries.length > 0) {
        y = sectionTitle(doc, "Biomechanical Metrics", y);
        const halfW = CONTENT_W / 2;
        let col = 0; let baseY = y;
        for (const [k, v] of entries) {
          const xCol = MARGIN + (col % 2) * halfW;
          const rowIdx = Math.floor(col / 2);
          const yy = baseY + rowIdx * 5;
          if (yy > PAGE_H - 22) { doc.addPage(); baseY = addHeader(doc) - rowIdx * 5; }
          doc.setFontSize(7); doc.setTextColor(MID_GRAY[0], MID_GRAY[1], MID_GRAY[2]);
          doc.text(sanitize(k.replace(/_/g, " ")), xCol, yy);
          doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]); doc.setFont("helvetica", "bold");
          doc.text(sanitize(String(v)), xCol + 55, yy);
          doc.setFont("helvetica", "normal");
          col++;
        }
        y = baseY + Math.ceil(entries.length / 2) * 5 + 3;
      }
    }
  }

  // Disclaimer
  doc.addPage();
  y = addHeader(doc);
  y = sectionTitle(doc, "Disclaimer", y);
  y = writeText(
    doc,
    "This report is generated by BloodstockAI and is informational only. AI interpretation is not a veterinary diagnosis. Persistent biomechanical, vital-sign or soundness indicators should be reviewed by a qualified veterinarian or farrier.",
    MARGIN, y, CONTENT_W, 8, MID_GRAY, 1.6
  );

  addPdfPageFooters(doc, RT);
  return doc;
}

export function downloadTrainingReportPDF(horse: any, analyses: any[], sessions: any[] = []) {
  generateTrainingReportPDF(horse, analyses, sessions).then((doc) => {
    const name = (horse?.name || "Horse").replace(/\s+/g, "_");
    doc.save(`BloodstockAI_${name}_Training_Report.pdf`);
  });
}