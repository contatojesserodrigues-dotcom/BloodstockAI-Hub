/**
 * BloodstockAI — Score weighting + composition system.
 *
 * Rules:
 *  - Component weight = 0 → render N/A (not 0), excluded from overall.
 *  - Component weight > 0 but no data (null/undefined) → render "Not assessed",
 *    redistribute its weight proportionally across the components that DID get data.
 *  - Never use 0 as a placeholder for an unassessed component.
 */

export type HorseTypeKey =
  | "foal"
  | "weanling"
  | "yearling"
  | "2yo_breeze"
  | "3yo_flat"
  | "hit"
  | "national_hunt"
  | "point_to_point"
  | "broodmare";

export type ScoreComponent = "pedigree" | "commercial" | "performance" | "conformation";

export type ComponentWeights = Record<ScoreComponent, number>;

export const SCORE_WEIGHTS: Record<HorseTypeKey, ComponentWeights> = {
  foal:           { pedigree: 0.60, commercial: 0.40, performance: 0.00, conformation: 0.00 },
  weanling:       { pedigree: 0.55, commercial: 0.35, performance: 0.00, conformation: 0.10 },
  yearling:       { pedigree: 0.45, commercial: 0.35, performance: 0.00, conformation: 0.20 },
  "2yo_breeze":   { pedigree: 0.30, commercial: 0.30, performance: 0.20, conformation: 0.20 },
  "3yo_flat":     { pedigree: 0.25, commercial: 0.25, performance: 0.35, conformation: 0.15 },
  hit:            { pedigree: 0.20, commercial: 0.25, performance: 0.45, conformation: 0.10 },
  national_hunt:  { pedigree: 0.25, commercial: 0.25, performance: 0.35, conformation: 0.15 },
  point_to_point: { pedigree: 0.20, commercial: 0.20, performance: 0.50, conformation: 0.10 },
  broodmare:      { pedigree: 0.40, commercial: 0.40, performance: 0.20, conformation: 0.00 },
};

export type ComponentScore = number | null | undefined;

export interface ScoreInputs {
  pedigree?: ComponentScore;
  commercial?: ComponentScore;
  performance?: ComponentScore;
  conformation?: ComponentScore;
}

export type DisplayState = "scored" | "not_assessed" | "na";

export interface ComponentDisplay {
  state: DisplayState;
  score: number | null; // null when not_assessed or na
  weight: number;       // 0 when na
}

export function getWeights(horseType: string | undefined | null): ComponentWeights {
  const key = (horseType || "yearling") as HorseTypeKey;
  return SCORE_WEIGHTS[key] || SCORE_WEIGHTS.yearling;
}

export function computeDisplay(
  scores: ScoreInputs,
  horseType: string | undefined | null,
): Record<ScoreComponent, ComponentDisplay> {
  const weights = getWeights(horseType);
  const out = {} as Record<ScoreComponent, ComponentDisplay>;
  (Object.keys(weights) as ScoreComponent[]).forEach((c) => {
    const w = weights[c];
    const raw = scores[c];
    if (w === 0) {
      out[c] = { state: "na", score: null, weight: 0 };
    } else if (raw === null || raw === undefined || Number.isNaN(Number(raw))) {
      out[c] = { state: "not_assessed", score: null, weight: w };
    } else {
      out[c] = { state: "scored", score: Math.round(Number(raw)), weight: w };
    }
  });
  return out;
}

/**
 * Compute the weighted overall (0–100). Skips na components entirely.
 * Redistributes "not_assessed" weights across scored components.
 */
export function calculateOverallScore(
  scores: ScoreInputs,
  horseType: string | undefined | null,
): number {
  const display = computeDisplay(scores, horseType);
  let totalWeight = 0;
  let sum = 0;
  (Object.keys(display) as ScoreComponent[]).forEach((c) => {
    const d = display[c];
    if (d.state !== "scored" || d.score == null) return;
    sum += d.score * d.weight;
    totalWeight += d.weight;
  });
  return totalWeight > 0 ? Math.round(sum / totalWeight) : 0;
}

/** Dynamic colour bands for score bars (Tailwind classes). */
export function scoreBandClass(score: number | null | undefined): {
  fill: string;
  text: string;
} {
  if (score == null) return { fill: "bg-muted-foreground/20", text: "text-muted-foreground" };
  if (score >= 70) return { fill: "bg-secondary", text: "text-secondary" }; // gold
  if (score >= 50) return { fill: "bg-amber-500", text: "text-amber-400" };
  if (score >= 30) return { fill: "bg-orange-500", text: "text-orange-400" };
  return { fill: "bg-red-500", text: "text-red-400" };
}