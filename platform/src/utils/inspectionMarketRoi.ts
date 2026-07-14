import type { MarketTiersData } from "@/components/dashboard/MarketEstimateTiers";
import type { MarketRoiData, RoiCategory, FuturePotential } from "@/components/dashboard/inspection/MarketRoiPanel";

/** Commercial Adjustment Engine — mirrors how bloodstock agents discount or reward
 *  horses at public auction based on inspection findings. */
export interface CommercialAdjustment {
  pct: number;                 // -40..+20
  reasons: { label: string; impact: number; kind: "penalty" | "bonus" | "vet" }[];
  severity: "none" | "minor" | "moderate" | "major";
  vetFlag: boolean;
  confidence_shift: -2 | -1 | 0;
  narrative: string;
}

const MAJOR_PENALTIES: Array<[RegExp, number, string]> = [
  [/offset\s+knee|bench\s+knee/i, -14, "Offset / bench knees"],
  [/calf[-\s]?knee|back\s+at\s+the\s+knee/i, -22, "Calf knee / back at the knee"],
  [/over\s+at\s+the\s+knee/i, -10, "Over at the knee"],
  [/rotational\s+(limb\s+)?deformity/i, -18, "Rotational limb deformity"],
  [/angular\s+limb\s+deformity|ALD\b/i, -16, "Angular limb deformity"],
  [/toe[-\s]?(in|out)|pigeon[-\s]?toed|splay[-\s]?footed/i, -10, "Toe in / toe out"],
  [/significant\s+asymmetry|marked\s+asymmetry/i, -12, "Significant muscular / skeletal asymmetry"],
  [/poor\s+hoof[-\s]?pastern\s+axis|broken[-\s]?(back|forward)\s+axis/i, -12, "Poor hoof-pastern axis"],
  [/club\s+foot|clubfoot/i, -14, "Club foot"],
  [/upright\s+pastern/i, -8, "Upright pastern"],
  [/sickle\s+hock|cow[-\s]?hock/i, -10, "Sickle / cow hock"],
  [/curb\b|osselet|splint\b|wind[-\s]?puff|effusion/i, -10, "Veterinary blemish (curb / osselet / effusion)"],
  [/OCD\b|osteochondrosis|bone\s+cyst/i, -20, "OCD / bone cyst lesion"],
];

const MODERATE_PENALTIES: Array<[RegExp, number, string]> = [
  [/light\s+offset|mild\s+offset|slight\s+offset/i, -5, "Light offset knee"],
  [/slight\s+muscle\s+asymmetry|mild\s+asymmetry/i, -4, "Slight muscle asymmetry"],
  [/immature\s+topline|weak\s+topline/i, -4, "Immature topline"],
  [/slight\s+imbalance|minor\s+imbalance/i, -3, "Slight imbalance"],
  [/mild\s+upright\s+shoulder|straight\s+shoulder/i, -5, "Upright / straight shoulder"],
  [/minor\s+pastern\s+deviation|slight\s+pastern/i, -4, "Minor pastern deviation"],
  [/long\s+pastern|short\s+pastern/i, -3, "Pastern length deviation"],
  [/short\s+stride|restricted\s+movement/i, -4, "Restricted movement"],
];

const POSITIVES: Array<[RegExp, number, string]> = [
  [/excellent\s+shoulder|ideal\s+shoulder\s+angle/i, 4, "Excellent shoulder angle"],
  [/excellent\s+hindquarter|powerful\s+hindquarter/i, 4, "Excellent hindquarter"],
  [/strong\s+loin|deep\s+loin/i, 3, "Strong loin"],
  [/balanced\s+proportions|well[-\s]?balanced|excellent\s+balance/i, 4, "Balanced proportions"],
  [/excellent\s+limb\s+alignment|correct\s+limbs/i, 5, "Excellent limb alignment"],
  [/(exceptional|excellent)\s+muscle\s+symmetry/i, 4, "Exceptional muscle symmetry"],
  [/correct\s+feet|excellent\s+feet|quality\s+feet/i, 3, "Correct feet"],
  [/efficient\s+biomechanics|fluid\s+movement|elastic\s+stride/i, 5, "Efficient biomechanics"],
  [/scope|athletic\s+frame|quality\s+individual/i, 3, "Athletic / scopey frame"],
];

const VET_FLAGS: RegExp[] = [
  /veterinary\s+(radiograph|x[-\s]?ray|inspection|examination|imaging)/i,
  /further\s+veterinary/i,
  /potential\s+developmental\s+issue/i,
  /recommend(ed)?\s+radiograph/i,
  /pre[-\s]?purchase\s+exam/i,
];

