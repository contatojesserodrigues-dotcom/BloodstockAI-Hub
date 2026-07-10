import jsPDF from "jspdf";
import logoSrc from "@/assets/logo.png";
import type {
  BroodmarePlanResult,
  MareInput,
  StallionRecommendation,
} from "@/services/broodmarePlanningService";

let logoBase64: string | null = null;
const logoReady = new Promise<void>((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      logoBase64 = c.toDataURL("image/png", 1.0);
    }
    resolve();
  };
  img.onerror = () => resolve();
  img.src = logoSrc;
});

const NAVY = [13, 25, 56] as const;
const GOLD = [170, 138, 30] as const;
const TEXT = [26, 26, 46] as const;
const MUTED = [110, 110, 115] as const;
const LIGHT = [248, 249, 250] as const;
const BORDER = [220, 215, 200] as const;

function setFill(d: jsPDF, c: readonly number[]) {
  d.setFillColor(c[0], c[1], c[2]);
}
function setText(d: jsPDF, c: readonly number[]) {
  d.setTextColor(c[0], c[1], c[2]);
}
function setDraw(d: jsPDF, c: readonly number[]) {
  d.setDrawColor(c[0], c[1], c[2]);
}

function wrap(d: jsPDF, text: string, maxW: number): string[] {
  if (!text) return [""];
  return d.splitTextToSize(text, maxW);
}

function ensureSpace(d: jsPDF, y: number, needed: number, headerLine: () => void): number {
  const pageH = d.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    d.addPage();
    headerLine();
    return 28;
  }
  return y;
}

function pageHeader(d: jsPDF, mareName: string) {
  setFill(d, NAVY);
  d.rect(0, 0, d.internal.pageSize.getWidth(), 18, "F");
  setText(d, [255, 255, 255]);
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.text("BloodstockAI® · AI Broodmare Planning Report", 14, 12);
  d.setFont("helvetica", "normal");
  d.setFontSize(8);
  d.text(mareName, d.internal.pageSize.getWidth() - 14, 12, { align: "right" });
}

function section(d: jsPDF, y: number, title: string): number {
  setFill(d, NAVY);
  d.rect(14, y, 6, 6, "F");
  setText(d, NAVY);
  d.setFont("helvetica", "bold");
  d.setFontSize(13);
  d.text(title.toUpperCase(), 24, y + 5);
  setDraw(d, GOLD);
  d.setLineWidth(0.5);
  d.line(14, y + 9, d.internal.pageSize.getWidth() - 14, y + 9);
  return y + 14;
}

function paragraph(d: jsPDF, y: number, text: string, mareName: string): number {
  setText(d, TEXT);
  d.setFont("helvetica", "normal");
  d.setFontSize(10);
  const lines = wrap(d, text || "—", d.internal.pageSize.getWidth() - 28);
  for (const line of lines) {
    y = ensureSpace(d, y, 5, () => pageHeader(d, mareName));
    d.text(line, 14, y);
    y += 5;
  }
  return y + 2;
}

function kvBlock(d: jsPDF, y: number, rows: [string, string][], mareName: string): number {
  const colW = (d.internal.pageSize.getWidth() - 28) / 2;
  setText(d, TEXT);
  d.setFontSize(9);
  rows.forEach((r, i) => {
    const col = i % 2;
    if (col === 0) y = ensureSpace(d, y, 8, () => pageHeader(d, mareName));
    const x = 14 + col * colW;
    setText(d, MUTED);
    d.setFont("helvetica", "bold");
    d.text(r[0].toUpperCase(), x, y);
    setText(d, TEXT);
    d.setFont("helvetica", "normal");
    d.text(String(r[1] ?? "—"), x, y + 4);
    if (col === 1) y += 10;
  });
  if (rows.length % 2 === 1) y += 10;
  return y + 2;
}

