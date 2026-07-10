// Scoring engine — Horse Intelligence Score, G1, BPI integration, ROI, Longevity
// All formulas per BloodstockAI Equine Intelligence specification

import type {
  BehaviourBreakdown,
  BiomechanicsInput,
  ComponentScores,
  ConformationBreakdown,
  DistanceIndices,
  G1PotentialIndex,
  IntelligenceScores,
  LongevityScore,
  PedigreeBreakdown,
  RoiScore,
  SoundnessRisk,
} from "./types.ts";
import { G1_TIERS, HORSE_INTELLIGENCE_WEIGHTS, CONFORMATION_WEIGHTS, PEDIGREE_WEIGHTS, BEHAVIOUR_WEIGHTS, LONGEVITY_RISK_WEIGHTS, ROI_WEIGHTS, DISTANCE_WEIGHTS, MAX_LEG_DEVIATION_PENALTY, OPTIMAL_SHOULDER_ANGLE } from "./constants.ts";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

// ─── 7 Conformation Score ─────────────────────────────────────
export function computeConformationScore(breakdown: Omit<ConformationBreakdown, "total">): ConformationBreakdown {
  const total = clamp(
    breakdown.balance * CONFORMATION_WEIGHTS.balance +
    breakdown.leg_alignment * CONFORMATION_WEIGHTS.leg_alignment +
    breakdown.shoulder * CONFORMATION_WEIGHTS.shoulder +
    breakdown.hindquarter * CONFORMATION_WEIGHTS.hindquarter +
    breakdown.bone_structure * CONFORMATION_WEIGHTS.bone_structure,
  );
  return { ...breakdown, total };
}

// ─── 8 Leg Alignment Score ────────────────────────────────────
export function computeLegAlignmentScore(deviationDegrees: number): number {
  return clamp(100 - Math.abs(deviationDegrees) * MAX_LEG_DEVIATION_PENALTY);
}

// ─── 9 Pedigree Score ─────────────────────────────────────────
export function computePedigreeScore(breakdown: Omit<PedigreeBreakdown, "total">): PedigreeBreakdown {
  const total = clamp(
    breakdown.sire_performance * PEDIGREE_WEIGHTS.sire_influence +
    breakdown.dam_performance * PEDIGREE_WEIGHTS.dam_influence +
    breakdown.family_black_type * PEDIGREE_WEIGHTS.family_black_type +
    breakdown.cross_compatibility * PEDIGREE_WEIGHTS.nick_compatibility,
  );
  return { ...breakdown, total };
}

export function pedigreeBreakdownFromResearch(pr?: any): PedigreeBreakdown {
  const rating = typeof pr?.pedigree_rating === "number" ? pr.pedigree_rating * 10 : 50;
  const sirePerf = typeof pr?.sire?.performance_score === "number"
    ? pr.sire.performance_score
    : typeof pr?.sire?.commercial?.fee?.value === "string" ? rating : rating;
  const damPerf = typeof pr?.dam?.produce_record?.quality === "number"
    ? pr.dam.produce_record.quality
    : rating;
  const blackType = typeof pr?.dam?.produce_record?.black_type?.value === "number"
    ? clamp(Number(pr.dam.produce_record.black_type.value) * 10)
    : rating * 0.9;
  const cross = typeof pr?.nick_rating === "number"
    ? clamp(pr.nick_rating * 10)
    : rating * 0.85;

  return computePedigreeScore({
    sire_performance: clamp(sirePerf),
    dam_performance: clamp(damPerf),
    family_black_type: clamp(blackType),
    cross_compatibility: clamp(cross),
  });
}

// ─── 10 Behaviour Score ───────────────────────────────────────
export function computeBehaviourScore(breakdown: Omit<BehaviourBreakdown, "total">): BehaviourBreakdown {
  const total = clamp(
    breakdown.calmness * BEHAVIOUR_WEIGHTS.calmness +
    breakdown.focus * BEHAVIOUR_WEIGHTS.focus +
    breakdown.handling * BEHAVIOUR_WEIGHTS.handling +
    breakdown.stress_recovery * BEHAVIOUR_WEIGHTS.stress_recovery,
  );
  return { ...breakdown, total };
}

