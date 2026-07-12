import jsPDF from "jspdf";
import logoFull from "@/assets/bloodstockai-logo-full.png";

/** Official BloodstockAI wordmark — loaded once for all PDF exports. */
let logoFullBase64: string | null = null;

export const logoReady = new Promise<void>((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 3;
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      logoFullBase64 = canvas.toDataURL("image/png", 1.0);
    }
    resolve();
  };
  img.onerror = () => resolve();
  img.src = logoFull;
});

export const PDF_COLORS = {
  navy: [15, 23, 42] as const,
  navyMid: [30, 41, 59] as const,
  gold: [212, 168, 67] as const,
  goldDark: [170, 138, 30] as const,
  white: [255, 255, 255] as const,
  text: [26, 26, 46] as const,
  muted: [100, 116, 139] as const,
  border: [226, 232, 240] as const,
  card: [248, 250, 252] as const,
  green: [22, 163, 74] as const,
  red: [220, 38, 38] as const,
  amber: [202, 138, 4] as const,
};

export const PDF_PAGE = { w: 210, h: 297, margin: 18 };

type RGB = readonly [number, number, number];

export function pdfRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB, fill = true) {
  doc.setFillColor(...color);
  doc.setDrawColor(...color);
  doc.rect(x, y, w, h, fill ? "F" : "S");
}

export function pdfText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontSize: number,
  color: RGB,
  lineHeight = 1.55,
  align: "left" | "center" | "right" = "left",
): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(text ?? "—"), maxW);
  const step = fontSize * 0.353 * lineHeight;
  for (const line of lines) {
    doc.text(line, x, y, { align });
    y += step;
  }
  return y;
}

/** Professional cover page — official logo, navy band, gold accent. */
export async function drawPdfCoverPage(
  doc: jsPDF,
  opts: {
    reportTitle: string;
    subtitle?: string;
    subject?: string;
    meta?: string[];
  },
): Promise<number> {
  await logoReady;
  const { w, h, margin } = PDF_PAGE;
  const cw = w - margin * 2;

  pdfRect(doc, 0, 0, w, h, PDF_COLORS.white);
  pdfRect(doc, 0, 0, w, 72, PDF_COLORS.navy);
  pdfRect(doc, 0, 72, w, 2, PDF_COLORS.gold);

  if (logoFullBase64) {
    try {
      doc.addImage(logoFullBase64, "PNG", margin, 18, cw * 0.72, 28);
    } catch {
      /* fallback text */
      doc.setFontSize(22);
      doc.setTextColor(...PDF_COLORS.white);
      doc.text("BLOODSTOCK.AI", margin, 38);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text("BLOODSTOCK.AI", margin, 38);
  }

  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text("AI POWERED BLOODSTOCK ANALYTICS", margin, 58);

  let y = 96;
  pdfRect(doc, margin, y - 6, 3, 28, PDF_COLORS.gold);
  y = pdfText(doc, opts.reportTitle, margin + 8, y + 8, cw - 8, 22, PDF_COLORS.text, 1.2);
  y += 4;

  if (opts.subtitle) {
    y = pdfText(doc, opts.subtitle, margin, y + 4, cw, 11, PDF_COLORS.muted);
  }

  if (opts.subject) {
    y += 8;
    pdfRect(doc, margin, y, cw, 22, PDF_COLORS.card);
    pdfRect(doc, margin, y, cw, 22, PDF_COLORS.border, false);
    pdfText(doc, opts.subject, margin + 6, y + 8, cw - 12, 12, PDF_COLORS.text);
    y += 30;
  }

  if (opts.meta?.length) {
    y += 4;
    for (const line of opts.meta) {
      y = pdfText(doc, line, margin, y, cw, 9, PDF_COLORS.muted);
      y += 2;
    }
  }

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  y = h - 36;
  pdfRect(doc, margin, y, cw, 0.3, PDF_COLORS.border);
  pdfText(doc, `Generated ${date} · BloodstockAI® Confidential`, margin, y + 8, cw, 8, PDF_COLORS.muted);

  doc.addPage();
  return drawPdfContentHeader(doc, opts.reportTitle);
}

/** Standard content-page header after cover. */
export function drawPdfContentHeader(doc: jsPDF, reportLabel: string): number {
  const { w, margin } = PDF_PAGE;
  const cw = w - margin * 2;
  pdfRect(doc, 0, 0, w, 22, PDF_COLORS.navy);
  pdfRect(doc, 0, 22, w, 0.8, PDF_COLORS.gold);

  if (logoFullBase64) {
    try {
      doc.addImage(logoFullBase64, "PNG", margin, 5, 36, 12);
    } catch {
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.white);
      doc.text("BloodstockAI®", margin, 14);
    }
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text("BloodstockAI®", margin, 14);
  }

  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text(reportLabel, w - margin, 14, { align: "right" });

  pdfRect(doc, margin, 28, cw, 0.2, PDF_COLORS.border);
  return 36;
}

