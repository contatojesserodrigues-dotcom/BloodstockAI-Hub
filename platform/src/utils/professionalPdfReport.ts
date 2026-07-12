import jsPDF from "jspdf";
import logoFull from "@/assets/bloodstockai-logo-full.png";
import { logoReady, drawPdfCoverPage, drawPdfSectionTitle, drawPdfScoreBars, drawPdfLineChart, drawPdfBarChart, addPdfPageFooters, PDF_PAGE, pdfText, PDF_COLORS } from "@/utils/pdfBrandKit";

// ============================================================
// BloodstockAI - Professional PDF Report Generator v2
// ============================================================

let logoBase64: string | null = null;
const logoPromise = new Promise<void>((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 4;
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      logoBase64 = canvas.toDataURL("image/png", 1.0);
    }
    resolve();
  };
  img.onerror = () => resolve();
  img.src = logoFull;
});

// === COLORS === (Light theme — white background, professional)
const NAVY = [255, 255, 255] as const;        // page bg (white)
const GOLD = [170, 138, 30] as const;         // darker gold for contrast on white
const WHITE = [40, 40, 45] as const;          // re-purposed: primary text on white
const LIGHT_GRAY = [248, 249, 250] as const;
const MID_GRAY = [110, 110, 115] as const;
const FOOTER_GRAY = [140, 140, 145] as const;
const DARK_TEXT = [26, 26, 46] as const;
const BORDER_GRAY = [220, 215, 200] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const YELLOW = [202, 138, 4] as const;
const GOLD_BG = [255, 248, 231] as const;
const RED_BG = [255, 240, 240] as const;
const BLUE_BG = [240, 244, 255] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;

type RGB = readonly [number, number, number];

// === SANITIZE ===
function sanitize(text: any): string {
  if (text === null || text === undefined) return "N/A";
  const str = String(text);
  return str
    .replace(/[\u{1F4A1}\u{1F525}\u{1F4C8}\u{1F4CA}\u{1F3C6}\u{2B07}\u{FE0F}\u{2705}\u{26A0}\u{274C}\u{2B50}\u{1F50D}\u{1F9E0}\u{1F4C5}\u{1F4CB}\u{1F512}]/gu, "")
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
  doc.setFillColor(...color);
  doc.setDrawColor(...color);
  if (fill) doc.rect(x, y, w, h, "F");
  else doc.rect(x, y, w, h, "S");
}

function writeText(doc: jsPDF, text: string, x: number, y: number, maxW: number, fontSize: number, color: RGB, lineHeight = 1.6, align: "left" | "center" | "right" = "left"): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const safeText = sanitize(text);
  const lines = doc.splitTextToSize(safeText, maxW);
  const lh = fontSize * 0.353 * lineHeight;
  for (const line of lines) {
    if (y > PAGE_H - 20) {
      doc.addPage();
      y = addPageHeader(doc, "", "");
    }
    doc.text(line, x, y, { align });
    y += lh;
  }
  return y;
}

// === PAGE HEADER (every internal page) ===
function addPageHeader(doc: jsPDF, reportTitle: string, horseName: string): number {
  const y = 8;
  // Dark navy bar
  drawRect(doc, 0, 0, PAGE_W, 14, NAVY);
  // Logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", MARGIN, 1.5, 11, 11); } catch {}
  }
  // Center title
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  const centerText = reportTitle && horseName ? `${reportTitle} -- ${sanitize(horseName)}` : reportTitle || "";
  doc.text(centerText, PAGE_W / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  // Page number
  doc.text(`Page ${doc.getNumberOfPages()}`, PAGE_W - MARGIN, y, { align: "right" });
  // Gold line
  drawRect(doc, 0, 14, PAGE_W, 0.6, GOLD);
  return 20;
}

