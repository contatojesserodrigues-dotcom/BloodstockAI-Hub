// BloodstockAI scoring benchmarks — single source aligned with Python engine
// Canonical file: shared/scoring_constants.json (keep copies in sync)

import shared from "./scoring_constants.json" with { type: "json" };

export const SCORING_CONSTANTS_VERSION = shared.version as string;

export const ELITE_STRIDE_LENGTH_M = shared.elite_stride_length_m as number;
export const TARGET_STRIDE_FREQUENCY = shared.target_stride_frequency as number;
export const ELITE_SPI = shared.elite_spi as number;
export const OPTIMAL_HOCK_EXTENSION = shared.optimal_hock_extension_deg as number;
export const OPTIMAL_SHOULDER_ANGLE = shared.optimal_shoulder_angle_deg as number;
export const ELITE_NORMALIZED_STRIDE = shared.elite_normalized_stride as number;
export const SYMMETRY_PENALTY_MULTIPLIER = shared.symmetry_penalty_multiplier as number;
export const MAX_LEG_DEVIATION_PENALTY = shared.max_leg_deviation_penalty as number;
export const STRIDE_EFFICIENCY_LENGTH_WEIGHT = shared.stride_efficiency_length_weight as number;
export const STRIDE_EFFICIENCY_FREQUENCY_WEIGHT = shared.stride_efficiency_frequency_weight as number;
export const JOINT_ROM_SHOULDER_DEG = shared.joint_rom_shoulder_deg as number;
export const JOINT_ROM_HIP_DEG = shared.joint_rom_hip_deg as number;
export const JOINT_ROM_FETLOCK_DEG = shared.joint_rom_fetlock_deg as number;
export const ENERGY_ECONOMY_MULTIPLIER = shared.energy_economy_multiplier as number;

export const G1_TIERS = shared.g1_tiers as ReadonlyArray<{ min: number; label: string }>;

export const HORSE_INTELLIGENCE_WEIGHTS = shared.final_score_weights as {
  readonly biomechanics: number;
  readonly pedigree: number;
  readonly conformation: number;
  readonly behaviour: number;
  readonly commercial: number;
};

export const BPI_WEIGHTS = {
  strideEfficiency: shared.bpi_weights.stride_efficiency as number,
  motionSymmetry: shared.bpi_weights.motion_symmetry as number,
  jointEfficiency: shared.bpi_weights.joint_efficiency as number,
  powerGeneration: shared.bpi_weights.power_generation as number,
  energyEconomy: shared.bpi_weights.energy_economy as number,
} as const;

export const JOINT_WEIGHTS = shared.joint_weights as {
  readonly shoulder: number;
  readonly hip: number;
  readonly hock: number;
  readonly fetlock: number;
};

export const CONFORMATION_WEIGHTS = shared.conformation_weights as {
  readonly balance: number;
  readonly leg_alignment: number;
  readonly shoulder: number;
  readonly hindquarter: number;
  readonly bone_structure: number;
};

export const PEDIGREE_WEIGHTS = shared.pedigree_weights as {
  readonly sire_influence: number;
  readonly dam_influence: number;
  readonly family_black_type: number;
  readonly nick_compatibility: number;
};

export const BEHAVIOUR_WEIGHTS = shared.behaviour_weights as {
  readonly calmness: number;
  readonly focus: number;
  readonly handling: number;
  readonly stress_recovery: number;
};

export const HOOF_WEIGHTS = shared.hoof_weights as {
  readonly hoof_balance: number;
  readonly hoof_angle: number;
  readonly symmetry: number;
  readonly wall_quality: number;
};

export const LONGEVITY_RISK_WEIGHTS = shared.longevity_risk_weights as {
  readonly asymmetry: number;
  readonly conformation: number;
  readonly hoof: number;
  readonly movement: number;
};

export const ROI_WEIGHTS = shared.roi_weights as {
  readonly performance_potential: number;
  readonly pedigree_value: number;
  readonly market_demand: number;
  readonly risk_adjustment: number;
};

export const DISTANCE_WEIGHTS = shared.distance_weights as {
  readonly sprint: { speed: number; frequency: number; explosiveness: number };
  readonly mile: { speed: number; stride: number; efficiency: number };
  readonly classic: { stride: number; balance: number; stamina_pedigree: number };
  readonly stayer: { energy_economy: number; heart_proxy: number; pedigree: number };
};

export const CONFIDENCE_LIMITS = shared.confidence as {
  readonly min: number;
  readonly max: number;
  readonly default_field: number;
};

// Legacy alias
export const OPTIMAL_HOCK_EXTENSION_DEG = OPTIMAL_HOCK_EXTENSION;
