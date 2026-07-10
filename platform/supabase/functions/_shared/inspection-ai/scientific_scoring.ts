// DEPRECATED — Do not use for scoring. Python Scientific Scoring Engine is the SSOT.
// This file is retained temporarily for reference only. Frontend must call inspection-scoring API.
// BloodstockAI scoring — TypeScript adapter (DEPRECATED)

import { scoreBiomechanicsFromMetrics, type BiomechanicsMetricsInput } from "./biomechanics.ts";
import {
  BEHAVIOUR_WEIGHTS,
  CONFIDENCE_LIMITS,
  CONFORMATION_WEIGHTS,
  G1_TIERS,
  HOOF_WEIGHTS,
  HORSE_INTELLIGENCE_WEIGHTS,
  PEDIGREE_WEIGHTS,
} from "./constants.ts";
import {
  computeBehaviourScore,
  computeConformationScore,
  computeDistanceIndices,
  computeLegAlignmentScore,
  computeLongevityScore,
  computePedigreeScore,
  computeRoiScore,
  g1TierLabel,
  longevityToSoundnessRisk,
} from "./scoring_engine.ts";

export type ScientificScoringPayload = {
  horse?: {
    name?: string;
    category?: string;
    body_mass_kg?: number;
  };
  pedigree?: {
    sire_performance?: number;
    dam_performance?: number;
    damsire_influence?: number;
    black_type_score?: number;
    family_depth?: number;
    commercial_appeal?: number;
    nick_compatibility?: number;
    inbreeding_coefficient?: number;
    stamina_index?: number;
    speed_index?: number;
    pedigree_rating?: number;
  };
  biomechanics?: BiomechanicsMetricsInput;
  conformation?: {
    shoulder?: number;
    hip?: number;
    topline?: number;
    balance?: number;
    bone?: number;
    leg_alignment_deviation_deg?: number;
    front_limb?: number;
    rear_limb?: number;
    pastern?: number;
    overall_structure?: number;
  };
  behaviour?: {
    focus?: number;
    stress?: number;
    calmness?: number;
    handling?: number;
    recovery?: number;
    movement_behaviour?: number;
    environmental_reaction?: number;
  };
  hoof?: {
    hoof_balance?: number;
    hoof_angle?: number;
    symmetry?: number;
    wall_quality?: number;
    risk_indicators?: number;
  };
  commercial?: {
    market_demand?: number;
    commercial_profile?: number;
    purchase_price?: number;
    currency?: string;
  };
  metadata?: Record<string, unknown>;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

function scoreWithConfidence(score: number, confidence: number, components: Record<string, number> = {}) {
  return { score: clamp(score), confidence, components, notes: [] as string[] };
}

function aggregateConfidence(fields: Array<[number | undefined, number]>): number {
  let total = 0;
  let weight = 0;
  for (const [val, w] of fields) {
    if (val != null) {
      total += w;
      weight += w;
    }
  }
  const coverage = weight > 0 ? total / fields.reduce((s, [, w]) => s + w, 0) : 0;
  const raw = CONFIDENCE_LIMITS.default_field + coverage * (CONFIDENCE_LIMITS.max - CONFIDENCE_LIMITS.default_field);
  return Math.round(Math.max(CONFIDENCE_LIMITS.min, Math.min(CONFIDENCE_LIMITS.max, raw)) * 1000) / 1000;
}

function computeConformationFromInput(c: NonNullable<ScientificScoringPayload["conformation"]>) {
  const leg = c.leg_alignment_deviation_deg != null
    ? computeLegAlignmentScore(c.leg_alignment_deviation_deg)
    : (c.front_limb ?? 50);
  const balance = c.balance ?? c.overall_structure ?? 50;
  const shoulder = c.shoulder ?? 50;
  const hind = c.hip ?? c.rear_limb ?? 50;
  const bone = c.bone ?? 50;
  const breakdown = computeConformationScore({
    balance: clamp(balance),
    leg_alignment: clamp(leg),
    shoulder: clamp(shoulder),
    hindquarter: clamp(hind),
    bone_structure: clamp(bone),
  });
  return {
    score: breakdown.total,
    confidence: aggregateConfidence([
      [c.balance, 1],
      [c.leg_alignment_deviation_deg ?? c.front_limb, 0.9],
      [c.shoulder, 0.7],
      [c.hip ?? c.rear_limb, 0.7],
      [c.bone, 0.6],
    ]),
    components: {
      balance: breakdown.balance,
      leg_alignment: breakdown.leg_alignment,
      shoulder: breakdown.shoulder,
      hindquarter: breakdown.hindquarter,
      bone_structure: breakdown.bone_structure,
      topline: c.topline ?? 50,
      front_limb: c.front_limb ?? leg,
      rear_limb: c.rear_limb ?? hind,
      pastern: c.pastern ?? 50,
      overall_structure: c.overall_structure ?? breakdown.total,
    },
  };
}

function computePedigreeFromInput(p: NonNullable<ScientificScoringPayload["pedigree"]>) {
  const rating = p.pedigree_rating != null ? p.pedigree_rating * 10 : 50;
  const breakdown = computePedigreeScore({
    sire_performance: clamp(p.sire_performance ?? rating),
    dam_performance: clamp(p.dam_performance ?? rating),
    family_black_type: clamp(p.black_type_score ?? p.family_depth ?? rating * 0.9),
    cross_compatibility: clamp(p.nick_compatibility ?? rating * 0.85),
  });
  return {
    score: breakdown.total,
    confidence: aggregateConfidence([
      [p.sire_performance, 1],
      [p.dam_performance, 1],
      [p.black_type_score, 0.8],
      [p.nick_compatibility, 0.7],
    ]),
    components: {
      sire_influence: breakdown.sire_performance,
      dam_influence: breakdown.dam_performance,
      family_black_type: breakdown.family_black_type,
      nick_compatibility: breakdown.cross_compatibility,
      damsire_influence: p.damsire_influence ?? 50,
      stamina_index: p.stamina_index ?? breakdown.family_black_type,
      speed_index: p.speed_index ?? breakdown.sire_performance,
      commercial_appeal: p.commercial_appeal ?? 50,
      inbreeding_coefficient: p.inbreeding_coefficient ?? 0,
    },
  };
}

function computeBehaviourFromInput(b: NonNullable<ScientificScoringPayload["behaviour"]>) {
  const calm = b.calmness ?? 55;
  const focus = b.focus ?? 55;
  const handling = b.handling ?? 55;
  const recovery = b.recovery ?? (b.stress != null ? clamp(100 - b.stress) : 55);
  const breakdown = computeBehaviourScore({
    calmness: calm,
    focus,
    handling,
    stress_recovery: recovery,
  });
  return {
    score: breakdown.total,
    confidence: aggregateConfidence([
      [b.calmness, 1],
      [b.focus, 0.9],
      [b.handling, 0.8],
      [b.recovery ?? b.stress, 0.8],
    ]),
    components: {
      calmness: breakdown.calmness,
      focus: breakdown.focus,
      handling: breakdown.handling,
      stress_recovery: breakdown.stress_recovery,
      movement_behaviour: b.movement_behaviour ?? 50,
      environmental_reaction: b.environmental_reaction ?? 50,
    },
  };
}

function computeHoofFromInput(h: NonNullable<ScientificScoringPayload["hoof"]>) {
  const risk = h.risk_indicators ?? 0;
  const balance = h.hoof_balance ?? 50;
  const angle = h.hoof_angle ?? 50;
  const sym = h.symmetry ?? 50;
  const wall = h.wall_quality ?? 50;
  const score = clamp(
    balance * HOOF_WEIGHTS.hoof_balance +
    angle * HOOF_WEIGHTS.hoof_angle +
    sym * HOOF_WEIGHTS.symmetry +
    wall * HOOF_WEIGHTS.wall_quality -
    risk * 0.1,
  );
  return {
    score,
    confidence: aggregateConfidence([
      [h.hoof_balance, 1],
      [h.hoof_angle, 0.9],
      [h.symmetry, 0.8],
      [h.wall_quality, 0.8],
    ]),
    components: { hoof_balance: balance, hoof_angle: angle, symmetry: sym, wall_quality: wall, risk_indicators: risk },
  };
}

function buyingRecommendation(overall: number, roi: number, longevity: number): string {
  if (overall >= 85 && roi >= 75) return "High Commercial & Racing Potential";
  if (overall >= 75) return "Strong Racing Prospect — verify vet";
  if (overall >= 65) return "Commercial / Racing Prospect — price sensitive";
  if (longevity < 55) return "Caution — elevated longevity risk";
  return "High Uncertainty — insufficient data or below threshold";
}

function surfacePrediction(category: string | undefined, pedigree: ReturnType<typeof computePedigreeFromInput>, balance: number, confidence: number) {
  const stamina = pedigree.components.stamina_index ?? 50;
  const speed = pedigree.components.speed_index ?? 50;
  const isNh = Boolean(category && category.toUpperCase().includes("NH"));
  const turf = clamp(stamina * 0.5 + balance * 0.3 + speed * 0.2);
  const dirt = clamp(speed * 0.5 + balance * 0.25 + stamina * 0.25);
  const synthetic = clamp((turf + dirt) / 2);
  const national_hunt = isNh ? clamp(stamina * 0.6 + balance * 0.4) : clamp(stamina * 0.4 + 30);
  const swc = (score: number) => scoreWithConfidence(score, confidence);
  return { turf: swc(turf), dirt: swc(dirt), synthetic: swc(synthetic), national_hunt: swc(national_hunt) };
}

/** Build full scientific report JSON — mirrors Python ScientificScoringEngine.generate_final_report(). */
export function buildScientificReport(payload: ScientificScoringPayload): Record<string, unknown> {
  const horse = payload.horse ?? {};
  const massFactor = horse.body_mass_kg && horse.body_mass_kg > 0 ? horse.body_mass_kg / 500 : 1;

  const bioRaw = scoreBiomechanicsFromMetrics(payload.biomechanics ?? {}, massFactor);
  const bio = {
    score: bioRaw.bpi,
    confidence: aggregateConfidence([
      [payload.biomechanics?.stride_length_m ?? payload.biomechanics?.distance_m, 1],
      [payload.biomechanics?.stride_frequency ?? payload.biomechanics?.stride_count, 1],
      [payload.biomechanics?.left_stride_m, 0.8],
      [payload.biomechanics?.hock_extension_deg, 0.7],
    ]),
    components: bioRaw.components,
    notes: [] as string[],
  };

  const ped = computePedigreeFromInput(payload.pedigree ?? {});
  const conf = computeConformationFromInput(payload.conformation ?? {});
  const beh = computeBehaviourFromInput(payload.behaviour ?? {});
  const hoof = computeHoofFromInput(payload.hoof ?? {});

  const commercialInput = payload.commercial ?? {};
  const commercialScore = commercialInput.commercial_profile != null
    ? commercialInput.commercial_profile
    : commercialInput.market_demand != null
    ? commercialInput.market_demand
    : (conf.score + ped.score + bio.score) / 3;
  const commercial = scoreWithConfidence(
    commercialScore,
    aggregateConfidence([
      [commercialInput.commercial_profile, 1],
      [commercialInput.market_demand, 0.8],
    ]),
  );

  const overall = clamp(
    bio.score * HORSE_INTELLIGENCE_WEIGHTS.biomechanics +
    ped.score * HORSE_INTELLIGENCE_WEIGHTS.pedigree +
    conf.score * HORSE_INTELLIGENCE_WEIGHTS.conformation +
    beh.score * HORSE_INTELLIGENCE_WEIGHTS.behaviour +
    commercial.score * HORSE_INTELLIGENCE_WEIGHTS.commercial,
  );

  const globalConfidence = Math.round(
    (bio.confidence + ped.confidence + conf.confidence + beh.confidence + hoof.confidence) / 5 * 1000,
  ) / 1000;

  const g1Score = overall;
  const g1 = scoreWithConfidence(g1Score, globalConfidence);
  g1.notes = [g1TierLabel(g1Score)];

  const distanceRaw = computeDistanceIndices({
    speed: bioRaw.components.power_score ?? bio.score,
    frequency: bioRaw.components.frequency_score ?? 50,
    explosiveness: bioRaw.components.power_score ?? 50,
    stride: bioRaw.components.stride_efficiency ?? 50,
    efficiency: bioRaw.components.stride_efficiency ?? 50,
    balance: conf.components.balance ?? 50,
    stamina_pedigree: ped.components.stamina_index ?? 50,
    energy_economy: bioRaw.components.energy_economy ?? 50,
    heart_capacity_proxy: clamp(100 - bioRaw.asymmetry_pct * 5),
    pedigree: ped.score,
  });

  const distance_prediction = {
    sprint: scoreWithConfidence(distanceRaw.sprint, globalConfidence),
    mile: scoreWithConfidence(distanceRaw.mile, globalConfidence),
    classic: scoreWithConfidence(distanceRaw.classic, globalConfidence),
    stayer: scoreWithConfidence(distanceRaw.stayer, globalConfidence),
    recommended: distanceRaw.recommended,
  };

  const surface_prediction = surfacePrediction(horse.category, ped, conf.components.balance ?? 50, globalConfidence);

  const longevityRaw = computeLongevityScore({
    asymmetryRisk: clamp(100 - (bioRaw.components.motion_symmetry ?? 50)),
    conformationIssues: clamp(100 - conf.score),
    hoofRisk: clamp(100 - hoof.score),
    movementIrregularity: clamp(100 - bioRaw.movement_consistency),
  });

  const longevity = {
    score: scoreWithConfidence(longevityRaw.score, globalConfidence, {
      asymmetry_risk: longevityRaw.risk_components.asymmetry,
      conformation_risk: longevityRaw.risk_components.conformation_issues,
      hoof_risk: longevityRaw.risk_components.hoof_risk,
      movement_risk: longevityRaw.risk_components.movement_irregularity,
      total_risk: longevityRaw.total_risk,
    }),
    risk_level: longevityToSoundnessRisk(longevityRaw.score),
    risk_components: longevityRaw.risk_components,
  };

  const roiRaw = computeRoiScore({
    performancePotential: overall,
    pedigreeValue: ped.score,
    marketDemand: commercial.score,
    riskAdjustment: longevityRaw.score,
  });

  const roi = {
    score: scoreWithConfidence(roiRaw.score, globalConfidence, roiRaw.components),
    investment_grade: roiRaw.score >= 80 ? "Strong" : roiRaw.score >= 65 ? "Good" : roiRaw.score >= 50 ? "Moderate" : "Cautious",
    risk_level: longevityRaw.score >= 75 ? "Low" : longevityRaw.score >= 55 ? "Medium" : "High",
  };

  const recommendation = buyingRecommendation(overall, roiRaw.score, longevityRaw.score);

  return {
    overall_score: overall,
    elite_potential: g1Score,
    confidence: globalConfidence,
    biomechanics: bio,
    pedigree: ped,
    conformation: conf,
    behaviour: beh,
    hoof,
    commercial,
    bpi: scoreWithConfidence(bio.score, bio.confidence, bio.components),
    roi,
    longevity,
    distance_prediction,
    surface_prediction,
    g1_potential: g1,
    recommendation,
    risk_profile: longevity.risk_level,
    buying_recommendation: recommendation,
    engine: "scientific_scoring_ts",
    constants_version: G1_TIERS.length ? "shared" : "unknown",
    raw_breakdown: {
      stride: {
        stride_length_score: bioRaw.components.stride_length_score,
        frequency_score: bioRaw.components.frequency_score,
        stride_efficiency: bioRaw.components.stride_efficiency,
      },
      symmetry: { asymmetry_pct: bioRaw.asymmetry_pct, motion_symmetry: bioRaw.components.motion_symmetry },
      joints: {
        joint_efficiency: bioRaw.components.joint_efficiency,
        shoulder: bioRaw.components.shoulder,
        hip: bioRaw.components.hip,
        hock: bioRaw.components.hock,
        fetlock: bioRaw.components.fetlock,
      },
    },
  };
}