// ─── 12 G1 Potential / Horse Intelligence Score ───────────────
export function computeHorseIntelligenceScore(components: ComponentScores): number {
  return clamp(
    components.biomechanics * HORSE_INTELLIGENCE_WEIGHTS.biomechanics +
    components.pedigree * HORSE_INTELLIGENCE_WEIGHTS.pedigree +
    components.conformation * HORSE_INTELLIGENCE_WEIGHTS.conformation +
    components.behaviour * HORSE_INTELLIGENCE_WEIGHTS.behaviour +
    components.commercial * HORSE_INTELLIGENCE_WEIGHTS.commercial,
  );
}

export function g1TierLabel(score: number): string {
  for (const tier of G1_TIERS) {
    if (score >= tier.min) return tier.label;
  }
  return G1_TIERS[G1_TIERS.length - 1].label;
}

export function computeG1Potential(components: ComponentScores): G1PotentialIndex {
  const score = computeHorseIntelligenceScore(components);
  const tier_label = g1TierLabel(score);
  const factors: string[] = [];
  if (components.pedigree >= 75) factors.push("Strong pedigree foundation");
  if (components.biomechanics >= 75) factors.push("Efficient biomechanical performance (BPI)");
  if (components.conformation >= 75) factors.push("Sound conformation profile");
  if (components.commercial >= 70) factors.push("Commercial market appeal");
  if (components.biomechanics < 55) factors.push("Biomechanical inefficiencies limit ceiling");
  if (components.pedigree < 55) factors.push("Pedigree depth constrains G1 upside");

  return {
    score,
    tier_label,
    probability_label: tier_label,
    factors,
  };
}

// ─── 11 Racing Distance Model ─────────────────────────────────
export function computeDistanceIndices(input: {
  speed?: number;
  frequency?: number;
  explosiveness?: number;
  stride?: number;
  efficiency?: number;
  balance?: number;
  stamina_pedigree?: number;
  energy_economy?: number;
  heart_capacity_proxy?: number;
  pedigree?: number;
}): DistanceIndices {
  const speed = input.speed ?? 50;
  const frequency = input.frequency ?? 50;
  const explosiveness = input.explosiveness ?? 50;
  const stride = input.stride ?? 50;
  const efficiency = input.efficiency ?? 50;
  const balance = input.balance ?? 50;
  const staminaPed = input.stamina_pedigree ?? 50;
  const energyEconomy = input.energy_economy ?? 50;
  const pedigree = input.pedigree ?? 50;

  const dw = DISTANCE_WEIGHTS;
  const sprint = clamp(speed * dw.sprint.speed + frequency * dw.sprint.frequency + explosiveness * dw.sprint.explosiveness);
  const mile = clamp(speed * dw.mile.speed + stride * dw.mile.stride + efficiency * dw.mile.efficiency);
  const classic = clamp(stride * dw.classic.stride + balance * dw.classic.balance + staminaPed * dw.classic.stamina_pedigree);
  const stayer = clamp(energyEconomy * dw.stayer.energy_economy + (input.heart_capacity_proxy ?? 50) * dw.stayer.heart_proxy + pedigree * dw.stayer.pedigree);

  const max = Math.max(sprint, mile, classic, stayer);
  let recommended = "1400–1800m (mile)";
  if (max === sprint) recommended = "1000–1400m (sprint)";
  else if (max === mile) recommended = "1400–1800m (mile)";
  else if (max === classic) recommended = "1800–2200m (classic)";
  else if (max === stayer) recommended = "2200m+ (stayer)";

  return { sprint, mile, classic, stayer, recommended };
}

// ─── 13 Longevity Risk Score ──────────────────────────────────
export function computeLongevityScore(input: {
  asymmetryRisk: number;
  conformationIssues: number;
  hoofRisk: number;
  movementIrregularity: number;
}): LongevityScore {
  const total_risk = clamp(
    input.asymmetryRisk * LONGEVITY_RISK_WEIGHTS.asymmetry +
    input.conformationIssues * LONGEVITY_RISK_WEIGHTS.conformation +
    input.hoofRisk * LONGEVITY_RISK_WEIGHTS.hoof +
    input.movementIrregularity * LONGEVITY_RISK_WEIGHTS.movement,
  );
  return {
    score: clamp(100 - total_risk),
    risk_components: {
      asymmetry: input.asymmetryRisk,
      conformation_issues: input.conformationIssues,
      hoof_risk: input.hoofRisk,
      movement_irregularity: input.movementIrregularity,
    },
    total_risk,
  };
}