export function ensurePdfSpace(doc: jsPDF, y: number, needed: number, reportLabel: string): number {
  if (y + needed > PDF_PAGE.h - 24) {
    doc.addPage();
    return drawPdfContentHeader(doc, reportLabel);
  }
  return y;
}

export function drawPdfSectionTitle(doc: jsPDF, title: string, y: number, reportLabel: string): number {
  y = ensurePdfSpace(doc, y, 18, reportLabel);
  const { margin } = PDF_PAGE;
  const cw = PDF_PAGE.w - margin * 2;
  pdfRect(doc, margin, y, 2.5, 7, PDF_COLORS.gold);
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.goldDark);
  doc.text(String(title).toUpperCase(), margin + 5, y + 5.5);
  pdfRect(doc, margin, y + 9, cw, 0.2, PDF_COLORS.border);
  return y + 16;
}

export function sanitizePdfText(raw: unknown): string {
  if (raw === null || raw === undefined) return "—";
  return String(raw)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim() || "—";
}

export type ChartDatum = { label: string; value: number };

function scoreBarColor(v: number): readonly [number, number, number] {
  if (v >= 70) return PDF_COLORS.green;
  if (v >= 55) return PDF_COLORS.amber;
  return PDF_COLORS.red;
}

/** Horizontal score bars — mirrors dashboard Progress bars. */
export function drawPdfScoreBars(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  items: ChartDatum[],
  barW?: number,
): number {
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  const trackW = barW ?? cw - 42;

  for (const item of items) {
    y = ensurePdfSpace(doc, y, 12, reportLabel);
    const v = Math.max(0, Math.min(100, item.value));
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sanitizePdfText(item.label).slice(0, 28), margin, y + 3);
    doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(v)}`, margin + cw - 8, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    pdfRect(doc, margin, y + 5, trackW, 3.5, PDF_COLORS.border);
    pdfRect(doc, margin, y + 5, (trackW * v) / 100, 3.5, scoreBarColor(v));
    y += 12;
  }
  return y + 2;
}

/** Vertical bar chart for performance distribution etc. */
export function drawPdfBarChart(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  items: ChartDatum[],
  opts?: { height?: number; maxValue?: number },
): number {
  if (!items.length) return y;
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  const chartH = opts?.height ?? 48;
  y = ensurePdfSpace(doc, y, chartH + 22, reportLabel);

  const maxV = opts?.maxValue ?? Math.max(...items.map((i) => i.value), 1);
  const barGap = 3;
  const barW = Math.min(22, (cw - barGap * (items.length - 1)) / items.length);
  const totalW = items.length * barW + (items.length - 1) * barGap;
  let x = margin + (cw - totalW) / 2;
  const baseY = y + chartH;

  pdfRect(doc, margin, y, cw, chartH, PDF_COLORS.card);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, cw, chartH, "S");

  for (const item of items) {
    const v = Math.max(0, item.value);
    const h = (v / maxV) * (chartH - 8);
    pdfRect(doc, x, baseY - h, barW, h, PDF_COLORS.gold);
    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.muted);
    const lbl = sanitizePdfText(item.label);
    const lines = doc.splitTextToSize(lbl, barW + 4);
    doc.text(lines.slice(0, 2), x + barW / 2, baseY + 4, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(String(Math.round(v)), x + barW / 2, baseY - h - 2, { align: "center" });
    x += barW + barGap;
  }
  return baseY + 14;
}

/** Simplified radar chart (polygon + axes). */
export function drawPdfRadarChart(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  items: ChartDatum[],
  size = 52,
): number {
  if (items.length < 3) return y;
  y = ensurePdfSpace(doc, y, size + 28, reportLabel);
  const { margin, w } = PDF_PAGE;
  const cx = w / 2;
  const cy = y + size / 2 + 4;
  const n = items.length;
  const maxV = 100;

  const pt = (i: number, r: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
  };

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  for (const ring of [0.25, 0.5, 0.75, 1]) {
    const ringPts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const p = pt(i, (size / 2) * ring);
      ringPts.push([p.x, p.y]);
    }
    for (let i = 0; i < n; i++) {
      const a = ringPts[i];
      const b = ringPts[(i + 1) % n];
      doc.line(a[0], a[1], b[0], b[1]);
    }
  }

  for (let i = 0; i < n; i++) {
    const outer = pt(i, size / 2);
    doc.line(cx, cy, outer.x, outer.y);
    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.muted);
    const lbl = sanitizePdfText(items[i].label).slice(0, 14);
    const lp = pt(i, size / 2 + 8);
    doc.text(lbl, lp.x, lp.y, { align: "center" });
  }

  const dataPts: [number, number][] = items.map((item, i) => {
    const r = (size / 2) * (Math.max(0, Math.min(maxV, item.value)) / maxV);
    const p = pt(i, r);
    return [p.x, p.y];
  });

  doc.setFillColor(...PDF_COLORS.gold);
  doc.setDrawColor(...PDF_COLORS.goldDark);
  doc.setLineWidth(0.4);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = dataPts[i];
    const [x2, y2] = dataPts[(i + 1) % n];
    if (i === 0) doc.moveTo(x1, y1);
    else doc.line(x1, y1, x2, y2);
  }
  const [fx, fy] = dataPts[0];
  doc.line(dataPts[n - 1][0], dataPts[n - 1][1], fx, fy);
  doc.setFillColor(212, 168, 67, 0.35);
  try {
    doc.lines(
      dataPts.map(([x, yy], i) => (i === 0 ? [x - cx, yy - cy] : [x - dataPts[i - 1][0], yy - dataPts[i - 1][1]])),
      cx,
      cy,
      [1, 1],
      "F",
    );
  } catch {
    /* jsPDF lines fallback — polygon outline only */
  }

  return cy + size / 2 + 14;
}

/** Multi-stallion comparison bar chart. */
export function drawPdfStallionComparisonChart(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  stallions: { name: string; score: number }[],
): number {
  return drawPdfBarChart(
    doc,
    y,
    reportLabel,
    stallions.map((s) => ({ label: s.name, value: s.score })),
    { height: 44, maxValue: 100 },
  );
}

/** Line chart for season ROI / yearling curve. */
export function drawPdfLineChart(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  items: { label: string; value: number }[],
  opts?: { height?: number },
): number {
  if (items.length < 2) return y;
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  const chartH = opts?.height ?? 44;
  y = ensurePdfSpace(doc, y, chartH + 20, reportLabel);

  const maxV = Math.max(...items.map((i) => i.value), 1);
  const minV = Math.min(...items.map((i) => i.value), 0);
  const range = maxV - minV || 1;
  const baseY = y + chartH;

  pdfRect(doc, margin, y, cw, chartH, PDF_COLORS.card);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, cw, chartH, "S");

  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.6);
  items.forEach((item, i) => {
    const x = margin + (i / (items.length - 1)) * cw;
    const yy = baseY - ((item.value - minV) / range) * (chartH - 6);
    if (i === 0) doc.moveTo(x, yy);
    else doc.line(x, yy);
    doc.setFillColor(...PDF_COLORS.gold);
    doc.circle(x, yy, 1.2, "F");
    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(sanitizePdfText(item.label), x, baseY + 5, { align: "center" });
  });

  return baseY + 12;
}

/** Capture a dashboard chart element as PNG for PDF embedding. */
export async function captureElementAsImage(selector: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png", 0.92);
  } catch {
    return null;
  }
}

export async function embedChartImage(
  doc: jsPDF,
  y: number,
  reportLabel: string,
  imageData: string,
  heightMm = 70,
): Promise<number> {
  const { margin, w } = PDF_PAGE;
  const cw = w - margin * 2;
  y = ensurePdfSpace(doc, y, heightMm + 6, reportLabel);
  try {
    doc.addImage(imageData, "PNG", margin, y, cw, heightMm);
    return y + heightMm + 6;
  } catch {
    return y;
  }
}

export function addPdfPageFooters(doc: jsPDF, reportLabel: string) {
  const total = doc.getNumberOfPages();
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    const { margin, w, h } = PDF_PAGE;
    pdfRect(doc, margin, h - 14, w - margin * 2, 0.2, PDF_COLORS.border);
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`BloodstockAI® · ${reportLabel} · Confidential`, margin, h - 8);
    doc.text(`Generated ${date}`, w - margin, h - 8, { align: "right" });
    doc.text(`${i} / ${total}`, w / 2, h - 8, { align: "center" });
  }
}
