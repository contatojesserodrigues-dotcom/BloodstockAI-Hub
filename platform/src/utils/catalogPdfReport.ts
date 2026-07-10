import jsPDF from "jspdf";
import logoSrc from "@/assets/logo.png";

// ============================================================
// BloodstockAI — Catalog Lot PDF Report Generator
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
  img.src = logoSrc;
});

// Light theme — white background
const NAVY = [255, 255, 255] as const;        // page bg (was dark, now white)
const GOLD = [170, 138, 30] as const;
const WHITE = [40, 40, 45] as const;          // re-purposed: now primary text
const LIGHT_GRAY = [248, 249, 250] as const;
const MID_GRAY = [110, 110, 115] as const;
const DARK_TEXT = [26, 26, 46] as const;
const BORDER_GRAY = [220, 215, 200] as const;
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
  if (fill) doc.rect(x, y, w, h, "F");
}

function writeText(doc: jsPDF, text: string, x: number, y: number, maxW: number, fontSize: number, color: RGB, lineHeight = 1.6): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(sanitize(text), maxW);
  const lh = fontSize * 0.353 * lineHeight;
  for (const line of lines) {
    if (y > PAGE_H - 20) { doc.addPage(); y = addHeader(doc); }
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

function addHeader(doc: jsPDF): number {
  drawRect(doc, 0, 0, PAGE_W, 14, NAVY);
  if (logoBase64) { try { doc.addImage(logoBase64, "PNG", MARGIN, 1.5, 11, 11); } catch {} }
  doc.setFontSize(8); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  doc.text("BloodstockAI -- Catalog Analysis Report", PAGE_W / 2, 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${doc.getNumberOfPages()}`, PAGE_W - MARGIN, 8, { align: "right" });
  drawRect(doc, 0, 14, PAGE_W, 0.6, GOLD);
  return 20;
}

function addFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawRect(doc, 0, PAGE_H - 10, PAGE_W, 10, NAVY);
    doc.setFontSize(6); doc.setTextColor(...WHITE);
    doc.text("BloodstockAI -- Confidential", MARGIN, PAGE_H - 4);
    doc.text(new Date().toLocaleDateString("en-GB"), PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }
}

function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > PAGE_H - 20) { doc.addPage(); return addHeader(doc); }
  return y;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 15);
  drawRect(doc, MARGIN, y - 4, CONTENT_W, 8, GOLD_BG);
  doc.setFontSize(9); doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
  doc.text(sanitize(title).toUpperCase(), MARGIN + 3, y + 1);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, labelW = 35): number {
  doc.setFontSize(8); doc.setTextColor(...MID_GRAY); doc.text(sanitize(label), x, y);
  doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
  doc.text(sanitize(value), x + labelW, y);
  doc.setFont("helvetica", "normal");
  return y + 5;
}

function scoreBar(doc: jsPDF, label: string, score: number, x: number, y: number, barW = 60): number {
  doc.setFontSize(7); doc.setTextColor(...MID_GRAY); doc.text(label, x, y);
  const color: RGB = score >= 80 ? GREEN : score >= 60 ? GOLD : RED;
  drawRect(doc, x + 32, y - 3, barW, 4, LIGHT_GRAY);
  drawRect(doc, x + 32, y - 3, barW * (score / 100), 4, color);
  doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
  doc.text(`${score}`, x + 32 + barW + 3, y);
  doc.setFont("helvetica", "normal");
  return y + 7;
}

export async function generateCatalogLotPDF(horse: any): Promise<jsPDF> {
  await logoPromise;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const horseName = horse.name && horse.name !== "Unnamed" && horse.name !== "Not specified"
    ? horse.name
    : horse.pedigree?.sire && horse.pedigree?.dam
      ? `${horse.pedigree.sire} x ${horse.pedigree.dam}`
      : horse.name || "Unnamed Horse";

  // === Cover ===
  drawRect(doc, 0, 0, PAGE_W, PAGE_H, NAVY);
  if (logoBase64) { try { doc.addImage(logoBase64, "PNG", PAGE_W / 2 - 15, 30, 30, 30); } catch {} }
  drawRect(doc, MARGIN, 70, CONTENT_W, 0.8, GOLD);

  doc.setFontSize(10); doc.setTextColor(...GOLD);
  doc.text("CATALOG LOT ANALYSIS", PAGE_W / 2, 82, { align: "center" });

  doc.setFontSize(20); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(sanitize(horseName), CONTENT_W - 10);
  let cy = 95;
  for (const line of nameLines) { doc.text(line, PAGE_W / 2, cy, { align: "center" }); cy += 9; }
  doc.setFont("helvetica", "normal");

  if (horse.lot_number) {
    doc.setFontSize(12); doc.setTextColor(...GOLD);
    doc.text(`LOT ${horse.lot_number}`, PAGE_W / 2, cy + 5, { align: "center" });
    cy += 12;
  }

  doc.setFontSize(9); doc.setTextColor(...WHITE);
  const subtitle = [horse.sex, horse.year_of_birth, horse.country].filter(Boolean).join(" | ");
  doc.text(subtitle, PAGE_W / 2, cy + 5, { align: "center" });

  drawRect(doc, MARGIN, PAGE_H - 50, CONTENT_W, 0.5, GOLD);
  doc.setFontSize(7); doc.setTextColor(153, 153, 153);
  doc.text("Generated by BloodstockAI -- Confidential", PAGE_W / 2, PAGE_H - 40, { align: "center" });
  doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), PAGE_W / 2, PAGE_H - 35, { align: "center" });

  // === Page 2: Analysis ===
  doc.addPage();
  let y = addHeader(doc);

  // Score summary boxes
  const scores = horse.scores;
  if (scores) {
    const boxW = CONTENT_W / 3 - 2;
    const boxes = [
      { label: "BloodstockAI Score", value: `${scores.overall_score ?? 0}/100` },
      { label: "Pedigree Rating", value: `${(((scores.pedigree_score ?? 0) / 25) * 10).toFixed(1)}/10` },
      { label: "Market Estimate", value: horse.commercial_analysis?.estimated_value_range || "N/A" },
    ];
    for (let i = 0; i < 3; i++) {
      const bx = MARGIN + i * (boxW + 3);
      drawRect(doc, bx, y, boxW, 16, LIGHT_GRAY);
      doc.setFontSize(7); doc.setTextColor(...MID_GRAY);
      doc.text(boxes[i].label, bx + boxW / 2, y + 5, { align: "center" });
      doc.setFontSize(12); doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
      doc.text(sanitize(boxes[i].value), bx + boxW / 2, y + 13, { align: "center" });
      doc.setFont("helvetica", "normal");
    }
    y += 22;
  }

  // Market Estimate Justification
  if (horse.commercial_analysis?.estimated_value_justification) {
    y = checkPage(doc, y, 20);
    drawRect(doc, MARGIN, y - 2, CONTENT_W, 1, GOLD);
    y += 4;
    doc.setFontSize(8); doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
    doc.text("Market Estimate Justification:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    y = writeText(doc, horse.commercial_analysis.estimated_value_justification, MARGIN, y + 5, CONTENT_W, 8, MID_GRAY, 1.5);
    y += 4;
  }

  // Bloodstock Insight
  if (horse.verdict_reason) {
    y = checkPage(doc, y, 20);
    drawRect(doc, MARGIN, y - 2, CONTENT_W, 1, GOLD);
    y += 4;
    doc.setFontSize(8); doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
    doc.text("Bloodstock Insight:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    y = writeText(doc, horse.verdict_reason, MARGIN, y + 5, CONTENT_W, 8, MID_GRAY, 1.5);
    y += 4;
  }

  // Scores
  if (scores) {
    y = sectionTitle(doc, "Scores", y);
    y = scoreBar(doc, "Pedigree", scores.pedigree_score ?? 0, MARGIN, y);
    y = scoreBar(doc, "Performance", scores.performance_score ?? 0, MARGIN, y);
    y = scoreBar(doc, "Commercial", scores.commercial_score ?? 0, MARGIN, y);
    y = scoreBar(doc, "Conformation", scores.conformation_potential ?? 0, MARGIN, y);
    y += 4;
  }

  // Pedigree
  const ped = horse.pedigree;
  if (ped) {
    y = sectionTitle(doc, "Pedigree Highlights", y);
    y = labelValue(doc, "Sire", ped.sire || "N/A", MARGIN, y);
    y = labelValue(doc, "Dam", ped.dam || "N/A", MARGIN, y);
    y = labelValue(doc, "Damsire", ped.dam_sire || "N/A", MARGIN, y);
    if (ped.female_family) y = labelValue(doc, "Family", ped.female_family, MARGIN, y);
    if (ped.nick_rating) y = labelValue(doc, "Nick Rating", ped.nick_rating, MARGIN, y);
    if (ped.dosage_profile?.DI != null) {
      y = labelValue(doc, "Dosage", `${ped.dosage_profile.B}-${ped.dosage_profile.I}-${ped.dosage_profile.C}-${ped.dosage_profile.S}-${ped.dosage_profile.P} DI:${ped.dosage_profile.DI}`, MARGIN, y);
    }
    if (ped.inbreeding_coefficient != null && ped.inbreeding_coefficient > 0) {
      y = labelValue(doc, "Inbreeding", `${(ped.inbreeding_coefficient * 100).toFixed(1)}%`, MARGIN, y);
    }
    y += 3;
  }

  // Sire Stats
  if (horse.sire_stats && (horse.sire_stats.runners ?? 0) > 0) {
    y = sectionTitle(doc, `Sire: ${ped?.sire || "Unknown"}`, y);
    y = writeText(doc, `${horse.sire_stats.stakes_winners} stakes winners from ${horse.sire_stats.runners} runners (${horse.sire_stats.win_rate}% SR)${horse.sire_stats.stud_fee ? ` | Fee: ${horse.sire_stats.stud_fee}` : ""}`, MARGIN, y, CONTENT_W, 8, MID_GRAY);
    if (horse.sire_stats.best_progeny?.length > 0) {
      y = writeText(doc, `Best: ${horse.sire_stats.best_progeny.slice(0, 3).map((p: any) => `${p.name} (${p.achievement})`).join(", ")}`, MARGIN, y + 2, CONTENT_W, 7, MID_GRAY);
    }
    y += 4;
  }

  // Performance
  const perf = horse.performance;
  if (perf?.career && (perf.career.starts ?? 0) > 0) {
    y = sectionTitle(doc, "Performance", y);
    y = labelValue(doc, "Record", `${perf.career.starts} starts, ${perf.career.wins} wins (${perf.career.win_percentage ?? 0}%)`, MARGIN, y, 25);
    if (perf.career.earnings) y = labelValue(doc, "Earnings", perf.career.earnings, MARGIN, y, 25);
    if (perf.distance_profile) y = labelValue(doc, "Distance", perf.distance_profile, MARGIN, y, 25);
    if (perf.surface_preference) y = labelValue(doc, "Surface", perf.surface_preference, MARGIN, y, 25);
    y += 3;
  }

  // Siblings
  if (horse.siblings?.length > 0) {
    y = sectionTitle(doc, `Siblings (${horse.siblings.length})`, y);
    for (const s of horse.siblings.slice(0, 8)) {
      y = checkPage(doc, y, 8);
      const prefix = s.stakes_winner ? "[SW] " : "";
      y = writeText(doc, `${prefix}${s.name || "Unnamed"} (${s.sex || ""}) by ${s.sire || "?"} -- ${s.best_result || ""}${s.earnings ? ` | ${s.earnings}` : ""}`, MARGIN + 3, y, CONTENT_W - 6, 7, s.stakes_winner ? DARK_TEXT : MID_GRAY);
    }
    y += 3;
  }

  // Dam Produce
  if (horse.dam_produce?.length > 0) {
    y = sectionTitle(doc, `Dam Produce Record (${horse.dam_produce.length})`, y);
    for (const p of horse.dam_produce.slice(0, 10)) {
      y = checkPage(doc, y, 8);
      const prefix = p.stakes ? "[SW] " : "";
      y = writeText(doc, `${prefix}${p.name || "Unnamed"} (${p.year || ""}, ${p.sex || ""}) by ${p.sire || "?"} -- ${p.result || ""}`, MARGIN + 3, y, CONTENT_W - 6, 7, p.stakes ? DARK_TEXT : MID_GRAY);
    }
    y += 3;
  }

  // Strengths / Risks
  if (horse.key_strengths?.length > 0) {
    y = sectionTitle(doc, "Key Strengths", y);
    for (const s of horse.key_strengths) {
      y = checkPage(doc, y, 6);
      y = writeText(doc, `+ ${s}`, MARGIN + 3, y, CONTENT_W - 6, 7, GREEN);
    }
    y += 3;
  }
  if (horse.key_risks?.length > 0) {
    y = sectionTitle(doc, "Risk Factors", y);
    for (const r of horse.key_risks) {
      y = checkPage(doc, y, 6);
      y = writeText(doc, `- ${r}`, MARGIN + 3, y, CONTENT_W - 6, 7, RED);
    }
    y += 3;
  }

  // Commercial / Market
  if (horse.commercial_analysis) {
    y = sectionTitle(doc, "Commercial Analysis", y);
    if (horse.commercial_analysis.estimated_value_range) y = labelValue(doc, "Value Range", horse.commercial_analysis.estimated_value_range, MARGIN, y);
    if (horse.commercial_analysis.market_demand) y = labelValue(doc, "Market Demand", horse.commercial_analysis.market_demand, MARGIN, y);
    if (horse.commercial_analysis.resale_potential) y = labelValue(doc, "Resale Potential", horse.commercial_analysis.resale_potential, MARGIN, y);
    if (horse.commercial_analysis.comparable_sales?.length > 0) {
      y += 2;
      doc.setFontSize(7); doc.setTextColor(...MID_GRAY);
      doc.text("Comparable Sales:", MARGIN, y); y += 5;
      for (const cs of horse.commercial_analysis.comparable_sales.slice(0, 4)) {
        y = checkPage(doc, y, 6);
        y = writeText(doc, `${cs.horse} -- ${cs.price} (${cs.sale} ${cs.year})`, MARGIN + 3, y, CONTENT_W - 6, 7, MID_GRAY);
      }
    }
    y += 3;
  }

  // Detailed analysis
  if (horse.detailed_analysis) {
    y = sectionTitle(doc, "Detailed Analysis", y);
    y = writeText(doc, horse.detailed_analysis, MARGIN, y, CONTENT_W, 8, MID_GRAY, 1.5);
    y += 3;
  }

  // Verdict
  y = checkPage(doc, y, 20);
  drawRect(doc, MARGIN, y, CONTENT_W, 12, NAVY);
  doc.setFontSize(10); doc.setTextColor(...WHITE); doc.setFont("helvetica", "bold");
  const verdictLabel = horse.agent_verdict?.toUpperCase() === "BUY" ? "TOP PICK" : horse.agent_verdict?.toUpperCase() === "WATCH" ? "Good Value" : horse.agent_verdict || "N/A";
  doc.text(`Recommendation: ${verdictLabel}`, PAGE_W / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");

  // === Page 4: Conformation / Breeze-Up Assessment (only when vision data exists) ===
  const visionResult = horse.vision_result;
  const breezeResult = horse.breeze_result;
  if (visionResult || breezeResult) {
    const isBreeze = !!breezeResult;
    const v: any = breezeResult || visionResult;
    doc.addPage();
    let yy = addHeader(doc);
    yy = sectionTitle(doc, isBreeze ? "Breeze-Up Assessment" : "Conformation Assessment", yy);

    const overall = Number(isBreeze ? v.overall_breeze_score : v.overall_conformation_score) || 0;
    const rating = overall >= 85 ? "ELITE" : overall >= 70 ? "STRONG" : overall >= 55 ? "GOOD" : overall >= 40 ? "MODERATE" : "WEAK";
    drawRect(doc, MARGIN, yy, CONTENT_W, 16, LIGHT_GRAY);
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text("Overall Score", MARGIN + 4, yy + 6);
    doc.setFontSize(16); doc.setTextColor(...DARK_TEXT); doc.setFont("helvetica", "bold");
    doc.text(`${overall}/100`, MARGIN + 4, yy + 13);
    doc.setFontSize(10); doc.setTextColor(...GOLD);
    doc.text(rating, PAGE_W - MARGIN - 4, yy + 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    yy += 22;

    const dims = v.dimensions || {};
    const labels: Record<string, string> = isBreeze
      ? { stride_length: "Stride Length", stride_frequency: "Stride Frequency", action: "Action", balance_in_motion: "Balance in Motion", extension: "Extension", recovery: "Recovery", rider_feel: "Rider Feel", time_assessment: "Time Assessment", physical_impression: "Physical Impression", commercial_appeal: "Commercial Appeal" }
      : { balance: "Balance", front_legs: "Front Legs", hind_legs: "Hind Legs", shoulder: "Shoulder", hip_hindquarters: "Hip / Hindquarters", back_topline: "Back & Topline", head_neck: "Head & Neck", feet_hooves: "Feet & Hooves", movement: "Movement" };
    for (const [k, label] of Object.entries(labels)) {
      const d: any = dims[k];
      if (!d) continue;
      yy = checkPage(doc, yy, 10);
      const s = Number(d.score) || 0;
      yy = scoreBar(doc, label, Math.round(s * 10), MARGIN, yy);
      if (d.assessment) yy = writeText(doc, sanitize(d.assessment), MARGIN + 3, yy, CONTENT_W - 6, 7, MID_GRAY, 1.4);
      yy += 1;
    }

    const summary = isBreeze ? v.breeze_summary : v.conformation_summary;
    if (summary) {
      yy = sectionTitle(doc, "Summary", yy);
      yy = writeText(doc, summary, MARGIN, yy, CONTENT_W, 8, DARK_TEXT, 1.5);
      yy += 3;
    }
    const buyer = isBreeze ? v.recommended_buyer_profile : v.buyer_profile;
    if (buyer) {
      yy = sectionTitle(doc, "Buyer Profile", yy);
      yy = writeText(doc, buyer, MARGIN, yy, CONTENT_W, 8, MID_GRAY, 1.5);
      yy += 3;
    }
    if (isBreeze && v.pinhooker_verdict) {
      yy = sectionTitle(doc, "Pinhooker Verdict", yy);
      yy = writeText(doc, v.pinhooker_verdict, MARGIN, yy, CONTENT_W, 8, DARK_TEXT, 1.5);
      yy += 3;
    }
    if (Array.isArray(v.red_flags) && v.red_flags.length > 0) {
      yy = checkPage(doc, yy, 20);
      drawRect(doc, MARGIN, yy, CONTENT_W, 6 + v.red_flags.length * 6, GOLD_BG);
      doc.setFontSize(8); doc.setTextColor(...RED); doc.setFont("helvetica", "bold");
      doc.text("Red Flags", MARGIN + 3, yy + 5);
      doc.setFont("helvetica", "normal");
      let ry = yy + 10;
      for (const rf of v.red_flags) { doc.setFontSize(7); doc.setTextColor(...RED); doc.text(`! ${sanitize(String(rf))}`, MARGIN + 3, ry); ry += 5; }
      yy = ry + 3;
    }
  }

  addFooter(doc);
  return doc;
}

export function downloadCatalogLotPDF(horse: any) {
  generateCatalogLotPDF(horse).then(doc => {
    const name = horse.name && horse.name !== "Unnamed" ? horse.name.replace(/\s+/g, "_") : `Lot_${horse.lot_number || "Unknown"}`;
    doc.save(`BloodstockAI_${name}_Analysis.pdf`);
  });
}