export function longevityToSoundnessRisk(longevityScore: number): SoundnessRisk {
  if (longevityScore >= 75) return "Low";
  if (longevityScore >= 55) return "Medium";
  return "High";
}

// ─── 14 ROI Score ─────────────────────────────────────────────
export function computeRoiScore(input: {
  performancePotential: number;
  pedigreeValue: number;
  marketDemand: number;
  riskAdjustment: number;
}): RoiScore {
  const score = clamp(
    input.performancePotential * ROI_WEIGHTS.performance_potential +
    input.pedigreeValue * ROI_WEIGHTS.pedigree_value +
    input.marketDemand * ROI_WEIGHTS.market_demand +
    input.riskAdjustment * ROI_WEIGHTS.risk_adjustment,
  );
  return {
    score,
    components: {
      performance_potential: input.performancePotential,
      pedigree_value: input.pedigreeValue,
      market_demand: input.marketDemand,
      risk_adjustment: input.riskAdjustment,
    },
  };
}

// ─── Derive conformation from inspection blocks ─────────────────
export function conformationFromBlocks(
  blocks: Array<{ score_breakdown?: any; measurements_json?: any; block_score?: number | null }>,
): ConformationBreakdown {
  let balance = 50, leg = 50, shoulder = 50, hind = 50, bone = 50, n = 0;

  for (const b of blocks) {
    const sb = b.score_breakdown || {};
    const m = b.measurements_json || {};
    if (typeof sb.conformation === "number" || typeof b.block_score === "number") {
      const base = sb.conformation ?? b.block_score ?? 50;
      balance += base * 0.2; leg += base * 0.2; shoulder += base * 0.2;
      hind += base * 0.2; bone += base * 0.2; n++;
    }
    if (typeof m.leg_deviation_degrees === "number") {
      leg = computeLegAlignmentScore(m.leg_deviation_degrees);
    }
    if (typeof m.shoulder_angle === "number") {
      shoulder = clamp(100 - Math.abs(m.shoulder_angle - OPTIMAL_SHOULDER_ANGLE) * 3);
    }
  }

  if (n > 0) {
    balance = balance / (1 + n * 0.2);
    shoulder = shoulder / (1 + n * 0.2);
    hind = hind / (1 + n * 0.2);
    bone = bone / (1 + n * 0.2);
  }

  return computeConformationScore({
    balance: clamp(balance),
    leg_alignment: clamp(leg),
    shoulder: clamp(shoulder),
    hindquarter: clamp(hind),
    bone_structure: clamp(bone),
  });
}