// === PAGE FOOTER (every internal page) ===
function addPageFooter(doc: jsPDF) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  // Gold line
  drawRect(doc, MARGIN, PAGE_H - 12, CONTENT_W, 0.4, GOLD);
  doc.setFontSize(7);
  doc.setTextColor(...FOOTER_GRAY);
  doc.text("Confidential -- BloodstockAI", MARGIN, PAGE_H - 7);
  doc.text("agentbloodstockai.com", PAGE_W / 2, PAGE_H - 7, { align: "center" });
  doc.text(`Generated ${date}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
}

// === Add footers to all pages ===
function addAllFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) { // Skip cover page
    doc.setPage(i);
    addPageFooter(doc);
  }
}

// === SECTION HEADER ===
function addSectionTitle(doc: jsPDF, title: string, y: number, reportTitle = "", horseName = ""): number {
  if (y > PAGE_H - 35) { doc.addPage(); y = addPageHeader(doc, reportTitle, horseName); }
  y += 6;
  // Gold left border
  drawRect(doc, MARGIN, y - 4, 3, 7, GOLD);
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(title).toUpperCase(), MARGIN + 6, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  return y;
}

// === TABLE ===
function addTable(doc: jsPDF, headers: string[], rows: string[][], y: number, colWidths?: number[], reportTitle = "", horseName = ""): number {
  if (y > PAGE_H - 40) { doc.addPage(); y = addPageHeader(doc, reportTitle, horseName); }
  const cols = headers.length;
  const defaultW = CONTENT_W / cols;
  const widths = colWidths || headers.map(() => defaultW);
  const cellPadH = 3;
  const cellPadV = 2.5;

  // Header row
  let x = MARGIN;
  const headerH = 9;
  drawRect(doc, MARGIN, y - 5, CONTENT_W, headerH, NAVY);
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  for (let i = 0; i < cols; i++) {
    doc.text(sanitize(headers[i]).substring(0, Math.floor(widths[i] / 2)), x + cellPadH, y);
    x += widths[i];
  }
  y += headerH - 3;
  doc.setFont("helvetica", "normal");

  // Data rows
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    if (y > PAGE_H - 20) { doc.addPage(); y = addPageHeader(doc, reportTitle, horseName); }
    
    const rowH = 8;
    // Alternating row bg
    if (rIdx % 2 === 0) drawRect(doc, MARGIN, y - 4.5, CONTENT_W, rowH, LIGHT_GRAY);
    // Border
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH - 4.5, MARGIN + CONTENT_W, y + rowH - 4.5);
    
    x = MARGIN;
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    for (let i = 0; i < cols; i++) {
      const val = sanitize(row[i] || "");
      const maxChars = Math.floor(widths[i] / 2);
      doc.text(val.substring(0, maxChars), x + cellPadH, y);
      x += widths[i];
    }
    y += rowH - 1;
  }
  return y + 4;
}

// === SCORE GAUGE ===
function addScoreGauge(doc: jsPDF, label: string, score: number, x: number, y: number, w: number) {
  const color: RGB = score >= 70 ? GREEN : score >= 55 ? YELLOW : RED;
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(label), x, y);
  doc.setFont("helvetica", "normal");
  drawRect(doc, x, y + 2, w, 5, [230, 230, 230]);
  drawRect(doc, x, y + 2, w * (Math.min(score, 100) / 100), 5, color);
  doc.setFontSize(9);
  doc.setTextColor(...color);
  doc.setFont("helvetica", "bold");
  doc.text(`${score}/100`, x + w + 4, y + 6);
  doc.setFont("helvetica", "normal");
}

// === INSIGHT BOX ===
function addInsightBox(doc: jsPDF, text: string, y: number, type: "gold" | "red" | "blue" = "gold", reportTitle = "", horseName = ""): number {
  if (y > PAGE_H - 30) { doc.addPage(); y = addPageHeader(doc, reportTitle, horseName); }
  const bg: RGB = type === "gold" ? GOLD_BG : type === "red" ? RED_BG : BLUE_BG;
  const border: RGB = type === "gold" ? GOLD : type === "red" ? RED : NAVY;
  const boxH = Math.max(12, Math.ceil(sanitize(text).length / 80) * 5 + 8);
  drawRect(doc, MARGIN, y, CONTENT_W, boxH, bg);
  drawRect(doc, MARGIN, y, 3, boxH, border);
  const endY = writeText(doc, text, MARGIN + 7, y + 5, CONTENT_W - 10, 9, DARK_TEXT, 1.5);
  return Math.max(endY, y + boxH) + 3;
}

// === BULLET LIST ===
function addBulletList(doc: jsPDF, items: string[], y: number, color: RGB = DARK_TEXT, icon = ">>", reportTitle = "", horseName = ""): number {
  for (const item of items) {
    if (!item) continue;
    if (y > PAGE_H - 20) { doc.addPage(); y = addPageHeader(doc, reportTitle, horseName); }
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(icon, MARGIN + 2, y);
    y = writeText(doc, item, MARGIN + 10, y, CONTENT_W - 12, 9, color, 1.5);
    y += 2;
  }
  return y;
}

// ============================================================
// COVER PAGE — Completely Redesigned
// ============================================================
function renderCover(doc: jsPDF, opts: {
  reportType: string;
  horseName: string;
  sireXDam?: string;
  date: string;
  score?: number;
  verdict?: string;
  reportId?: string;
}) {
  // Full navy background
  drawRect(doc, 0, 0, PAGE_W, PAGE_H, NAVY);

  // === TOP SECTION (25%) — Logo left, horse icon text right ===
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", MARGIN, 16, 40, 40); } catch {}
  }
  // Horse icon placeholder (text-based)
  doc.setFontSize(36);
  doc.setTextColor(...GOLD);
  doc.text("BSA", PAGE_W - MARGIN - 2, 42, { align: "right" });
  
  // Gold divider
  drawRect(doc, MARGIN, 62, CONTENT_W, 1, GOLD);

  // === MIDDLE SECTION (50%) ===
  const midY = 90;
  
  // Report type label
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(opts.reportType).toUpperCase(), PAGE_W / 2, midY, { align: "center" });
  
  // Horse name
  doc.setFontSize(36);
  doc.setTextColor(...WHITE);
  const nameLines = doc.splitTextToSize(sanitize(opts.horseName), CONTENT_W - 20);
  let ny = midY + 20;
  for (const l of nameLines) {
    doc.text(l, PAGE_W / 2, ny, { align: "center" });
    ny += 15;
  }
  
  // Sire x Dam
  if (opts.sireXDam) {
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "italic");
    doc.text(sanitize(opts.sireXDam), PAGE_W / 2, ny + 4, { align: "center" });
    ny += 14;
  }
  doc.setFont("helvetica", "normal");
  
  // Small gold rule centered (80px = ~30mm)
  drawRect(doc, PAGE_W / 2 - 15, ny + 6, 30, 0.8, GOLD);
  ny += 18;

  // Three info pills
  const pillW = 46;
  const pillH = 9;
  const pillGap = 6;
  const totalPillW = pillW * 3 + pillGap * 2;
  const pillStartX = (PAGE_W - totalPillW) / 2;
  const pillY = ny;

  const pills = [
    opts.date,
    `Report #${opts.reportId || "BSA-001"}`,
    "Confidential",
  ];
  
  for (let i = 0; i < 3; i++) {
    const px = pillStartX + i * (pillW + pillGap);
    // Dark rounded box
    drawRect(doc, px, pillY, pillW, pillH, [30, 30, 35]);
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text(pills[i], px + pillW / 2, pillY + 6, { align: "center" });
  }

  // === BOTTOM SECTION (25%) ===
  const bottomY = 195;

  // Score circle
  if (opts.score && opts.score > 0) {
    const cx = PAGE_W / 2;
    const cy = bottomY + 10;
    const r = 18;
    // Gold ring
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(2);
    doc.circle(cx, cy, r, "S");
    // Score number
    doc.setFontSize(28);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(`${opts.score}`, cx, cy + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("/100", cx + 12, cy + 4);
    // Label
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("BloodstockAI Score", cx, cy + r + 7, { align: "center" });

    // Verdict badge
    if (opts.verdict) {
      const vy = cy + r + 15;
      const v = sanitize(opts.verdict).toUpperCase();
      const vColor: RGB = v === "BUY" || v === "BREED" || v === "PROCEED" ? GREEN : v === "HOLD" || v === "CONSIDER" ? YELLOW : RED;
      const badgeW = 50;
      const badgeH = 12;
      drawRect(doc, cx - badgeW / 2, vy, badgeW, badgeH, vColor);
      // Rounded corners simulated
      doc.setFontSize(14);
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.text(v, cx, vy + 9, { align: "center" });
      doc.setFont("helvetica", "normal");
    }
  }

  // Confidential watermark
  try {
    doc.setFontSize(40);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
    doc.text("CONFIDENTIAL", PAGE_W / 2, PAGE_H / 2 + 20, { align: "center", angle: 45 });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch {}

  // Gold divider above footer
  drawRect(doc, MARGIN, PAGE_H - 25, CONTENT_W, 0.6, GOLD);
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("Powered by AI \u2014 BloodstockAI", PAGE_W / 2, PAGE_H - 16, { align: "center" });
}

// ============================================================
// Disclaimer Page
// ============================================================
function renderDisclaimer(doc: jsPDF, date: string, reportTitle: string, horseName: string) {
  doc.addPage();
  let y = addPageHeader(doc, reportTitle, horseName);
  y = addSectionTitle(doc, "DISCLAIMER & DATA SOURCES", y);
  
  y = addInsightBox(doc, "This report has been generated by BloodstockAI using artificial intelligence. The analysis is based on publicly available data from verified thoroughbred racing databases. It does not constitute financial, investment, or breeding advice.", y, "gold");
  y += 2;

  const items = [
    "Past performance does not guarantee future results",
    "All scores and ratings are AI-generated estimates",
    "Users should conduct their own due diligence",
    "BloodstockAI is not responsible for losses from using this report",
  ];
  y = addBulletList(doc, items, y, DARK_TEXT, ">>");
  y += 6;

  y = addSectionTitle(doc, "DATA SOURCES", y);
  y = addInsightBox(doc, "Data sourced from verified international racing databases. AI-powered analysis by BloodstockAI.", y, "blue");
  y += 6;

  y = addSectionTitle(doc, "CONTACT", y);
  doc.setFontSize(10);
  doc.setTextColor(...DARK_TEXT);
  doc.text("BloodstockAI -- agentbloodstockai.com", MARGIN, y);
  y += 5;
  doc.text("Email: office@agentbloodstockai.com", MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...FOOTER_GRAY);
  doc.text(`Report Generated: ${date}`, MARGIN, y + 5);
}

// ============================================================
// PUBLIC: Generate Search/Analysis Report PDF (Full)
// ============================================================
export async function generateSearchReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const horseName = data.name || "Unknown Horse";
  const sireXDam = data.pedigree?.sire && data.pedigree?.dam ? `${sanitize(data.pedigree.sire)} x ${sanitize(data.pedigree.dam)}` : undefined;
  const verdict = data.recommendation?.toUpperCase().includes("BUY") ? "BUY" : data.recommendation?.toUpperCase().includes("SELL") || data.recommendation?.toUpperCase().includes("AVOID") ? "AVOID" : "HOLD";
  const RT = "Full Analysis Report";

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: sireXDam,
    subject: horseName,
    meta: [
      data.score ? `Overall Score: ${data.score}/100` : "",
      `Verdict: ${verdict}`,
    ].filter(Boolean),
  });

  y = drawPdfSectionTitle(doc, "EXECUTIVE SUMMARY", y, RT);

  // Score + Verdict row
  if (data.score) {
    drawRect(doc, MARGIN, y, CONTENT_W, 28, LIGHT_GRAY);
    drawRect(doc, MARGIN, y, 3, 28, GOLD);
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    doc.text("OVERALL AI SCORE", MARGIN + 8, y + 7);
    doc.setFontSize(24);
    const scoreColor: RGB = data.score >= 70 ? GREEN : data.score >= 55 ? YELLOW : RED;
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.score}/100`, MARGIN + 8, y + 22);
    doc.setFont("helvetica", "normal");
    
    // Verdict pill
    const vColor: RGB = verdict === "BUY" ? GREEN : verdict === "AVOID" ? RED : YELLOW;
    drawRect(doc, MARGIN + CONTENT_W - 50, y + 6, 45, 16, vColor);
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(verdict, MARGIN + CONTENT_W - 28, y + 17, { align: "center" });
    doc.setFont("helvetica", "normal");
    y += 34;
  }

  // Key insights
  if (data.key_insights?.length) {
    y = addSectionTitle(doc, "KEY FINDINGS", y, RT, horseName);
    y = addBulletList(doc, data.key_insights.slice(0, 5), y, DARK_TEXT, ">>", RT, horseName);
    y += 4;
  }

  // Quick horse info
  const infoItems = [
    ["Owner", data.current_owner],
    ["Breeder", data.breeder],
    ["Trainer", data.trainer],
    ["Year", data.year_of_birth],
    ["Sex", data.sex],
    ["Country", data.country],
    ["Color", data.color],
  ].filter(([, v]) => v && v !== "Not found in verified sources" && v !== "N/A" && v !== 0);
  
  if (infoItems.length) {
    y = addSectionTitle(doc, "HORSE PROFILE", y, RT, horseName);
    y = addTable(doc, ["Detail", "Value"],
      infoItems.map(([k, v]) => [String(k), sanitize(v)]),
      y, [50, CONTENT_W - 50], RT, horseName);
    y += 2;
  }

  // Scores section
  if (data.scores) {
    y = drawPdfSectionTitle(doc, "SCORES & RATINGS", y, RT);
    const scoreEntries = [
      { label: "Pedigree Quality", value: Number(data.scores.pedigree_quality) || 0 },
      { label: "Performance Rating", value: Number(data.scores.performance_rating) || 0 },
      { label: "Nick Score", value: Number(data.scores.nick_score) || 0 },
      { label: "Dosage Score", value: Number(data.scores.dosage_score) || 0 },
      { label: "Overall", value: Number(data.scores.overall) || 0 },
    ].filter((s) => s.value > 0);
    if (scoreEntries.length) y = drawPdfScoreBars(doc, y, RT, scoreEntries);
    y += 2;
  }

  // Page 3+: Detailed Analysis
  doc.addPage();
  y = addPageHeader(doc, RT, horseName);

  // Pedigree
  if (data.pedigree) {
    y = addSectionTitle(doc, "PEDIGREE", y, RT, horseName);
    const pedigreeRows: string[][] = [
      ["Sire", sanitize(data.pedigree.sire)],
      ["Dam", sanitize(data.pedigree.dam)],
      ["Dam Sire", sanitize(data.pedigree.dam_sire)],
    ];
    if (data.pedigree.sire_sire) pedigreeRows.push(["Sire's Sire", sanitize(data.pedigree.sire_sire)]);
    if (data.pedigree.sire_dam) pedigreeRows.push(["Sire's Dam", sanitize(data.pedigree.sire_dam)]);
    if (data.pedigree.dam_dam) pedigreeRows.push(["Dam's Dam", sanitize(data.pedigree.dam_dam)]);
    y = addTable(doc, ["Relationship", "Name"], pedigreeRows, y, [55, CONTENT_W - 55], RT, horseName);
    
    if (data.pedigree.generation_3?.length) {
      y = addInsightBox(doc, `3rd Generation: ${data.pedigree.generation_3.map((a: string) => sanitize(a)).join(", ")}`, y, "blue", RT, horseName);
    }
    if (data.pedigree.generation_4?.length) {
      y = addInsightBox(doc, `4th Generation: ${data.pedigree.generation_4.map((a: string) => sanitize(a)).join(", ")}`, y, "blue", RT, horseName);
    }
    y += 2;
  }

  // Inbreeding
  if (data.inbreeding) {
    y = addSectionTitle(doc, "INBREEDING ANALYSIS", y, RT, horseName);
    y = addTable(doc, ["Metric", "Value"], [
      ["Pattern", sanitize(data.inbreeding.pattern)],
      ["Coefficient", sanitize(data.inbreeding.coefficient)],
      ["Assessment", sanitize(data.inbreeding.assessment)],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    if (data.inbreeding.details) {
      const boxType = data.inbreeding.assessment === "Concerning" ? "red" : "gold";
      y = addInsightBox(doc, data.inbreeding.details, y, boxType as any, RT, horseName);
    }
    y += 2;
  }

  // Dosage
  if (data.dosage) {
    y = addSectionTitle(doc, "DOSAGE PROFILE", y, RT, horseName);
    y = addTable(doc, ["Metric", "Value"], [
      ["Profile (B-I-C-S-P)", sanitize(data.dosage.profile)],
      ["Dosage Index", sanitize(data.dosage.dosage_index)],
      ["Center of Distribution", sanitize(data.dosage.center_of_distribution)],
      ["Distance Aptitude", sanitize(data.dosage.distance_aptitude)],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    if (data.dosage.details) {
      y = addInsightBox(doc, data.dosage.details, y, "gold", RT, horseName);
    }
    y += 2;
  }

  // Nick Analysis
  if (data.nick_analysis) {
    y = addSectionTitle(doc, "NICK ANALYSIS", y, RT, horseName);
    const n = data.nick_analysis;
    const ratingColor = n.rating?.startsWith("A") ? "gold" : n.rating?.startsWith("B") ? "blue" : "red";
    y = addTable(doc, ["Metric", "Value"], [
      ["Cross Pattern", sanitize(n.cross)],
      ["Nick Rating", sanitize(n.rating)],
      ["Stakes Winners from Cross", sanitize(n.stakes_winners_from_cross)],
      ["AEI", sanitize(n.aei || "N/A")],
      ["Recommendation", sanitize(n.recommendation || "N/A")],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    if (n.justification) {
      y = addInsightBox(doc, n.justification, y, ratingColor as any, RT, horseName);
    }
    y += 2;
  }

  // Career Stats
  if (data.career_stats) {
    y = addSectionTitle(doc, "CAREER OVERVIEW", y, RT, horseName);
    const c = data.career_stats;
    y = addTable(doc, ["Metric", "Value"], [
      ["Record", `${c.starts || 0}-${c.wins || 0}-${c.seconds || 0}-${c.thirds || 0}`],
      ["Win Rate", sanitize(c.win_rate)],
      ["Earnings", `${c.earnings_currency || "$"} ${(c.earnings || 0).toLocaleString()}`],
      ["Best Speed Figure", sanitize(c.best_speed_figure)],
      ["Best Distance", sanitize(c.best_distance)],
      ["Best Surface", sanitize(c.best_surface)],
      ["Highest Class", sanitize(c.highest_class)],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    y += 2;
  }

  // Performance records
  if (data.performance?.length) {
    y = addSectionTitle(doc, "RACE RECORD", y, RT, horseName);
    y = addTable(doc,
      ["Date", "Race", "Track", "Dist", "Pos", "Prize", "Type"],
      data.performance.slice(0, 15).map((r: any) => [
        sanitize(r.date), sanitize(r.race_name || ""), sanitize(r.track), String(r.distance || ""), String(r.position || ""),
        r.prize_money ? `$${Number(r.prize_money).toLocaleString()}` : "", sanitize(r.race_type),
      ]),
      y, [22, 32, 25, 16, 12, 28, 35], RT, horseName
    );
    y += 2;
  }

  // Siblings
  if (data.siblings_analysis) {
    y = addSectionTitle(doc, "SIBLINGS ANALYSIS", y, RT, horseName);
    const s = data.siblings_analysis;
    y = addTable(doc, ["Metric", "Value"], [
      ["Total Foals", String(s.total_foals || "N/A")],
      ["Total Raced", String(s.total_raced || "N/A")],
      ["Winners", String(s.total_winners || "N/A")],
      ["Stakes Winners", `${s.stakes_winners || "N/A"} (${s.stakes_percentage || "N/A"})`],
      ["Best Sibling", sanitize(s.best_sibling)],
      ["Dam Rating", sanitize(s.dam_rating)],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    
    if (s.details?.length) {
      y += 2;
      y = addTable(doc,
        ["Name", "Year", "Sire", "Record", "Best Achievement"],
        s.details.map((d: any) => [
          sanitize(d.name), String(d.year || ""), sanitize(d.sire), sanitize(d.record), sanitize(d.best_achievement),
        ]),
        y, [30, 14, 30, 25, CONTENT_W - 99], RT, horseName
      );
    }
    y += 2;
  }

  // Sales history
  if (data.sales?.length && data.sales[0]?.sale_price > 0) {
    y = addSectionTitle(doc, "SALES HISTORY", y, RT, horseName);
    y = addTable(doc,
      ["Date", "Auction", "Sale", "Price", "Buyer", "Seller"],
      data.sales.map((s: any) => [
        sanitize(s.date), sanitize(s.auction_house), sanitize(s.sale_name || ""),
        s.sale_price ? `$${Number(s.sale_price).toLocaleString()}` : "N/A",
        sanitize(s.buyer || ""), sanitize(s.seller || ""),
      ]),
      y, [22, 30, 28, 28, 30, 32], RT, horseName
    );
    y += 2;
  }

  // Market Value
  if (data.market_value) {
    y = addSectionTitle(doc, "MARKET VALUATION", y, RT, horseName);
    const mv = data.market_value;
    y = addTable(doc, ["Metric", "Value"], [
      ["Estimated Low", mv.estimated_low ? `$${Number(mv.estimated_low).toLocaleString()}` : "N/A"],
      ["Estimated Mid", mv.estimated_mid ? `$${Number(mv.estimated_mid).toLocaleString()}` : "N/A"],
      ["Estimated High", mv.estimated_high ? `$${Number(mv.estimated_high).toLocaleString()}` : "N/A"],
      ["Verdict", sanitize(mv.verdict)],
    ], y, [55, CONTENT_W - 55], RT, horseName);
    if (mv.methodology) {
      y = addInsightBox(doc, mv.methodology, y, "gold", RT, horseName);
    }
    if (mv.comparable_sales?.length) {
      y += 2;
      y = addTable(doc,
        ["Horse", "Sire", "Sex", "Sale", "Year", "Price"],
        mv.comparable_sales.map((cs: any) => [
          sanitize(cs.horse), sanitize(cs.sire), sanitize(cs.sex), sanitize(cs.sale), sanitize(cs.year), sanitize(cs.price),
        ]),
        y, [30, 28, 16, 30, 16, CONTENT_W - 120], RT, horseName
      );
    }
    if (mv.verdict_justification) {
      y = addInsightBox(doc, mv.verdict_justification, y, mv.verdict?.toUpperCase() === "BUY" ? "gold" : "red", RT, horseName);
    }
    y += 2;
  }

  // Recommendation
  if (data.recommendation) {
    y = addSectionTitle(doc, "PROFESSIONAL RECOMMENDATION", y, RT, horseName);
    y = addInsightBox(doc, data.recommendation, y, "gold", RT, horseName);
  }

  renderDisclaimer(doc, date, RT, horseName);
  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// PUBLIC: Generate Summary Report (2 pages)
// ============================================================
export async function generateSummaryReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const horseName = data.name || "Unknown Horse";
  const sireXDam = data.pedigree?.sire && data.pedigree?.dam ? `${sanitize(data.pedigree.sire)} x ${sanitize(data.pedigree.dam)}` : undefined;
  const verdict = data.recommendation?.toUpperCase().includes("BUY") ? "BUY" : data.recommendation?.toUpperCase().includes("SELL") || data.recommendation?.toUpperCase().includes("AVOID") ? "AVOID" : "HOLD";
  const RT = "Quick Summary Report";

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: sireXDam,
    subject: horseName,
    meta: [
      data.score ? `Overall Score: ${data.score}/100` : "",
      `Verdict: ${verdict}`,
    ].filter(Boolean),
  });

  // Snapshot content (page 2 opened by cover)
  if (data.key_insights?.length) {
    y = drawPdfSectionTitle(doc, "KEY FINDINGS", y, RT);
    y = addBulletList(doc, data.key_insights.slice(0, 5), y, DARK_TEXT, ">>");
    y += 4;
  }

  // 4-box stats grid
  y = addSectionTitle(doc, "KEY METRICS", y);
  const boxW = (CONTENT_W - 6) / 2;
  const boxH = 18;
  const metrics = [
    ["Overall Score", `${data.score || "N/A"}/100`],
    ["Market Value", data.market_value?.estimated_mid ? `$${Number(data.market_value.estimated_mid).toLocaleString()}` : "N/A"],
    ["Nick Rating", data.nick_analysis?.rating || "N/A"],
    ["Verdict", verdict],
  ];
  for (let i = 0; i < 4; i++) {
    const bx = MARGIN + (i % 2) * (boxW + 6);
    const by = y + Math.floor(i / 2) * (boxH + 4);
    drawRect(doc, bx, by, boxW, boxH, LIGHT_GRAY);
    drawRect(doc, bx, by, 3, boxH, GOLD);
    doc.setFontSize(8);
    doc.setTextColor(...MID_GRAY);
    doc.text(metrics[i][0], bx + 7, by + 6);
    doc.setFontSize(14);
    doc.setTextColor(...DARK_TEXT);
    doc.setFont("helvetica", "bold");
    doc.text(metrics[i][1], bx + 7, by + 14);
    doc.setFont("helvetica", "normal");
  }
  y += boxH * 2 + 12;

  // Strengths vs Risks
  const strengths = data.key_insights?.slice(0, 3) || [];
  y = addSectionTitle(doc, "TOP STRENGTHS", y);
  y = addBulletList(doc, strengths, y, GREEN, "+");
  y += 2;

  // Page 3: Quick Data
  doc.addPage();
  y = addPageHeader(doc, "Quick Summary", horseName);

  // Pedigree summary
  if (data.pedigree) {
    y = addSectionTitle(doc, "PEDIGREE SUMMARY", y);
    y = addTable(doc, ["Relationship", "Name"], [
      ["Sire", sanitize(data.pedigree.sire)],
      ["Dam", sanitize(data.pedigree.dam)],
      ["Dam Sire", sanitize(data.pedigree.dam_sire)],
    ], y, [55, CONTENT_W - 55]);
    y += 4;
  }

  // Career highlights (top 3)
  if (data.performance?.length) {
    y = addSectionTitle(doc, "CAREER HIGHLIGHTS", y);
    y = addTable(doc,
      ["Date", "Race", "Track", "Pos", "Prize"],
      data.performance.slice(0, 3).map((r: any) => [
        sanitize(r.date), sanitize(r.race_name || r.race_type || ""), sanitize(r.track),
        String(r.position || ""), r.prize_money ? `$${Number(r.prize_money).toLocaleString()}` : "",
      ]),
      y, [25, 40, 35, 15, CONTENT_W - 115]
    );
    y += 4;
  } else if (data.career_stats) {
    y = addSectionTitle(doc, "CAREER STATS", y);
    const c = data.career_stats;
    y = addTable(doc, ["Metric", "Value"], [
      ["Record", `${c.starts || 0}-${c.wins || 0}-${c.seconds || 0}-${c.thirds || 0}`],
      ["Earnings", `${c.earnings_currency || "$"} ${(c.earnings || 0).toLocaleString()}`],
      ["Best Distance", sanitize(c.best_distance)],
    ], y, [55, CONTENT_W - 55]);
    y += 4;
  }

  // Market value range
  if (data.market_value?.comparable_sales?.length) {
    y = addSectionTitle(doc, "COMPARABLE SALES", y);
    y = addTable(doc,
      ["Horse", "Sale", "Price"],
      data.market_value.comparable_sales.slice(0, 3).map((cs: any) => [
        sanitize(cs.horse), sanitize(cs.sale), sanitize(cs.price),
      ]),
      y, [50, 50, CONTENT_W - 100]
    );
    y += 4;
  }

  // Final recommendation
  if (data.recommendation) {
    y = addSectionTitle(doc, "RECOMMENDATION", y);
    y = addInsightBox(doc, data.recommendation, y, "gold");
  }

  // Footer
  y += 10;
  drawRect(doc, MARGIN, y, CONTENT_W, 0.6, GOLD);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("BloodstockAI -- agentbloodstockai.com", PAGE_W / 2, y, { align: "center" });

  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// PUBLIC: Generate Performance Report PDF
// ============================================================
export async function generatePerformanceReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const horseName = data.horse_name || "Unknown Horse";
  const RT = "Performance Analysis";
  const careerMeta: string[] = [];
  if (data.career) {
    careerMeta.push(`${data.career.starts ?? 0} starts · ${data.career.wins ?? 0} wins`);
    if (data.career.earnings) careerMeta.push(`Earnings: ${sanitize(data.career.earnings)}`);
  }

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: data.scores?.speed_rating ? `Speed Rating: ${data.scores.speed_rating}/100` : undefined,
    subject: horseName,
    meta: careerMeta,
  });

  y = drawPdfSectionTitle(doc, "EXECUTIVE SUMMARY", y, RT);

  if (data.scores) {
    const scoreItems = [
      { label: "Speed Rating", value: Number(data.scores.speed_rating) || 0 },
      { label: "Consistency", value: Number(data.scores.consistency) || 0 },
    ].filter((s) => s.value > 0);
    if (scoreItems.length) y = drawPdfScoreBars(doc, y, RT, scoreItems);
  }

  if (data.recent_form?.length >= 2) {
    y = drawPdfSectionTitle(doc, "RECENT FORM TREND", y, RT);
    const formPoints = [...data.recent_form].reverse().slice(0, 8).map((r: any) => {
      const fig = String(r.figure ?? "").replace(/[^\d.]/g, "");
      return {
        label: sanitize(r.date).slice(0, 8),
        value: Number(fig) || 0,
      };
    }).filter((p: { value: number }) => p.value > 0);
    if (formPoints.length >= 2) y = drawPdfLineChart(doc, y, RT, formPoints);
  }

  if (data.distance) {
    y = drawPdfSectionTitle(doc, "DISTANCE PROFILE", y, RT);
    const sprint = Number(data.distance.sprint_pct ?? data.distance.sprint) || 0;
    const mile = Number(data.distance.mile_pct ?? data.distance.mile) || 0;
    const classic = Number(data.distance.classic_pct ?? data.distance.classic) || 0;
    if (sprint + mile + classic > 0) {
      y = drawPdfBarChart(doc, y, RT, [
        { label: "Sprint", value: sprint },
        { label: "Mile", value: mile },
        { label: "Classic", value: classic },
      ]);
    }
  }

  if (data.career) {
    y = addSectionTitle(doc, "CAREER OVERVIEW", y, RT, horseName);
    const c = data.career;
    y = addTable(doc,
      ["Starts", "Wins", "Win%", "Places", "Earnings"],
      [[String(c.starts || 0), String(c.wins || 0), `${c.win_percentage || 0}%`, String(c.places || 0), sanitize(c.earnings)]],
      y, undefined, RT, horseName
    );
    y += 4;
  }

  if (data.speed_figures) {
    y = addSectionTitle(doc, "SPEED FIGURES", y, RT, horseName);
    const sf = data.speed_figures;
    y = addTable(doc,
      ["Best RPR", "Best Beyer", "Best Timeform", "Avg Last 5", "Trend"],
      [[String(sf.best_rpr ?? "N/A"), String(sf.best_beyer ?? "N/A"), String(sf.best_timeform ?? "N/A"), String(sf.avg_last_5 ?? "N/A"), sanitize(sf.trend)]],
      y, undefined, RT, horseName
    );
    y += 4;
  }

  if (data.recent_form?.length) {
    y = addSectionTitle(doc, `LAST ${data.recent_form.length} RUNS`, y, RT, horseName);
    y = addTable(doc,
      ["Date", "Race", "Track", "Dist", "Going", "Pos", "Figure"],
      data.recent_form.map((r: any) => [
        sanitize(r.date), sanitize(r.race), sanitize(r.track), sanitize(r.distance), sanitize(r.going), sanitize(r.position), sanitize(r.figure),
      ]),
      y, [22, 32, 25, 18, 20, 14, 18], RT, horseName
    );
    y += 4;
  }

  if (data.distance) {
    y = addSectionTitle(doc, "DISTANCE ANALYSIS", y, RT, horseName);
    y = addTable(doc, ["Best Distance", "Optimal Range", "Avoid"], [
      [sanitize(data.distance.best_distance), sanitize(data.distance.optimal_range), sanitize(data.distance.distances_to_avoid)]
    ], y, undefined, RT, horseName);
    y += 4;
  }

  if (data.surface) {
    y = addSectionTitle(doc, "SURFACE ANALYSIS", y, RT, horseName);
    y = addTable(doc, ["Dirt", "Turf", "Synthetic", "Preference"], [
      [sanitize(data.surface.dirt), sanitize(data.surface.turf), sanitize(data.surface.synthetic), sanitize(data.surface.preference)]
    ], y, undefined, RT, horseName);
    y += 4;
  }

  if (data.class_analysis) {
    y = addSectionTitle(doc, "CLASS ANALYSIS", y, RT, horseName);
    const cls = data.class_analysis;
    y = addTable(doc, ["Best", "G1", "G2", "G3", "Listed"], [
      [sanitize(cls.best_class), sanitize(cls.g1_record), sanitize(cls.g2_record), sanitize(cls.g3_record), sanitize(cls.listed_record)]
    ], y, undefined, RT, horseName);
    y += 4;
  }

  if (data.connections) {
    y = addSectionTitle(doc, "CONNECTIONS", y, RT, horseName);
    const cn = data.connections;
    y = addTable(doc, ["Trainer", "Win Rate", "Owner", "Jockey"], [
      [sanitize(cn.trainer), sanitize(cn.trainer_win_rate), sanitize(cn.owner), sanitize(cn.jockey)]
    ], y, undefined, RT, horseName);
    y += 4;
  }

  if (data.insights?.length) {
    y = addSectionTitle(doc, "KEY INSIGHTS", y, RT, horseName);
    y = addBulletList(doc, data.insights.filter((i: any) => i), y, DARK_TEXT, ">>", RT, horseName);
    y += 4;
  }

  if (data.recommendation) {
    y = addSectionTitle(doc, "RECOMMENDATION", y, RT, horseName);
    y = addInsightBox(doc, data.recommendation, y, "gold", RT, horseName);
  }

  if (data.report_text) {
    y = addSectionTitle(doc, "DETAILED REPORT", y, RT, horseName);
    y = writeText(doc, data.report_text, MARGIN, y, CONTENT_W, 9, DARK_TEXT, 1.6);
  }

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  renderDisclaimer(doc, date, RT, horseName);
  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// PUBLIC: Generate Mating Report PDF
// ============================================================
export { generateMatingReportPDF } from "@/utils/matingPdfReport";

// ============================================================
// PUBLIC: Generate Comparison Report PDF
// ============================================================
export async function generateComparisonReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const names = data.horses?.map((h: any) => sanitize(h.name)).join(" vs ") || "Comparison";
  const RT = "Horse Comparison";

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: `${data.horses?.length ?? 0} horses compared`,
    subject: names.length > 60 ? `${names.slice(0, 57)}…` : names,
  });

  y = drawPdfSectionTitle(doc, "EXECUTIVE SUMMARY", y, RT);

  if (data.executive_summary?.length) {
    y = addBulletList(doc, data.executive_summary, y, DARK_TEXT, ">>", RT, names);
    y += 4;
  }
  if (data.best_performer) {
    y = addInsightBox(doc, `Best Performer: ${data.best_performer}`, y, "gold", RT, names);
  }
  if (data.best_value) {
    y = addInsightBox(doc, `Best Value: ${data.best_value}`, y, "blue", RT, names);
  }

  if (data.horses?.length) {
    y = addSectionTitle(doc, "COMPARISON TABLE", y, RT, names);
    const headers = ["Metric", ...data.horses.map((h: any) => sanitize(h.name).substring(0, 14))];
    const colW = CONTENT_W / headers.length;
    const widths = headers.map(() => colW);

    const rows = [
      ["Country", ...data.horses.map((h: any) => sanitize(h.country))],
      ["Sire", ...data.horses.map((h: any) => sanitize(h.sire).substring(0, 14))],
      ["Record", ...data.horses.map((h: any) => `${h.career?.starts || 0}-${h.career?.wins || 0}`)],
      ["Win%", ...data.horses.map((h: any) => `${h.career?.win_percentage || 0}%`)],
      ["Earnings", ...data.horses.map((h: any) => sanitize(h.career?.earnings).substring(0, 14))],
      ["Speed", ...data.horses.map((h: any) => `${h.scores?.speed_rating || 0}`)],
      ["Class", ...data.horses.map((h: any) => `${h.scores?.class_rating || 0}`)],
    ];

    y = addTable(doc, headers, rows, y, widths, RT, names);
    y += 4;

    const speedChart = data.horses
      .map((h: any) => ({ label: sanitize(h.name).slice(0, 12), value: Number(h.scores?.speed_rating) || 0 }))
      .filter((h: { value: number }) => h.value > 0);
    if (speedChart.length >= 2) {
      y = drawPdfSectionTitle(doc, "SPEED RATING COMPARISON", y, RT);
      y = drawPdfBarChart(doc, y, RT, speedChart);
    }
  }

  if (data.strengths_weaknesses?.length) {
    y = addSectionTitle(doc, "STRENGTHS & WEAKNESSES", y, RT, names);
    for (const sw of data.strengths_weaknesses) {
      doc.setFontSize(11);
      doc.setTextColor(...DARK_TEXT);
      doc.setFont("helvetica", "bold");
      doc.text(sanitize(sw.name), MARGIN, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      if (sw.strengths?.length) y = addBulletList(doc, sw.strengths, y, GREEN, "+", RT, names);
      if (sw.weaknesses?.length) y = addBulletList(doc, sw.weaknesses, y, RED, "x", RT, names);
      y += 4;
    }
  }

  if (data.recommendation) {
    y = addSectionTitle(doc, "RECOMMENDATION", y, RT, names);
    y = addInsightBox(doc, data.recommendation, y, "gold", RT, names);
  }

  renderDisclaimer(doc, date, RT, names);
  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// PUBLIC: Generate Market Report PDF
// ============================================================
export async function generateMarketReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const RT = "Market Intelligence";

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: "Bloodstock Market Analysis",
    subject: "Global Thoroughbred Market",
    meta: data.statistics ? [`${data.statistics.total_sales || 0} sales tracked`] : [],
  });

  if (data.insights?.market_trends) {
    y = addSectionTitle(doc, "MARKET TRENDS", y, RT, "Market");
    if (data.insights.market_trends.overall_trend) {
      y = addInsightBox(doc, data.insights.market_trends.overall_trend, y, "gold", RT, "Market");
    }
    if (data.insights.market_trends.hot_bloodlines?.length) {
      y = addBulletList(doc, data.insights.market_trends.hot_bloodlines, y, GOLD, ">>", RT, "Market");
      y += 2;
    }
  }

  if (data.insights?.predictions) {
    y = addSectionTitle(doc, "PREDICTIONS", y, RT, "Market");
    if (data.insights.predictions.short_term) y = addInsightBox(doc, `Short-term: ${data.insights.predictions.short_term}`, y, "blue", RT, "Market");
    if (data.insights.predictions.long_term) y = addInsightBox(doc, `Long-term: ${data.insights.predictions.long_term}`, y, "gold", RT, "Market");
    if (data.insights.predictions.recommendations?.length) {
      y = addBulletList(doc, data.insights.predictions.recommendations, y, DARK_TEXT, ">>", RT, "Market");
    }
  }

  if (data.statistics) {
    y = addSectionTitle(doc, "STATISTICS", y, RT, "Market");
    y = addTable(doc, ["Metric", "Value"], [
      ["Total Sales", String(data.statistics.total_sales || 0)],
      ["Avg Sale Price", `$${(data.statistics.avg_sale_price || 0).toLocaleString()}`],
      ["Stallions Tracked", String(data.statistics.top_stallions_count || 0)],
      ["Races Analyzed", String(data.statistics.total_races || 0)],
    ], y, [70, CONTENT_W - 70], RT, "Market");
    y = drawPdfBarChart(doc, y + 4, RT, [
      { label: "Sales", value: Number(data.statistics.total_sales) || 0 },
      { label: "Stallions", value: Number(data.statistics.top_stallions_count) || 0 },
      { label: "Races", value: Number(data.statistics.total_races) || 0 },
    ], { maxValue: Math.max(Number(data.statistics.total_sales) || 0, Number(data.statistics.top_stallions_count) || 0, Number(data.statistics.total_races) || 0, 1) });
  }

  renderDisclaimer(doc, date, RT, "Market");
  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// PUBLIC: Generate Broodmare Report PDF
// ============================================================
export async function generateBroodmareReportPDF(data: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const mareName = sanitize(data.mare?.name || "Broodmare");
  const RT = "Broodmare Breeding Plan";

  let y = await drawPdfCoverPage(doc, {
    reportTitle: RT,
    subtitle: data.breeding_goals ? String(data.breeding_goals).slice(0, 80) : undefined,
    subject: mareName,
    meta: data.recommended_stallions?.length ? [`${data.recommended_stallions.length} stallions recommended`] : [],
  });

  y = drawPdfSectionTitle(doc, "BREEDING PLAN", y, RT);

  if (data.breeding_goals) {
    y = addInsightBox(doc, `Breeding Goals: ${data.breeding_goals}`, y, "gold", RT, mareName);
  }

  if (data.recommended_stallions?.length) {
    y = addSectionTitle(doc, "RECOMMENDED STALLIONS", y, RT, mareName);
    y = addTable(doc,
      ["Stallion", "Score", "Nick", "Est. Value"],
      data.recommended_stallions.map((s: any) => [
        sanitize(s.stallion_name),
        `${s.matching_score || 0}%`,
        sanitize(s.nick_rating || "N/A"),
        s.commercial_projection?.estimated_yearling_value ? `$${s.commercial_projection.estimated_yearling_value}` : "N/A",
      ]),
      y, [45, 20, 14, CONTENT_W - 79], RT, mareName
    );
    y += 4;

    const stallionScores = data.recommended_stallions
      .map((s: any) => ({ label: sanitize(s.stallion_name).slice(0, 14), value: Number(s.matching_score) || 0 }))
      .filter((s: { value: number }) => s.value > 0);
    if (stallionScores.length >= 2) {
      y = drawPdfSectionTitle(doc, "STALLION SCORE COMPARISON", y, RT);
      y = drawPdfBarChart(doc, y, RT, stallionScores);
    }

    for (const s of data.recommended_stallions) {
      if (y > PAGE_H - 50) { doc.addPage(); y = addPageHeader(doc, RT, mareName); }
      doc.setFontSize(11);
      doc.setTextColor(...DARK_TEXT);
      doc.setFont("helvetica", "bold");
      doc.text(sanitize(s.stallion_name), MARGIN, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      if (s.reasoning) y = addInsightBox(doc, s.reasoning, y, "gold", RT, mareName);
      y += 3;
    }
  }

  if (data.analysis_result?.breeding_strategy) {
    y = addSectionTitle(doc, "BREEDING STRATEGY", y, RT, mareName);
    const bs = data.analysis_result.breeding_strategy;
    if (typeof bs === "string") {
      y = writeText(doc, bs, MARGIN, y, CONTENT_W, 9, DARK_TEXT, 1.6);
    } else {
      if (bs.primary_goal) y = addInsightBox(doc, `Goal: ${bs.primary_goal}`, y, "gold", RT, mareName);
      if (bs.recommended_approach) y = writeText(doc, bs.recommended_approach, MARGIN, y, CONTENT_W, 9, DARK_TEXT, 1.6);
    }
  }

  renderDisclaimer(doc, date, RT, mareName);
  addPdfPageFooters(doc, RT);
  return doc;
}

// ============================================================
// Utility: Download PDF with standard naming
// ============================================================
export function downloadPdf(doc: jsPDF, horseName: string, reportType: string) {
  const date = new Date().toISOString().split("T")[0];
  const safeName = (horseName || "Horse").replace(/[^a-zA-Z0-9]/g, "_");
  const safeType = (reportType || "Report").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`BloodstockAI_${safeName}_${safeType}_${date}.pdf`);
}
