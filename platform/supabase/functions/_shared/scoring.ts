import { lookupSireTier, SIRE_TIER_POINTS, SireTier } from "./sireTierMap.ts";

export interface ExtractedLot {
  lot_number: string | number;
  sire: string | null;
  dam: string | null;
  sex: string | null;
  foaling_month: string | number | null;
  black_type_counts: { g1?: number; g2?: number; g3?: number; listed?: number };
  black_type_sibling: boolean;
  group_listed_dam: boolean;
  ebf_nominated: boolean;
  consignor: string | null;
}

export interface ScoredLot extends ExtractedLot {
  sire_tier: SireTier;
  sire_tier_points: number;
  family_points: number;
  sex_month_points: number;
  ebf_points: number;
  score: number;
  classification: "Elite / Black-type" | "Commercial" | "Value / Pedigree";
  analyst_read: string;
}

function monthToNumber(m: any): number | null {
  if (m === null || m === undefined) return null;
  if (typeof m === "number") return m;
  const map: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
    september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const key = String(m).trim().toLowerCase();
  return map[key] ?? Number(key) ?? null;
}

export function scoreLot(
  lot: ExtractedLot,
  breedType: "Flat" | "NH" = "Flat"
): ScoredLot {
  const tier = lookupSireTier(lot.sire);
  const sirePts = SIRE_TIER_POINTS[tier];

  // Female-family black-type (max 46)
  const c = lot.black_type_counts || {};
  const g1 = Number(c.g1 || 0);
  const g2 = Number(c.g2 || 0);
  const g3 = Number(c.g3 || 0);
  const l = Number(c.listed || 0);
  let familyPts = 0;
  familyPts += Math.min(g1 * 8, 20);
  familyPts += Math.min(g2 * 5, 12);
  familyPts += Math.min(g3 * 3, 8);
  familyPts += Math.min(l * 1.5, 6);
  if (lot.black_type_sibling) familyPts += 6;
  if (lot.group_listed_dam) familyPts += 8;
  familyPts = Math.min(familyPts, 46);

  // Sex / foaling month (max 10). For NH stores foaling month is less relevant.
  let sexMonthPts = 0;
  const m = monthToNumber(lot.foaling_month);
  if (breedType === "Flat" && m !== null) {
    if (m <= 2) sexMonthPts += 7;
    else if (m <= 4) sexMonthPts += 5;
    else if (m <= 6) sexMonthPts += 2;
  } else {
    sexMonthPts += 3; // neutral
  }
  const sex = String(lot.sex || "").toLowerCase();
  if (sex.startsWith("colt") || sex.startsWith("filly")) sexMonthPts += 3;
  sexMonthPts = Math.min(sexMonthPts, 10);

  const ebfPts = lot.ebf_nominated ? 2 : 0;
  const score = Math.round(sirePts + familyPts + sexMonthPts + ebfPts);

  // Classification
  let classification: ScoredLot["classification"];
  const commercialSire = tier === "elite" || tier === "strong" || tier === "solid";
  const liveBlackTypePage =
    g1 > 0 || lot.group_listed_dam || lot.black_type_sibling || g2 + g3 >= 2;
  if (commercialSire && (g1 > 0 || lot.group_listed_dam)) {
    classification = "Elite / Black-type";
  } else if (commercialSire && liveBlackTypePage) {
    classification = "Commercial";
  } else {
    classification = "Value / Pedigree";
  }

  // Deterministic analyst read built only from verified inputs
  const parts: string[] = [];
  parts.push(
    `${tier === "neutral" ? "Sire outside commercial tier map" : `${tier[0].toUpperCase() + tier.slice(1)}-tier sire`} ${lot.sire ?? ""}`.trim()
  );
  if (g1 > 0) parts.push(`${g1} G1 in close pedigree`);
  if (g2 > 0) parts.push(`${g2} G2`);
  if (g3 > 0) parts.push(`${g3} G3`);
  if (l > 0) parts.push(`${l} Listed`);
  if (lot.group_listed_dam) parts.push("Group/Listed dam");
  if (lot.black_type_sibling) parts.push("black-type sibling");
  if (breedType === "Flat" && m !== null && m <= 4) parts.push(`forward ${m <= 2 ? "Jan/Feb" : "Mar/Apr"} foal`);
  if (lot.ebf_nominated) parts.push("EBF nominated");
  const analyst_read = parts.filter(Boolean).join(" · ") || "Sound commercial profile.";

  return {
    ...lot,
    sire_tier: tier,
    sire_tier_points: sirePts,
    family_points: familyPts,
    sex_month_points: sexMonthPts,
    ebf_points: ebfPts,
    score,
    classification,
    analyst_read,
  };
}

export function scoreLots(
  lots: ExtractedLot[],
  breedType: "Flat" | "NH" = "Flat"
): ScoredLot[] {
  return lots.map((l) => scoreLot(l, breedType));
}