// ─── Master build ─────────────────────────────────────────────
export function buildIntelligenceScores(input: {
  category: string;
  blocks: Array<{
    block_score?: number | null;
    score_breakdown?: any;
    measurements_json?: any;
    media_purpose?: string;
    attention_points?: string[] | null;
  }>;
  pedigreeResearch?: any;
  biomechanics?: BiomechanicsInput;
  behaviourScore?: number;
  behaviourBreakdown?: Omit<BehaviourBreakdown, "total">;
  hoofScore?: number;
  commercialBase?: number;
  marketDemand?: number;
}): IntelligenceScores {
  const bio = input.biomechanics || {};
  let bpi = bio.bpi ?? 0;
  if (!bio.bpi) {
    let gaitSum = 0, gaitN = 0;
    for (const b of input.blocks) {
      if (typeof b.score_breakdown?.gait === "number") { gaitSum += b.score_breakdown.gait; gaitN++; }
    }
    bpi = gaitN ? gaitSum / gaitN : 50;
  }

  const conformation_breakdown = conformationFromBlocks(input.blocks);
  const pedigree_breakdown = pedigreeBreakdownFromResearch(input.pedigreeResearch);

  const behaviour_breakdown = computeBehaviourScore(
    input.behaviourBreakdown ?? {
      calmness: input.behaviourScore ?? 55,
      focus: input.behaviourScore ?? 55,
      handling: input.behaviourScore ?? 55,
      stress_recovery: input.behaviourScore ?? 55,
    },
  );

  const hoof_health = input.hoofScore ?? (() => {
    let sum = 0, n = 0;
    for (const b of input.blocks) {
      if (typeof b.score_breakdown?.hoof === "number") { sum += b.score_breakdown.hoof; n++; }
    }
    return n ? sum / n : 50;
  })();

  const components: ComponentScores = {
    biomechanics: clamp(bio.bpi ?? bpi),
    pedigree: pedigree_breakdown.total,
    conformation: conformation_breakdown.total,
    behaviour: behaviour_breakdown.total,
    commercial: input.commercialBase ?? clamp(
      (conformation_breakdown.total + pedigree_breakdown.total + bpi) / 3,
    ),
  };

  const horse_intelligence_score = computeHorseIntelligenceScore(components);
  const g1_potential = computeG1Potential(components);

  const strideEff = bio.stride_efficiency ?? bpi;
  const distance_indices = computeDistanceIndices({
    speed: bio.spi_score ?? strideEff,
    frequency: bio.stride_efficiency ?? 50,
    explosiveness: bio.power_generation ?? 50,
    stride: bio.stride_efficiency ?? 50,
    efficiency: bio.energy_economy ?? 50,
    balance: conformation_breakdown.balance,
    stamina_pedigree: pedigree_breakdown.family_black_type,
    energy_economy: bio.energy_economy ?? 50,
    heart_capacity_proxy: clamp(100 - (bio.asymmetry_pct ?? 5) * 5),
    pedigree: pedigree_breakdown.total,
  });

  const asymmetryRisk = clamp(100 - (bio.motion_symmetry ?? 70));
  const conformationIssues = clamp(100 - conformation_breakdown.total);
  const hoofRisk = clamp(100 - hoof_health);
  const movementIrregularity = clamp(
    bio.movement_consistency != null
      ? clamp(100 - bio.movement_consistency)
      : clamp(100 - (bio.joint_efficiency ?? 60)),
  );

  const longevity = computeLongevityScore({
    asymmetryRisk,
    conformationIssues,
    hoofRisk,
    movementIrregularity,
  });

  const roi = computeRoiScore({
    performancePotential: horse_intelligence_score,
    pedigreeValue: pedigree_breakdown.total,
    marketDemand: input.marketDemand ?? components.commercial,
    riskAdjustment: longevity.score,
  });

  return {
    horse_intelligence_score,
    elite_potential: horse_intelligence_score,
    bpi,
    components,
    conformation_breakdown,
    pedigree_breakdown,
    behaviour_breakdown,
    g1_potential,
    distance_indices,
    distance_profile: distance_indices,
    longevity,
    roi,
    soundness_risk: longevityToSoundnessRisk(longevity.score),
    limb_symmetry: bio.motion_symmetry,
    joint_efficiency: bio.joint_efficiency,
    hoof_health,
    behaviour: behaviour_breakdown.total,
    pedigree_intelligence: pedigree_breakdown.total,
    energy_economy: bio.energy_economy,
    spi_score: bio.spi_score,
  };
}

// Legacy exports
export const computeElitePotential = computeHorseIntelligenceScore;
export function computeDistanceProfile(
  category: string,
  blocks: Array<{ media_purpose?: string; score_breakdown?: any }>,
  pedigreeResearch?: any,
): DistanceIndices {
  const pb = pedigreeBreakdownFromResearch(pedigreeResearch);
  let freq = 50, stride = 50;
  for (const b of blocks) {
    if (typeof b.score_breakdown?.gait === "number") {
      freq = b.score_breakdown.gait;
      stride = b.score_breakdown.gait;
    }
  }
  return computeDistanceIndices({
    frequency: freq,
    stride,
    stamina_pedigree: pb.family_black_type,
    pedigree: pb.total,
  });
}

export function computeSoundnessRisk(
  limbSymmetry: number,
  conformationScore: number,
  hoofScore: number,
  attentionPoints: string[],
): SoundnessRisk {
  const longevity = computeLongevityScore({
    asymmetryRisk: clamp(100 - limbSymmetry),
    conformationIssues: clamp(100 - conformationScore),
    hoofRisk: clamp(100 - hoofScore),
    movementIrregularity: 30,
  });
  let risk = longevity.total_risk;
  const corpus = attentionPoints.join(" ").toLowerCase();
  if (/lameness|fracture|surgery|OCD/.test(corpus)) risk += 15;
  return longevityToSoundnessRisk(clamp(100 - risk));
}