export function computeCommercialAdjustment(
  blocks: Array<{ observations?: string | null; attention_points?: string[] | null; bloodstock_insight?: string | null; score_breakdown?: any }> | null | undefined,
  pedigreeResearch?: any | null,
): CommercialAdjustment {
  const reasons: CommercialAdjustment["reasons"] = [];
  let vetFlag = false;

  const corpus: string[] = [];
  for (const b of blocks || []) {
    if (b?.observations) corpus.push(b.observations);
    if (b?.bloodstock_insight) corpus.push(b.bloodstock_insight);
    if (Array.isArray(b?.attention_points)) corpus.push(b!.attention_points!.join(" "));
    try {
      const sb = b?.score_breakdown;
      if (sb) corpus.push(JSON.stringify(sb));
    } catch { /* ignore */ }
  }
  if (pedigreeResearch) {
    try { corpus.push(JSON.stringify(pedigreeResearch)); } catch { /* ignore */ }
  }
  const text = corpus.join(" \n ");
  if (!text.trim()) {
    return { pct: 0, reasons: [], severity: "none", vetFlag: false, confidence_shift: 0, narrative: "" };
  }

  const seen = new Set<string>();
  const apply = (matrix: typeof MAJOR_PENALTIES, kind: "penalty" | "bonus") => {
    for (const [re, impact, label] of matrix) {
      if (re.test(text) && !seen.has(label)) {
        seen.add(label);
        reasons.push({ label, impact, kind });
      }
    }
  };
  apply(MAJOR_PENALTIES, "penalty");
  apply(MODERATE_PENALTIES, "penalty");
  apply(POSITIVES, "bonus");

  for (const re of VET_FLAGS) {
    if (re.test(text)) { vetFlag = true; break; }
  }
  if (vetFlag) reasons.push({ label: "Veterinary radiographs / further inspection advised", impact: -6, kind: "vet" });

  const raw = reasons.reduce((s, r) => s + r.impact, 0);
  const pct = Math.max(-40, Math.min(20, raw));

  const penaltySum = reasons.filter(r => r.kind !== "bonus").reduce((s, r) => s + r.impact, 0);
  const severity: CommercialAdjustment["severity"] =
    penaltySum <= -25 ? "major" :
    penaltySum <= -12 ? "moderate" :
    penaltySum <= -3 ? "minor" : "none";

  const confidence_shift: -2 | -1 | 0 =
    severity === "major" ? -2 : (severity === "moderate" || vetFlag) ? -1 : 0;

  const top = reasons.filter(r => r.kind !== "bonus").slice(0, 3).map(r => r.label);
  const narrative = pct === 0
    ? ""
    : pct < 0
      ? `Inspection findings (${top.join("; ") || "minor concerns"}) ${vetFlag ? "and recommended veterinary follow-up " : ""}reduce buyer participation. Commercial estimate adjusted ${pct}% to mirror auction behaviour at Tattersalls / Goffs / Keeneland / OBS.`
      : `Inspection highlights (${reasons.filter(r => r.kind === "bonus").slice(0, 3).map(r => r.label).join("; ")}) support premium bidding interest. Commercial estimate adjusted +${pct}%.`;

  return { pct, reasons, severity, vetFlag, confidence_shift, narrative };
}

function downgradeConfidence(c: MarketTiersData["confidence"], shift: number): MarketTiersData["confidence"] {
  const order: MarketTiersData["confidence"][] = ["insufficient", "low", "medium", "high"];
  const idx = Math.max(0, order.indexOf(c));
  const next = Math.max(0, Math.min(order.length - 1, idx + shift));
  return order[next];
}

/** Lightweight client-side deterministic estimator.
 *  Reads only the consolidated_score from an analysis and the horse category.
 *  No external API call, no AI cost — refined values come from the dedicated
 *  edge function once configured. */
