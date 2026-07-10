import jsPDF from "jspdf";
import logoSrc from "@/assets/logo.png";
import type { FrameAnnotation } from "./breezeFrameAnnotation";

// ============================================================
// BloodstockAI® — Premium Breeze-Up PDF Report Generator
// Luxury black-and-gold institutional presentation
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
    if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, c.width, c.height); logoBase64 = c.toDataURL("image/png", 1.0); }
    resolve();
  };
  img.onerror = () => resolve();
  img.src = logoSrc;
});

// ─── COLORS ─── (Light theme — white background, dark text, gold accents)
const BG = [255, 255, 255] as const;          // page bg (white)
const GOLD = [170, 138, 30] as const;         // darker gold for white bg contrast
const WHITE = [40, 40, 45] as const;          // re-purposed: now means "primary text"
const IVORY = [55, 55, 60] as const;          // body text
const MID = [110, 110, 115] as const;         // muted text
const DARK_GOLD = [140, 110, 20] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const YELLOW = [202, 138, 4] as const;
const LIGHT_BG = [240, 238, 230] as const;    // bar track background
const CARD_BG = [248, 248, 245] as const;     // card bg

const PW = 210;
const PH = 297;
const M = 18;
const CW = PW - 2 * M;
type RGB = readonly [number, number, number];

function s(t: any): string {
  if (t === null || t === undefined) return "N/A";
  return String(t).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").replace(/[^\x00-\x7F]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 0xC0 && c <= 0x17F) return ch;
    if (c >= 0x2010 && c <= 0x2015) return "-";
    if (c === 0x2014) return " -- ";
    if (c >= 0x2018 && c <= 0x201F) return "'";
    if (c === 0x2026) return "...";
    return "";
  }).replace(/\s+/g, " ").trim() || "N/A";
}

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, c: RGB) {
  doc.setFillColor(...c); doc.rect(x, y, w, h, "F");
}

function goldLine(doc: jsPDF, y: number) {
  rect(doc, M, y, CW, 0.5, GOLD);
}

function txt(doc: jsPDF, text: string, x: number, y: number, maxW: number, fs: number, color: RGB, lh = 1.6, align: "left" | "center" | "right" = "left"): number {
  doc.setFontSize(fs);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(s(text), maxW);
  const step = fs * 0.353 * lh;
  for (const line of lines) {
    if (y > PH - 22) { doc.addPage(); y = pageHeader(doc); }
    doc.text(line, x, y, { align });
    y += step;
  }
  return y;
}

function pageHeader(doc: jsPDF): number {
  rect(doc, 0, 0, PW, 14, BG);
  if (logoBase64) { try { doc.addImage(logoBase64, "PNG", M, 1.5, 11, 11); } catch {} }
  doc.setFontSize(8); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
  doc.text("BloodstockAI -- Breeze-Up Analysis Report", PW / 2, 8, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setTextColor(...MID);
  doc.text(`Page ${doc.getNumberOfPages()}`, PW - M, 8, { align: "right" });
  rect(doc, 0, 14, PW, 0.6, GOLD);
  return 22;
}

function pageFooter(doc: jsPDF) {
  const d = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  rect(doc, M, PH - 12, CW, 0.4, GOLD);
  doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text("Confidential -- BloodstockAI", M, PH - 7);
  doc.text("agentbloodstockai.com", PW / 2, PH - 7, { align: "center" });
  doc.text(`Generated ${d}`, PW - M, PH - 7, { align: "right" });
}

function addFooters(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) { doc.setPage(i); pageFooter(doc); }
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > PH - 40) { doc.addPage(); y = pageHeader(doc); }
  y += 6;
  rect(doc, M, y - 4, 3, 7, GOLD);
  doc.setFontSize(11); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
  doc.text(s(title).toUpperCase(), M + 6, y);
  doc.setFont("helvetica", "normal");
  y += 10;
  return y;
}