function scoreBar(d: jsPDF, x: number, y: number, w: number, label: string, value: number) {
  setText(d, TEXT);
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.text(label, x, y);
  setText(d, NAVY);
  d.text(`${Math.round(value)}/100`, x + w, y, { align: "right" });
  setFill(d, LIGHT);
  d.rect(x, y + 2, w, 3.5, "F");
  setFill(d, GOLD);
  d.rect(x, y + 2, (w * Math.max(0, Math.min(100, value))) / 100, 3.5, "F");
}

function fmtUsd(n?: number): string {
  if (n == null || isNaN(n as number)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtRange(r?: { low: number; mid: number; high: number }): string {
  if (!r) return "—";
  return `${fmtUsd(r.low)} – ${fmtUsd(r.high)} (mid ${fmtUsd(r.mid)})`;
}

function stallionTable(
  d: jsPDF,
  y: number,
  rows: StallionRecommendation[],
  mareName: string,
): number {
  const cols = [
    { k: "rank", label: "#", w: 8 },
    { k: "name", label: "STALLION", w: 50 },
    { k: "compatibility_score", label: "COMPAT", w: 18 },
    { k: "nick_rating", label: "NICK", w: 14 },
    { k: "commercial_score", label: "COMM", w: 16 },
    { k: "expected_roi_percent", label: "ROI%", w: 14 },
    { k: "confidence_score", label: "CONF", w: 14 },
    { k: "expected_distance", label: "DIST", w: 22 },
    { k: "risk_rating", label: "RISK", w: 14 },
  ] as const;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const startX = 14;

  const drawHeader = () => {
    setFill(d, NAVY);
    d.rect(startX, y, totalW, 6, "F");
    setText(d, [255, 255, 255]);
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    let x = startX + 1;
    cols.forEach((c) => {
      d.text(c.label, x, y + 4);
      x += c.w;
    });
    y += 8;
  };
  drawHeader();

  d.setFont("helvetica", "normal");
  d.setFontSize(8);
  setText(d, TEXT);
  rows.forEach((s, i) => {
    if (y > d.internal.pageSize.getHeight() - 25) {
      d.addPage();
      pageHeader(d, mareName);
      y = 28;
      drawHeader();
    }
    if (i % 2 === 0) {
      setFill(d, LIGHT);
      d.rect(startX, y - 4, totalW, 6, "F");
    }
    setText(d, TEXT);
    let x = startX + 1;
    cols.forEach((c) => {
      const v: any = (s as any)[c.k];
      const out =
        typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v ?? "—");
      d.text(out.slice(0, c.k === "name" ? 28 : 14), x, y);
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
  await logoReady;
  const d = new jsPDF({ unit: "mm", format: "a4" });
  const W = d.internal.pageSize.getWidth();
  const H = d.internal.pageSize.getHeight();

  // ============ COVER ============
  setFill(d, NAVY);
  d.rect(0, 0, W, H, "F");
  if (logoBase64) {
    try {
      d.addImage(logoBase64, "PNG", W / 2 - 25, 40, 50, 50);
    } catch { /* ignore */ }
  }
  setText(d, [255, 255, 255]);
  d.setFont("helvetica", "bold");
  d.setFontSize(26);
  d.text("AI BROODMARE PLANNING", W / 2, 110, { align: "center" });
  setText(d, GOLD);
  d.setFontSize(14);
  d.text("STRATEGIC BREEDING INTELLIGENCE REPORT", W / 2, 120, { align: "center" });

  setText(d, [255, 255, 255]);
  d.setFontSize(22);
  d.text(mare.name.toUpperCase(), W / 2, 150, { align: "center" });
  d.setFont("helvetica", "normal");
  d.setFontSize(11);
  const meta = [
    mare.colour ? `Colour: ${mare.colour}` : null,
    mare.year_of_birth ? `YOB: ${mare.year_of_birth}` : null,
    mare.registration_authority ? `Reg: ${mare.registration_authority}` : null,
    mare.country ? `Country: ${mare.country}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  d.text(meta, W / 2, 160, { align: "center" });
  if (mare.owner) d.text(`Owner: ${mare.owner}`, W / 2, 170, { align: "center" });
  if (mare.farm) d.text(`Farm: ${mare.farm}`, W / 2, 176, { align: "center" });
  d.text(
    mare.breeding_status === "proven" ? "Proven Broodmare" : "Maiden Broodmare",
    W / 2,
    184,
    { align: "center" },
  );

  setText(d, GOLD);
  d.text(`Date of Analysis: ${new Date().toLocaleDateString()}`, W / 2, H - 30, { align: "center" });
  setText(d, [255, 255, 255]);
  d.setFontSize(9);
  d.text("Prepared by BloodstockAI®", W / 2, H - 22, { align: "center" });

  // ============ BODY PAGES ============
  d.addPage();
  pageHeader(d, mare.name);
  let y = 28;

  y = section(d, y, "Executive Summary");
  y = paragraph(d, y, plan.executive_summary, mare.name);

  y = section(d, y, "Broodmare Overview");
  y = paragraph(d, y, plan.broodmare_overview, mare.name);
  y = kvBlock(
    d,
    y,
    [
      ["Name", mare.name],
      ["YOB", String(mare.year_of_birth)],
      ["Age", String(new Date().getFullYear() - mare.year_of_birth)],
      ["Colour", mare.colour || "—"],
      ["Owner", mare.owner || "—"],
      ["Farm", mare.farm || "—"],
      ["Country", mare.country || "—"],
      ["Registration", mare.registration_authority || "—"],
      ["Status", mare.breeding_status === "proven" ? "Proven" : "Maiden"],
      ["Previous foals", String(mare.previous_foals?.length ?? 0)],
    ],
    mare.name,
  );

  y = section(d, y, "Pedigree Analysis");
  for (const [k, v] of Object.entries(plan.pedigree_analysis || {})) {
    setText(d, GOLD);
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    y = ensureSpace(d, y, 8, () => pageHeader(d, mare.name));
    d.text(k.replace(/_/g, " ").toUpperCase(), 14, y);
    y += 5;
    y = paragraph(d, y, String(v), mare.name);
  }

  y = section(d, y, "Genetic Analysis");
  y = kvBlock(
    d,
    y,
    Object.entries(plan.genetic_analysis || {}).map(([k, v]) => [
      k.replace(/_/g, " "),
      typeof v === "number" ? v.toFixed(2) : String(v),
    ]),
    mare.name,
  );

  y = section(d, y, "Physical Compatibility");
  y = kvBlock(
    d,
    y,
    Object.entries(plan.physical_compatibility || {}).map(([k, v]) => [
      k.replace(/_/g, " "),
      String(v),
    ]),
    mare.name,
  );

  y = section(d, y, "Performance Projection");
  const perf = plan.performance_projection || {};
  const half = (W - 28) / 2 - 4;
  const perfEntries = Object.entries(perf);
  for (let i = 0; i < perfEntries.length; i += 2) {
    y = ensureSpace(d, y, 10, () => pageHeader(d, mare.name));
    scoreBar(d, 14, y, half, perfEntries[i][0].replace(/_/g, " "), (perfEntries[i][1] as number) * 100);
    if (perfEntries[i + 1]) {
      scoreBar(
        d,
        14 + half + 8,
        y,
        half,
        perfEntries[i + 1][0].replace(/_/g, " "),
        (perfEntries[i + 1][1] as number) * 100,
      );
    }
    y += 10;
  }

  y = section(d, y, "Commercial Analysis");
  const ca: any = plan.commercial_analysis || {};
  y = kvBlock(
    d,
    y,
    [
      ["Demand index", String(ca.demand_index ?? "—")],
      ["Auction appeal", String(ca.auction_appeal_score ?? "—")],
      ["International appeal", String(ca.international_buyer_appeal ?? "—")],
      ["Liquidity", String(ca.liquidity_score ?? "—")],
      ["Commercial risk", String(ca.commercial_risk ?? "—")],
      ["Price confidence", String(ca.price_confidence ?? "—")],
      ["Est. yearling value", fmtRange(ca.estimated_yearling_value_usd)],
      ["Est. breeze-up value", fmtRange(ca.estimated_breeze_up_value_usd)],
      ["Est. broodmare value", fmtRange(ca.estimated_broodmare_value_usd)],
      ["Est. ROI", ca.estimated_roi_percent != null ? `${ca.estimated_roi_percent}%` : "—"],
    ],
    mare.name,
  );
  setText(d, MUTED);
  d.setFontSize(8);
  d.setFont("helvetica", "italic");
  d.text(
    "All monetary figures are probabilistic projections based on historical market data, pedigree quality and current commercial trends. They are not guaranteed sale prices.",
    14,
    y,
    { maxWidth: W - 28 },
  );
  y += 10;

  y = section(d, y, "Score Dashboard");
  for (const [k, v] of Object.entries(plan.scores || {})) {
    y = ensureSpace(d, y, 10, () => pageHeader(d, mare.name));
    scoreBar(d, 14, y, W - 28, k.replace(/_/g, " "), v as number);
    y += 10;
  }

  // === SEASONS ===
  (plan.seasons || []).forEach((s, idx) => {
    d.addPage();
    pageHeader(d, mare.name);
    y = 28;
    y = section(
      d,
      y,
      `Season ${idx + 1} — ${s.year} (Mare age ${s.mare_age_at_cover})`,
    );
    y = kvBlock(
      d,
      y,
      [
        ["Strategic goal", s.strategic_goal],
        ["Commercial goal", s.commercial_goal],
        ["Expected market", s.expected_market],
        ["Yearling value", fmtRange(s.expected_yearling_value_usd)],
        ["Expected ROI", `${s.expected_roi_percent ?? "—"}%`],
        ["Racing profile", s.expected_racing_profile],
      ],
      mare.name,
    );
    y = paragraph(d, y, s.reasoning, mare.name);
    setText(d, GOLD);
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    y = ensureSpace(d, y, 10, () => pageHeader(d, mare.name));
    d.text("TOP 25 STALLION RECOMMENDATIONS", 14, y);
    y += 4;
    y = stallionTable(d, y, s.top_stallions || [], mare.name);

    if (s.alternative_stallions?.length) {
      y = ensureSpace(d, y, 14, () => pageHeader(d, mare.name));
      setText(d, GOLD);
      d.setFont("helvetica", "bold");
      d.setFontSize(11);
      d.text("ALTERNATIVE STALLIONS", 14, y);
      y += 6;
      d.setFont("helvetica", "normal");
      d.setFontSize(9);
      setText(d, TEXT);
      s.alternative_stallions.forEach((a) => {
        y = ensureSpace(d, y, 8, () => pageHeader(d, mare.name));
        d.setFont("helvetica", "bold");
        d.text(`• ${a.name} — score ${a.compatibility_score}`, 14, y);
        y += 4;
        d.setFont("helvetica", "normal");
        const lines = wrap(d, a.rationale || "—", W - 32);
        for (const ln of lines) {
          y = ensureSpace(d, y, 5, () => pageHeader(d, mare.name));
          d.text(ln, 18, y);
          y += 4;
        }
        y += 2;
      });
    }
  });

  d.addPage();
  pageHeader(d, mare.name);
  y = 28;
  y = section(d, y, "Risk Assessment");
  y = paragraph(d, y, plan.risk_assessment, mare.name);
  y = section(d, y, "Final Professional Recommendation");
  y = paragraph(d, y, plan.final_recommendation, mare.name);

  // Footer on every page
  const pages = d.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    d.setPage(i);
    setText(d, MUTED);
    d.setFont("helvetica", "italic");
    d.setFontSize(7);
    d.text(
      "BloodstockAI® · Strategic Breeding Intelligence — Confidential client report. Figures are probabilistic projections, not guaranteed values.",
      W / 2,
      H - 8,
      { align: "center" },
    );
    d.text(`Page ${i} / ${pages}`, W - 14, H - 8, { align: "right" });
  }

  return d.output("blob");
}