export function buildMarketRoiFromScore(
  score: number | null | undefined,
  category: string,
  pedigreeRating?: number | null,   // 0..10
  pedigreeResearch?: any | null,
  blocks?: Array<{ observations?: string | null; attention_points?: string[] | null; bloodstock_insight?: string | null; score_breakdown?: any }> | null,
): MarketRoiData {
  const s = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 50;
  const ped = typeof pedigreeRating === "number" ? Math.max(0, Math.min(10, pedigreeRating)) : null;
  // Blend: 60% inspection, 40% pedigree (only when pedigree present)
  const blended = ped != null ? Math.round(s * 0.6 + ped * 10 * 0.4) : s;

  const baseByCategory: Record<string, number> = {
    FOAL: 25_000,
    YEARLING: 80_000,
    FLAT_IN_TRAINING: 120_000,
    NH_STORE_YOUNG: 40_000,
    NH_IN_TRAINING: 90_000,
    BROODMARE_STALLION: 150_000,
  };
  const base = baseByCategory[category] ?? 60_000;
  const factor = 0.4 + (blended / 100) * 1.6; // 0.4×..2.0×
  const lo = Math.round(base * factor * 0.55 / 1000) * 1000;
  const mid = Math.round(base * factor / 1000) * 1000;
  const med = Math.round(base * factor * 1.45 / 1000) * 1000;
  const hi = Math.round(base * factor * 2.2 / 1000) * 1000;
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

  // === Commercial Adjustment Engine ===
  const adjustment = computeCommercialAdjustment(blocks, pedigreeResearch);
  const mult = 1 + adjustment.pct / 100;
  const adj = (n: number) => Math.max(1000, Math.round((n * mult) / 1000) * 1000);
  const aLo = adj(lo), aMid = adj(mid), aMed = adj(med), aHi = adj(hi);

  const confidence: MarketTiersData["confidence"] =
    blended >= 75 ? "high" : blended >= 55 ? "medium" : blended > 0 ? "low" : "insufficient";
  const adjustedConfidence = downgradeConfidence(confidence, adjustment.confidence_shift);

  const market: MarketTiersData = {
    basic:   { label: "Conservative", scenario: "Soft market, limited interest", range: `${fmt(aLo)} – ${fmt(aMid)}` },
    median:  { label: "Base estimate", scenario: "Typical sale outcome for profile", range: `${fmt(aMid)} – ${fmt(aMed)}` },
    maximum: { label: "Upside",        scenario: "Strong demand, competitive bidding", range: `${fmt(aMed)} – ${fmt(aHi)}` },
    confidence: adjustedConfidence,
    confidence_note: ped != null
      ? "Estimate blends inspection score (60%) with pedigree rating (40%). Refined valuations require live comparables."
      : "Estimate derived from inspection score and category. Upload pedigree PDF to refine valuation.",
  };

  const risk = (v: number): RoiCategory["risk"] => (v >= 70 ? "Low" : v >= 55 ? "Medium" : "High");

  // Category-specific ROI scenarios only
  const ALL: Record<string, RoiCategory[]> = {
    FOAL: [
      { category: "FOAL", label: "Foal → Weanling",
        purchase: fmt(Math.round(mid * 0.4)), resale: fmt(Math.round(mid * 0.7)),
        prep_cost: fmt(8_000), risk: risk(blended), roi_pct: `${Math.round((0.7 - 0.4) / 0.4 * 100)}%`,
        best_window: "8–10 months", route: "Pinhook through November weanling sales (Keeneland Nov, Goffs, Tatts Dec)." },
      { category: "WEANLING", label: "Weanling → Yearling",
        purchase: fmt(Math.round(mid * 0.7)), resale: fmt(Math.round(mid * 1.1)),
        prep_cost: fmt(15_000), risk: risk(blended), roi_pct: `${Math.round(((1.1 - 0.7) / 0.7) * 100)}%`,
        best_window: "9–12 months", route: "Targeted September/October yearling consignment." },
    ],
    YEARLING: [
      { category: "YEARLING", label: "Yearling → 2YO Breeze-Up",
        purchase: fmt(mid), resale: fmt(Math.round(med * 1.1)),
        prep_cost: fmt(35_000), risk: risk(blended), roi_pct: `${Math.round((med * 1.1 - mid) / mid * 100)}%`,
        best_window: "March–June BU", route: "Breeze-up prep; resale at Craven, Goffs UK Breeze, OBS." },
      { category: "TWO_YO", label: "Yearling → Racing",
        purchase: fmt(mid), resale: "Race earnings + black-type uplift",
        prep_cost: fmt(45_000), risk: risk(blended), roi_pct: "Performance-dependent",
        best_window: "2yo–3yo season", route: "Racetrack route; residual stallion/broodmare value via black type." },
    ],
    FLAT_IN_TRAINING: [
      { category: "HORSE_IN_TRAINING", label: "In training → Resale / Black-Type",
        purchase: fmt(med), resale: fmt(Math.round(hi * 0.95)),
        prep_cost: fmt(25_000), risk: risk(blended), roi_pct: `${Math.round((hi * 0.95 - med) / med * 100)}%`,
        best_window: "Post-debut window", route: "HIT sales after winning debut or strong trial (Tatts HIT, Goffs Autumn HIT, Keeneland Nov)." },
    ],
    NH_IN_TRAINING: [
      { category: "HORSE_IN_TRAINING", label: "NH in training → Point-to-Point / Resale",
        purchase: fmt(med), resale: fmt(Math.round(hi * 0.9)),
        prep_cost: fmt(20_000), risk: risk(blended), roi_pct: `${Math.round((hi * 0.9 - med) / med * 100)}%`,
        best_window: "Post-P2P win", route: "Goffs UK Spring Store / Tatts Cheltenham after winning point-to-point." },
    ],
    NH_STORE_YOUNG: [
      { category: "WEANLING", label: "Store → Point-to-Pointer",
        purchase: fmt(mid), resale: fmt(Math.round(med * 1.2)),
        prep_cost: fmt(18_000), risk: risk(blended), roi_pct: `${Math.round((med * 1.2 - mid) / mid * 100)}%`,
        best_window: "12–18 months", route: "Pre-training then P2P season; resale at Tatts Cheltenham." },
    ],
    BROODMARE_STALLION: [
      { category: "HORSE_IN_TRAINING", label: "Broodmare → Foal/Resale",
        purchase: fmt(mid), resale: fmt(Math.round(hi * 0.85)),
        prep_cost: fmt(35_000), risk: risk(blended), roi_pct: `${Math.round((hi * 0.85 - mid) / mid * 100)}%`,
        best_window: "1 covering cycle", route: "Cover with commercial sire; resale in foal at Keeneland Nov / Tatts Dec." },
    ],
  };

  const roi = ALL[category] ?? ALL.YEARLING;

  // Future potential — G1/G2/G3 chances + black-type and lifetime earnings projection
  // Anchored to blended score with realistic base rates for thoroughbreds.
  const norm = blended / 100; // 0..1
  const g1 = Math.max(0.2, Math.min(28, Math.pow(norm, 2.4) * 28));
  const g2 = Math.max(0.5, Math.min(35, Math.pow(norm, 2.0) * 35));
  const g3 = Math.max(1.0, Math.min(42, Math.pow(norm, 1.7) * 42));
  const blackType = Math.max(2.0, Math.min(60, Math.pow(norm, 1.4) * 60));
  const winner = Math.max(15, Math.min(82, 25 + norm * 60));
  // Lifetime earnings projection (USD) — heuristic across major jurisdictions.
  const lifetimeBase = 18_000 + Math.pow(norm, 1.8) * 1_400_000;
  const lifetimeLow = Math.round(lifetimeBase * 0.55 / 1000) * 1000;
  const lifetimeHigh = Math.round(lifetimeBase * 1.6 / 1000) * 1000;

  // Try to pull commercial signals from pedigree research if present
  const sireC = pedigreeResearch?.sire?.commercial || {};
  const sireSales = pedigreeResearch?.sire?.sale_averages || {};
  const sireFee =
    sireC?.fee?.value || sireC?.stud_fee?.value || sireC?.["2026_fee"]?.value || null;
  const sireAvg =
    sireSales?.yearling_average?.value || sireSales?.average?.value || sireSales?.["2025_average"]?.value || null;
  const damProduce =
    pedigreeResearch?.dam?.produce_record?.black_type?.value ||
    pedigreeResearch?.dam?.black_type_progeny?.summary?.value || null;

  const verdict =
    blended >= 78 ? "Elite Coolmore/Godolphin profile — pursue aggressively." :
    blended >= 68 ? "Strong commercial profile — competitive at premier sales." :
    blended >= 58 ? "Solid prospect — value buy with upside via prep." :
    "Speculative — only buy at sharp discount or for jurisdiction-specific play.";

  const future: FuturePotential = {
    g1_pct: g1, g2_pct: g2, g3_pct: g3,
    black_type_pct: blackType, winner_pct: winner,
    lifetime_low: fmt(lifetimeLow), lifetime_high: fmt(lifetimeHigh),
    sire_fee: sireFee ? String(sireFee) : null,
    sire_yearling_avg: sireAvg ? String(sireAvg) : null,
    dam_black_type: damProduce ? String(damProduce) : null,
    verdict,
  };

  return { market, roi, future, adjustment };
}