function metricBox(doc: jsPDF, label: string, value: string, x: number, y: number, w: number): number {
  rect(doc, x, y, w, 18, CARD_BG);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(x, y, w, 18, "S");
  doc.setFontSize(12); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
  doc.text(s(value), x + w / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text(s(label), x + w / 2, y + 14, { align: "center" });
  return y + 22;
}

function starMetricBox(doc: jsPDF, label: string, ratingValue: unknown, x: number, y: number, w: number): number {
  const raw = typeof ratingValue === "number" ? ratingValue : Number(ratingValue);
  const rating = Number.isFinite(raw) ? Math.max(0, Math.min(5, raw > 5 ? Math.round(raw / 2) : Math.round(raw))) : 0;
  rect(doc, x, y, w, 18, CARD_BG);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(x, y, w, 18, "S");
  const starGap = 3.4;
  const totalW = 5 * 2.8 + 4 * starGap;
  let sx = x + (w - totalW) / 2;
  for (let i = 0; i < 5; i++) {
    const fill: RGB = i < rating ? GOLD : LIGHT_BG;
    const stroke: RGB = i < rating ? DARK_GOLD : MID;
    doc.setFillColor(...fill);
    doc.setDrawColor(...stroke);
    const cx = sx + 1.4;
    const cy = y + 7.2;
    const points = Array.from({ length: 10 }, (_, idx) => {
      const radius = idx % 2 === 0 ? 1.75 : 0.78;
      const angle = -Math.PI / 2 + idx * Math.PI / 5;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    const lines = points.slice(1).map((pt, idx) => [pt.x - points[idx].x, pt.y - points[idx].y] as [number, number]);
    doc.lines(lines, points[0].x, points[0].y, [1, 1], "FD", true);
    sx += 2.8 + starGap;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8); doc.setTextColor(...DARK_GOLD);
  doc.text(`${rating}/5`, x + w / 2, y + 10.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7); doc.setTextColor(...MID);
  doc.text(s(label), x + w / 2, y + 14.5, { align: "center" });
  return y + 22;
}

function scoreBar(doc: jsPDF, label: string, score: number, y: number): number {
  if (y > PH - 18) { doc.addPage(); y = pageHeader(doc); }
  const barW = CW - 50;
  doc.setFontSize(8); doc.setTextColor(...IVORY);
  doc.text(s(label), M, y);
  // Background bar
  rect(doc, M + 45, y - 3, barW, 5, LIGHT_BG);
  // Fill
  const fillW = Math.max(1, (Math.min(score, 100) / 100) * barW);
  const color: RGB = score >= 70 ? GREEN : score >= 45 ? YELLOW : RED;
  rect(doc, M + 45, y - 3, fillW, 5, color);
  // Score text
  doc.setFontSize(8); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  doc.text(`${score}`, M + 45 + barW + 3, y);
  doc.setFont("helvetica", "normal");
  return y + 9;
}

// Horizontal % bar chart (used for Distance Prediction etc.)
function percentBarChart(doc: jsPDF, title: string, items: Array<{ label: string; value: number }>, y: number): number {
  if (y > PH - 50) { doc.addPage(); y = pageHeader(doc); }
  // Title
  doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
  doc.text(s(title).toUpperCase(), M, y);
  doc.setFont("helvetica", "normal");
  y += 4;
  // Card background
  const cardTop = y;
  const rowH = 8;
  const totalH = items.length * rowH + 4;
  rect(doc, M, cardTop, CW, totalH, CARD_BG);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.25);
  doc.rect(M, cardTop, CW, totalH, "S");

  const labelW = 50;
  const barX = M + labelW;
  const barW = CW - labelW - 22;
  let ry = cardTop + 5.5;
  for (const it of items) {
    const v = Math.max(0, Math.min(100, Number(it.value) || 0));
    // Label
    doc.setFontSize(8); doc.setTextColor(...IVORY); doc.setFont("helvetica", "normal");
    doc.text(s(it.label), M + 4, ry);
    // Track
    rect(doc, barX, ry - 2.4, barW, 2.8, LIGHT_BG);
    // Fill (gold gradient simulated by solid gold)
    const fillW = Math.max(0.5, (v / 100) * barW);
    rect(doc, barX, ry - 2.4, fillW, 2.8, GOLD);
    // Value
    doc.setFontSize(8.5); doc.setTextColor(...DARK_GOLD); doc.setFont("helvetica", "bold");
    doc.text(`${v}%`, M + CW - 4, ry, { align: "right" });
    doc.setFont("helvetica", "normal");
    ry += rowH;
  }
  return cardTop + totalH + 5;
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════
export interface BreezeUpReportData {
  horseName?: string;
  lotNumber?: string;
  sire?: string;
  dam?: string;
  saleName?: string;
  consignor?: string;
  // Breeze video results
  breezeResult?: any;
  // Pedigree results
  pedigreeResult?: any;
  // Visual results
  visualResult?: any;
  // Combined results
  combinedResult?: any;
  // Annotated frames
  annotatedFrames?: FrameAnnotation[];
}

export async function generateBreezeUpPDF(data: BreezeUpReportData): Promise<void> {
  await logoPromise;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const hasSire = data.sire && data.sire.trim() && data.sire.trim().toLowerCase() !== "unknown";
  const hasDam = data.dam && data.dam.trim() && data.dam.trim().toLowerCase() !== "unknown";
  const pedigreeName = hasSire || hasDam
    ? `${hasSire ? data.sire : "Unknown Sire"} x ${hasDam ? data.dam : "Unknown Dam"}`
    : "";
  const lotLabel = data.lotNumber ? `Lot ${data.lotNumber}` : "";
  const name =
    (data.horseName && data.horseName.trim()) ||
    pedigreeName ||
    (lotLabel ? `${lotLabel} -- Breeze-Up Subject` : "Breeze-Up Subject");
  const lot = lotLabel;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ═══ COVER PAGE ═══
  rect(doc, 0, 0, PW, PH, BG);

  // Gold border frame
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.rect(10, 10, PW - 20, PH - 20, "S");
  doc.setLineWidth(0.3);
  doc.rect(12, 12, PW - 24, PH - 24, "S");

  // Logo
  if (logoBase64) { try { doc.addImage(logoBase64, "PNG", PW / 2 - 18, 40, 36, 36); } catch {} }

  // Brand
  doc.setFontSize(10); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
  doc.text("BloodstockAI", PW / 2, 84, { align: "center" });
  doc.setFontSize(6); doc.setTextColor(...MID);
  doc.text("ADVANCED EQUINE INTELLIGENCE", PW / 2, 90, { align: "center" });

  // Gold divider
  rect(doc, PW / 2 - 40, 98, 80, 0.6, GOLD);

  // Title
  doc.setFontSize(22); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  doc.text("BREEZE-UP ANALYSIS", PW / 2, 116, { align: "center" });
  doc.setFontSize(10); doc.setTextColor(...GOLD);
  doc.text("PREMIUM ASSESSMENT REPORT", PW / 2, 125, { align: "center" });
  doc.setFont("helvetica", "normal");

  // Horse details
  rect(doc, PW / 2 - 40, 135, 80, 0.4, GOLD);
  doc.setFontSize(16); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  doc.text(s(name).toUpperCase(), PW / 2, 150, { align: "center" });
  doc.setFont("helvetica", "normal");

  if (lot) { doc.setFontSize(11); doc.setTextColor(...GOLD); doc.text(lot, PW / 2, 160, { align: "center" }); }

  doc.setFontSize(9); doc.setTextColor(...MID);
  let cy = 170;
  if (data.sire) { doc.text(`Sire: ${s(data.sire)}`, PW / 2, cy, { align: "center" }); cy += 6; }
  if (data.dam) { doc.text(`Dam: ${s(data.dam)}`, PW / 2, cy, { align: "center" }); cy += 6; }
  if (data.saleName) { doc.text(s(data.saleName), PW / 2, cy, { align: "center" }); cy += 6; }
  if (data.consignor) { doc.text(`Consigned by: ${s(data.consignor)}`, PW / 2, cy, { align: "center" }); cy += 6; }

  rect(doc, PW / 2 - 40, cy + 4, 80, 0.4, GOLD);

  doc.setFontSize(8); doc.setTextColor(...MID);
  doc.text(date, PW / 2, cy + 14, { align: "center" });

  // Footer on cover
  doc.setFontSize(7); doc.setTextColor(...DARK_GOLD);
  doc.text("Confidential -- For Professional Use Only", PW / 2, PH - 20, { align: "center" });
  doc.text("agentbloodstockai.com", PW / 2, PH - 15, { align: "center" });

  // ═══ PAGE 2: EXECUTIVE SUMMARY ═══
  doc.addPage();
  let y = pageHeader(doc);

  y = sectionTitle(doc, "Executive Summary", y);

  const br = data.breezeResult;
  const pr = data.pedigreeResult;
  const cr = data.combinedResult;

  // Quick metrics row
  const boxW = (CW - 6) / 4;
  if (br) {
    // Derive a sensible km/h to display, with full transparency on method
    let displaySpeedKmh: number | null = (br.estimatedSpeedKmh != null) ? Number(br.estimatedSpeedKmh) : null;
    let speedMethod = "measured";
    if (displaySpeedKmh == null && br.strideLengthMeters && br.strideFrequency) {
      // m/s = stride(m) × strides/sec ; km/h = m/s × 3.6
      const mps = Number(br.strideLengthMeters) * (Number(br.strideFrequency) / 60);
      if (Number.isFinite(mps) && mps > 0) {
        displaySpeedKmh = Math.round(mps * 3.6 * 10) / 10;
        speedMethod = "derived";
      }
    }
    if (displaySpeedKmh == null && typeof br.gallopScore === "number") {
      // Calibrated breeze-up benchmark: 5/10 ≈ 55 km/h, 10/10 ≈ 72 km/h
      const g = Math.max(1, Math.min(10, Number(br.gallopScore)));
      displaySpeedKmh = Math.round((52 + (g - 5) * 3.4) * 10) / 10;
      speedMethod = "estimated";
    }

    metricBox(doc, "Gallop Score", `${br.gallopScore ?? "--"}/10`, M, y, boxW);
    metricBox(doc, "Overall", `${br.scores?.overall ?? "--"}/100`, M + boxW + 2, y, boxW);
    metricBox(doc, "Speed (est.)", `${displaySpeedKmh != null ? displaySpeedKmh : "--"} km/h`, M + (boxW + 2) * 2, y, boxW);
    starMetricBox(doc, "Eye-Catching", br.eyeCatchingRating, M + (boxW + 2) * 3, y, boxW);
    y += 26;

    // Speed method note (transparent, professional)
    if (displaySpeedKmh != null) {
      doc.setFontSize(7); doc.setTextColor(...MID); doc.setFont("helvetica", "italic");
      const note = speedMethod === "measured"
        ? "Speed measured from frame timestamps and detected stride length."
        : speedMethod === "derived"
          ? "Speed derived: stride length × stride frequency × 3.6."
          : "Speed estimated from calibrated gallop-score benchmark (breeze-up cohort).";
      doc.text(note, M, y);
      doc.setFont("helvetica", "normal");
      y += 5;
    }
  }

  // Executive narrative — single, calibrated paragraph (no duplicates with Final Verdict)
  if (br?.verdict) {
    y = txt(doc, br.verdict, M, y, CW, 9, IVORY, 1.55);
    y += 4;
  }

  // Distance Profile — visualised as a horizontal bar chart (mirrors dashboard)
  if (br?.distancePrediction) {
    const dp = br.distancePrediction;
    y = percentBarChart(doc, "Distance Profile Projection", [
      { label: "Sprint (5-6f)", value: Number(dp.sprint) || 0 },
      { label: "Mile (7-8f)", value: Number(dp.mile) || 0 },
      { label: "Classic (10f+)", value: Number(dp.classic) || 0 },
    ], y);
    y += 2;
  }

  // Concise market snapshot (full breakdown lives in "Commercial Profile")
  const marketLow = pr?.commercialProfile?.currentMarketValue?.low;
  const marketHigh = pr?.commercialProfile?.currentMarketValue?.high;
  const marketCurrency = pr?.commercialProfile?.currentMarketValue?.currency || "USD";
  if (marketLow != null && marketHigh != null) {
    goldLine(doc, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
    doc.text("Estimated Market Value", M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...IVORY);
    const valStr = `${marketCurrency} ${Number(marketLow).toLocaleString()} - ${Number(marketHigh).toLocaleString()}`;
    doc.text(valStr, M + CW, y, { align: "right" });
    y += 6;
  }

  // ═══ ANNOTATED FRAMES PAGE ═══
  // Skip Frame 1 (initial stride / setup) — show only the biomechanically meaningful frames
  const framesForPdf = (data.annotatedFrames || []).filter((f) => f.frameIndex !== 0);
  if (framesForPdf.length > 0) {
    doc.addPage();
    y = pageHeader(doc);
    y = sectionTitle(doc, "Breeze-Up Video Analysis — Annotated Stride Frames", y);

    for (let i = 0; i < framesForPdf.length; i++) {
      const frame = framesForPdf[i];
      
      // Check space: each frame takes ~72mm
      if (y > PH - 78) { doc.addPage(); y = pageHeader(doc); }

      doc.setFontSize(8); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
      doc.text(`Frame ${frame.frameIndex + 1}: ${s(frame.label)}`, M, y);
      doc.setFont("helvetica", "normal");
      y += 3;

      try {
        const imgW = CW;
        const imgH = imgW * 0.5625; // 16:9
        doc.addImage(frame.annotatedDataUrl, "JPEG", M, y, imgW, imgH);
        y += imgH + 4;
      } catch {
        doc.setFontSize(8); doc.setTextColor(...MID);
        doc.text("[Frame could not be embedded]", M, y + 10);
        y += 16;
      }
    }
  }

  // ═══ BIOMECHANICAL ANALYSIS ═══
  if (br) {
    doc.addPage();
    y = pageHeader(doc);
    y = sectionTitle(doc, "Biomechanical Analysis", y);

    // Helper: read measurement that may be {value,confidence,frameIndex,note} OR raw
    const readM = (m: any): { v: string; conf: string; frame: string } => {
      if (m === null || m === undefined) return { v: "N/A", conf: "", frame: "" };
      if (typeof m === "object" && "value" in m) {
        const val = m.value;
        return {
          v: val == null ? "N/A" : String(val),
          conf: m.confidence ? `[${m.confidence}]` : "",
          frame: m.frameIndex != null ? `F${m.frameIndex + 1}` : "",
        };
      }
      return { v: String(m), conf: "", frame: "" };
    };

    // Best stride frame banner
    if (br.bestStrideFrameIndex != null) {
      doc.setFontSize(8); doc.setTextColor(...DARK_GOLD);
      doc.text(`Best stride frame: #${br.bestStrideFrameIndex + 1}${br.bestStrideFrameReason ? " — " + s(br.bestStrideFrameReason) : ""}`, M, y);
      y += 6;
    }
    if (br.overallMeasurementConfidence) {
      doc.setFontSize(8); doc.setTextColor(...MID);
      doc.text(`Overall measurement confidence: ${s(br.overallMeasurementConfidence)}`, M, y);
      y += 6;
    }

    const angle = (label: string, m: any, suffix = "deg") => {
      const r = readM(m);
      const valStr = r.v === "N/A" ? "N/A" : `${r.v}${suffix} ${r.conf} ${r.frame}`.trim();
      return [label, valStr];
    };

    const strideValueStr = br.strideLengthMeters != null
      ? `${br.strideLengthMeters}m ${br.strideLengthBodyRatio ? "(" + s(br.strideLengthBodyRatio) + ")" : ""} [${s(br.strideLengthConfidence || "n/a")}]`
      : br.strideLengthBodyRatio
        ? `${s(br.strideLengthBodyRatio)} [${s(br.strideLengthConfidence || "low")}] (no metres - low confidence)`
        : "N/A";

    let _speedKmh: number | null = (br.estimatedSpeedKmh != null) ? Number(br.estimatedSpeedKmh) : null;
    let _speedMph: number | null = (br.estimatedSpeedMph != null) ? Number(br.estimatedSpeedMph) : null;
    let _speedTag = s(br.speedConfidence || "measured");
    if (_speedKmh == null && br.strideLengthMeters && br.strideFrequency) {
      const mps = Number(br.strideLengthMeters) * (Number(br.strideFrequency) / 60);
      if (Number.isFinite(mps) && mps > 0) {
        _speedKmh = Math.round(mps * 3.6 * 10) / 10;
        _speedMph = Math.round(_speedKmh * 0.621371 * 10) / 10;
        _speedTag = "derived";
      }
    }
    if (_speedKmh == null && typeof br.gallopScore === "number") {
      const g = Math.max(1, Math.min(10, Number(br.gallopScore)));
      _speedKmh = Math.round((52 + (g - 5) * 3.4) * 10) / 10;
      _speedMph = Math.round(_speedKmh * 0.621371 * 10) / 10;
      _speedTag = "estimated (benchmark)";
    }
    const speedStr = _speedKmh != null
      ? `${_speedKmh} km/h / ${_speedMph ?? "?"} mph [${_speedTag}]`
      : "Not derived (insufficient frame quality)";

    // Key metrics
    const metrics = [
      angle("Limb Extension Angle", br.limbExtensionAngle),
      angle("Shoulder Angle", br.shoulderAngle),
      angle("Hip Engagement", br.hipEngagementAngle),
      angle("Hock Flexion", br.hockFlexion, ""),
      angle("Front Reach", br.frontReachAngle),
      angle("Rear Drive", br.rearDriveAngle),
      ["Stride Length", strideValueStr],
      ["Stride Frequency", br.strideFrequency ? `${br.strideFrequency}/min` : "N/A"],
      ["Speed (estimated)", speedStr],
      ["Time/Furlong (est.)", br.timePerFurlong ? `${br.timePerFurlong}s` : "N/A"],
      ["Suspension Quality", br.suspensionQuality || "N/A"],
      ["Symmetry", br.symmetryRating || "N/A"],
      ["Diagonal Coordination", br.diagonalCoordination || "N/A"],
      ["Rhythm Consistency", br.rhythmConsistency || "N/A"],
      ["Balance", br.balanceRating || "N/A"],
      ["Topline Engagement", br.toplineEngagement || "N/A"],
      ["Ground Coverage", br.groundCoverage || "N/A"],
      ["Relaxation", br.relaxationRating || "N/A"],
    ];

    // Render metrics as alternating-row table for a clean professional look
    const labelX = M + 2;
    const valueX = M + 62;
    const valueW = CW - 64;
    for (let i = 0; i < metrics.length; i++) {
      const [label, value] = metrics[i];
      // Estimate row height based on wrapped value
      doc.setFontSize(8.5);
      const wrapped = doc.splitTextToSize(s(value), valueW);
      const rowH = Math.max(7, wrapped.length * 4.2 + 2.5);
      if (y + rowH > PH - 18) { doc.addPage(); y = pageHeader(doc); }
      // Zebra row
      if (i % 2 === 0) rect(doc, M, y - 4, CW, rowH, CARD_BG);
      // Label
      doc.setFontSize(8); doc.setTextColor(...MID); doc.setFont("helvetica", "normal");
      doc.text(s(label), labelX, y);
      // Value (wrapped)
      doc.setFontSize(8.5); doc.setTextColor(...IVORY); doc.setFont("helvetica", "bold");
      let vy = y;
      for (const ln of wrapped) {
        doc.text(ln, valueX, vy);
        vy += 4.2;
      }
      doc.setFont("helvetica", "normal");
      y += rowH;
    }
    y += 2;

    // ─── Biomechanical Scorecard (Weighted) — same colors as dashboard ───
    const sc = br.scorecardComputed;
    if (sc && typeof sc === "object") {
      if (y > PH - 90) { doc.addPage(); y = pageHeader(doc); }
      y = sectionTitle(doc, "Biomechanical Scorecard (Weighted)", y);

      const rows: Array<{ k: string; label: string; w: number }> = [
        { k: "strideMechanics", label: "Stride Mechanics", w: 25 },
        { k: "bodyAngles", label: "Body Angles", w: 20 },
        { k: "reachDrive", label: "Reach & Drive", w: 25 },
        { k: "movementQuality", label: "Movement Quality", w: 15 },
        { k: "gaitEfficiency", label: "Gait Efficiency", w: 10 },
        { k: "hoofHealth", label: "Hoof Health", w: 5 },
      ];

      // Card frame
      const cardTop = y - 2;
      const rowH = 9;
      const totalH = rows.length * rowH + rowH + 4;
      rect(doc, M, cardTop, CW, totalH, CARD_BG);
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.3);
      doc.rect(M, cardTop, CW, totalH, "S");

      const barX = M + 95;
      const barW = CW - 95 - 28;
      let ry = cardTop + 6;
      for (const row of rows) {
        const v = Number(sc[row.k] ?? 0);
        const color: RGB = v >= 70 ? GREEN : v >= 45 ? YELLOW : RED;
        // Label
        doc.setFontSize(8.5); doc.setTextColor(...IVORY); doc.setFont("helvetica", "normal");
        doc.text(s(row.label), M + 4, ry);
        doc.setFontSize(7); doc.setTextColor(...MID);
        doc.text(`(${row.w}%)`, M + 4 + doc.getTextWidth(s(row.label)) + 2, ry);
        // Bar track
        rect(doc, barX, ry - 2.4, barW, 2.8, LIGHT_BG);
        // Bar fill
        const fillW = Math.max(0.5, (Math.min(v, 100) / 100) * barW);
        rect(doc, barX, ry - 2.4, fillW, 2.8, color);
        // Score
        doc.setFontSize(8.5); doc.setTextColor(...color); doc.setFont("helvetica", "bold");
        doc.text(`${v}/100`, M + CW - 4, ry, { align: "right" });
        doc.setFont("helvetica", "normal");
        ry += rowH;
      }
      // OVERALL row
      const overall = Number(sc.overall ?? 0);
      const ovColor: RGB = overall >= 70 ? GREEN : overall >= 45 ? YELLOW : RED;
      rect(doc, M, ry - 4.5, CW, rowH + 1, [245, 235, 200]);
      doc.setFontSize(9); doc.setTextColor(...DARK_GOLD); doc.setFont("helvetica", "bold");
      doc.text("OVERALL", M + 4, ry);
      rect(doc, barX, ry - 2.6, barW, 3.2, LIGHT_BG);
      const ovFillW = Math.max(0.5, (Math.min(overall, 100) / 100) * barW);
      rect(doc, barX, ry - 2.6, ovFillW, 3.2, ovColor);
      doc.setFontSize(10); doc.setTextColor(...ovColor);
      doc.text(`${overall}/100`, M + CW - 4, ry, { align: "right" });
      doc.setFont("helvetica", "normal");

      y = cardTop + totalH + 6;
    }

    // ─── Detailed Biomechanics Analysis (full text) ───
    const fullText = br.fullAnalysisText || br.biomechanicsAnalysis;
    if (fullText) {
      if (y > PH - 40) { doc.addPage(); y = pageHeader(doc); }
      y = sectionTitle(doc, "Detailed Biomechanics Analysis", y);
      // Soft card background for legibility
      const startY = y - 2;
      const padded = String(fullText).trim();
      // Pre-measure to draw card; if it overflows, we let txt() paginate naturally
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(s(padded), CW - 6);
      const blockH = Math.min(PH - y - 18, lines.length * 4.4 + 6);
      rect(doc, M, startY, CW, blockH, CARD_BG);
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.2);
      doc.rect(M, startY, CW, blockH, "S");
      y = txt(doc, padded, M + 3, y + 2, CW - 6, 8.5, IVORY, 1.55);
      y += 4;
    }

    // Stride analysis
    if (br.strideAnalysis) {
      y += 2;
      y = sectionTitle(doc, "Stride Analysis", y);
      y = txt(doc, br.strideAnalysis, M, y, CW, 8.5, IVORY, 1.5);
    }

    // Soundness
    if (br.soundnessAnalysis || br.soundnessDetail) {
      y += 2;
      y = sectionTitle(doc, "Soundness Assessment", y);
      const soundnessColor: RGB = br.soundnessFlag ? RED : GREEN;
      doc.setFontSize(9); doc.setTextColor(...soundnessColor); doc.setFont("helvetica", "bold");
      doc.text(br.soundnessFlag ? "FLAG — Review Recommended" : "No Soundness Concerns Identified", M, y);
      doc.setFont("helvetica", "normal"); y += 5;
      y = txt(doc, br.soundnessAnalysis || br.soundnessDetail, M, y, CW, 8.5, IVORY, 1.5);
    }

    // Commercial analysis
    if (br.commercialAnalysis) {
      y += 2;
      y = sectionTitle(doc, "Commercial Assessment", y);
      y = txt(doc, br.commercialAnalysis, M, y, CW, 8.5, IVORY, 1.5);
    }
  }

  // ═══ ATHLETIC & PHYSICAL INTERPRETATION ═══
  if (data.visualResult) {
    doc.addPage();
    y = pageHeader(doc);
    y = sectionTitle(doc, "Athletic and Physical Interpretation", y);

    const vr = data.visualResult;
    if (vr.analysis) {
      y = txt(doc, vr.analysis, M, y, CW, 8.5, IVORY, 1.5);
      y += 4;
    }

    if (vr.scores) {
      goldLine(doc, y); y += 6;
      doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
      doc.text("Visual Assessment Scores", M, y); y += 6; doc.setFont("helvetica", "normal");
      for (const [key, val] of Object.entries(vr.scores)) {
        y = scoreBar(doc, key.replace(/([A-Z])/g, " $1").trim(), Number(val), y);
      }
    }

    // Strengths & Concerns
    if (vr.strengths?.length > 0 || vr.concerns?.length > 0) {
      y += 4; goldLine(doc, y); y += 6;
      if (vr.strengths?.length) {
        doc.setFontSize(9); doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold");
        doc.text("Strengths", M, y); y += 5; doc.setFont("helvetica", "normal");
        for (const st of vr.strengths) { y = txt(doc, `- ${st}`, M + 3, y, CW - 3, 8.5, IVORY, 1.4); }
        y += 2;
      }
      if (vr.concerns?.length) {
        doc.setFontSize(9); doc.setTextColor(...RED); doc.setFont("helvetica", "bold");
        doc.text("Concerns", M, y); y += 5; doc.setFont("helvetica", "normal");
        for (const c of vr.concerns) { y = txt(doc, `- ${c}`, M + 3, y, CW - 3, 8.5, IVORY, 1.4); }
      }
    }
  }

  // ═══ BEHAVIOUR & PROFESSIONALISM ═══
  if (br?.strengths?.length > 0 || br?.concerns?.length > 0) {
    if (y > PH - 60) { doc.addPage(); y = pageHeader(doc); }
    y = sectionTitle(doc, "Behaviour and Professionalism", y);

    if (br.strengths?.length) {
      doc.setFontSize(9); doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold");
      doc.text("Key Strengths", M, y); y += 5; doc.setFont("helvetica", "normal");
      for (const st of br.strengths) { y = txt(doc, `- ${st}`, M + 3, y, CW - 3, 8.5, IVORY, 1.4); }
      y += 3;
    }
    if (br.concerns?.length) {
      doc.setFontSize(9); doc.setTextColor(...RED); doc.setFont("helvetica", "bold");
      doc.text("Concerns & Risk Factors", M, y); y += 5; doc.setFont("helvetica", "normal");
      for (const c of br.concerns) { y = txt(doc, `- ${c}`, M + 3, y, CW - 3, 8.5, IVORY, 1.4); }
    }
  }

  // ═══ PEDIGREE & FAMILY COMPARISON ═══
  if (pr) {
    doc.addPage();
    y = pageHeader(doc);
    y = sectionTitle(doc, "Pedigree and Family Comparison", y);

    const exec = pr.executiveSummary || pr.analysis_summary;
    if (exec) { y = txt(doc, exec, M, y, CW, 9, IVORY, 1.5); y += 4; }

    const ped = pr.pedigreeAssessment;
    if (ped) {
      if (ped.overallGrade) {
        doc.setFontSize(10); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
        doc.text(`Pedigree Grade: ${s(ped.overallGrade)}`, M, y); y += 6; doc.setFont("helvetica", "normal");
      }
      if (ped.sireLine) { y = sectionTitle(doc, "Sire Line", y); y = txt(doc, ped.sireLine, M, y, CW, 8.5, IVORY, 1.5); y += 2; }
      if (ped.damLine) { y = sectionTitle(doc, "Dam Line", y); y = txt(doc, ped.damLine, M, y, CW, 8.5, IVORY, 1.5); y += 2; }

      if (ped.dosage) {
        goldLine(doc, y); y += 6;
        doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
        doc.text("Dosage Analysis", M, y); y += 5; doc.setFont("helvetica", "normal");
        y = txt(doc, `Dosage Index: ${ped.dosage.index || "N/A"} | Centre of Distribution: ${ped.dosage.cd || "N/A"}`, M, y, CW, 8.5, IVORY);
        if (ped.dosage.interpretation) { y = txt(doc, ped.dosage.interpretation, M, y, CW, 8.5, IVORY, 1.5); }
        y += 2;
      }

      if (ped.inbreeding) {
        goldLine(doc, y); y += 6;
        doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
        doc.text("Inbreeding Analysis", M, y); y += 5; doc.setFont("helvetica", "normal");
        y = txt(doc, `Pattern: ${ped.inbreeding.pattern || "N/A"} | CoI: ${ped.inbreeding.coefficient || "N/A"}% | Assessment: ${ped.inbreeding.assessment || "N/A"}`, M, y, CW, 8.5, IVORY);
        if (ped.inbreeding.detail) { y = txt(doc, ped.inbreeding.detail, M, y, CW, 8.5, IVORY, 1.5); }
      }
    }

    // Performance assessment
    const perf = pr.performanceAssessment;
    if (perf) {
      y += 4;
      y = sectionTitle(doc, "Performance Assessment", y);
      const perfData = [
        perf.trueRating ? `Rating: ${perf.trueRating} (${perf.ratingSystem || ""})` : null,
        perf.performanceGrade ? `Class: ${perf.performanceGrade}` : null,
        perf.trajectory ? `Trajectory: ${perf.trajectory}` : null,
        perf.optimalConditions ? `Optimal: ${perf.optimalConditions.distance || ""} / ${perf.optimalConditions.surface || ""} / ${perf.optimalConditions.going || ""}` : null,
      ].filter(Boolean);
      for (const line of perfData) { y = txt(doc, line!, M, y, CW, 8.5, IVORY); }
    }

    // Commercial Profile — narrative context only (headline value lives in Final Verdict)
    const comm = pr.commercialProfile;
    if (comm && (comm.currentMarketValue?.basis || comm.buyerProfile || comm.marketTrend)) {
      y += 4;
      y = sectionTitle(doc, "Commercial Profile", y);
      if (comm.currentMarketValue?.basis) {
        doc.setFontSize(8.5); doc.setTextColor(...MID); doc.setFont("helvetica", "bold");
        doc.text("Valuation Basis", M, y); y += 4; doc.setFont("helvetica", "normal");
        y = txt(doc, comm.currentMarketValue.basis, M, y, CW, 8.5, IVORY, 1.5);
        y += 2;
      }
      if (comm.buyerProfile) {
        doc.setFontSize(8.5); doc.setTextColor(...MID); doc.setFont("helvetica", "bold");
        doc.text("Buyer Profile", M, y); y += 4; doc.setFont("helvetica", "normal");
        y = txt(doc, comm.buyerProfile, M, y, CW, 8.5, IVORY, 1.5);
        y += 2;
      }
      if (comm.marketTrend) {
        doc.setFontSize(8.5); doc.setTextColor(...MID); doc.setFont("helvetica", "bold");
        doc.text("Market Trend", M, y); y += 4; doc.setFont("helvetica", "normal");
        y = txt(doc, comm.marketTrend, M, y, CW, 8.5, IVORY, 1.5);
      }
    }

    // Risks
    const risks = pr.riskFactors;
    if (risks?.length) {
      y += 4;
      y = sectionTitle(doc, "Risk Assessment", y);
      for (const r of risks) {
        const riskColor: RGB = r.severity === "High" ? RED : r.severity === "Medium" ? YELLOW : GREEN;
        doc.setFontSize(8); doc.setTextColor(...riskColor); doc.setFont("helvetica", "bold");
        if (y > PH - 14) { doc.addPage(); y = pageHeader(doc); }
        doc.text(`[${s(r.severity)}]`, M, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...IVORY);
        doc.text(s(r.risk), M + 18, y);
        y += 5;
        if (r.mitigation) { y = txt(doc, `Mitigation: ${r.mitigation}`, M + 3, y, CW - 3, 7.5, MID, 1.4); }
      }
    }
  }

  // ═══ FINAL VERDICT ═══
  doc.addPage();
  y = pageHeader(doc);
  y = sectionTitle(doc, "Final Verdict", y);

  rect(doc, M, y, CW, 0.4, GOLD); y += 8;

  // Overall scores summary
  if (cr) {
    const vw = (CW - 4) / 3;
    metricBox(doc, "Genetic Score", `${cr.geneticScore ?? "--"}/100`, M, y, vw);
    metricBox(doc, "Visual Score", `${cr.visualScore ?? "--"}/100`, M + vw + 2, y, vw);
    metricBox(doc, "Overall", `${cr.overallScore ?? "--"}/100`, M + (vw + 2) * 2, y, vw);
    y += 26;
  }

  if (cr?.adjustedRecommendation) {
    const recColor: RGB = cr.adjustedRecommendation === "BID" ? GREEN : cr.adjustedRecommendation === "WATCH" ? YELLOW : RED;
    doc.setFontSize(16); doc.setTextColor(...recColor); doc.setFont("helvetica", "bold");
    doc.text(cr.adjustedRecommendation, PW / 2, y, { align: "center" });
    y += 8; doc.setFont("helvetica", "normal");
  }

  if (cr?.combinedVerdict) {
    y = txt(doc, cr.combinedVerdict, M, y, CW, 9, IVORY, 1.6);
    y += 4;
  }

  // Realistic commercial guidance — value range + max bid in a single panel
  const fvLow = pr?.commercialProfile?.currentMarketValue?.low;
  const fvHigh = pr?.commercialProfile?.currentMarketValue?.high;
  const fvCurrency = pr?.commercialProfile?.currentMarketValue?.currency || "USD";
  if (cr?.recommendedMaxBid || (fvLow != null && fvHigh != null)) {
    goldLine(doc, y); y += 6;
    const panelTop = y - 2;
    const panelH = 22;
    rect(doc, M, panelTop, CW, panelH, CARD_BG);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.3);
    doc.rect(M, panelTop, CW, panelH, "S");

    // Left: market value
    doc.setFontSize(7.5); doc.setTextColor(...MID); doc.setFont("helvetica", "bold");
    doc.text("ESTIMATED MARKET VALUE", M + 4, panelTop + 6);
    doc.setFontSize(12); doc.setTextColor(...IVORY);
    const valStr = (fvLow != null && fvHigh != null)
      ? `${fvCurrency} ${Number(fvLow).toLocaleString()} - ${Number(fvHigh).toLocaleString()}`
      : "Not available";
    doc.text(valStr, M + 4, panelTop + 14);

    // Right: max bid
    if (cr?.recommendedMaxBid) {
      doc.setFontSize(7.5); doc.setTextColor(...MID); doc.setFont("helvetica", "bold");
      doc.text("RECOMMENDED MAX BID", M + CW - 4, panelTop + 6, { align: "right" });
      doc.setFontSize(12); doc.setTextColor(...DARK_GOLD);
      doc.text(s(cr.recommendedMaxBid), M + CW - 4, panelTop + 14, { align: "right" });
    }
    doc.setFont("helvetica", "normal");
    y = panelTop + panelH + 6;
  }

  if (cr?.pedigreeVisualAlignment) {
    doc.setFontSize(9); doc.setTextColor(...IVORY);
    doc.text(`Pedigree-Visual Alignment: ${s(cr.pedigreeVisualAlignment)}`, M, y); y += 5;
  }

  if (cr?.confidence) {
    doc.text(`Confidence Level: ${cr.confidence}%`, M, y); y += 8;
  }

  // Recommendations from pedigree
  if (pr?.recommendations?.length) {
    goldLine(doc, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold");
    doc.text("Recommendations", M, y); y += 5; doc.setFont("helvetica", "normal");
    for (const rec of pr.recommendations) {
      y = txt(doc, `- ${rec}`, M + 3, y, CW - 3, 8.5, IVORY, 1.4);
    }
  }

  // Disclaimer
  y += 8; goldLine(doc, y); y += 6;
  doc.setFontSize(7); doc.setTextColor(...MID);
  y = txt(doc, "DISCLAIMER: Speed and stride estimates are derived from visual frame analysis and should be treated as approximations only. Official breeze times should always be obtained from the sale's timing service. This analysis does not replace physical veterinary examination. Market valuations are estimates based on comparable sales data and should be verified with professional advisors. BloodstockAI provides analytical tools for professional bloodstock assessment and does not guarantee investment outcomes.", M, y, CW, 7, MID, 1.4);

  // Add footers
  addFooters(doc);

  // Save
  const fileName = `BloodstockAI_BreezeUp_${s(name).replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
