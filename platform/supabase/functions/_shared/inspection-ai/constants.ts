// BloodstockAI biomechanical & scoring benchmarks (normalization references)

/** Elite thoroughbred stride length reference (metres) — flat racing */
export const ELITE_STRIDE_LENGTH_M = 7.5;

/** Target stride frequency (strides/sec) — mile/sprint athlete */
export const TARGET_STRIDE_FREQUENCY = 2.2;

/** Elite SPI reference (length × frequency × mass factor) */
export const ELITE_SPI = ELITE_STRIDE_LENGTH_M * TARGET_STRIDE_FREQUENCY * 1.0;

/** Optimal hock extension angle (degrees) */
export const OPTIMAL_HOCK_EXTENSION = 155;

/** Optimal shoulder angle at stance (degrees) */
export const OPTIMAL_SHOULDER_ANGLE = 48;

/** Normalized image-space stride length reference (when metres unavailable) */
export const ELITE_NORMALIZED_STRIDE = 0.12;

/** G1 / Horse Intelligence tier labels */
export const G1_TIERS = [
  { min: 90, label: "Elite / G1 Potential" },
  { min: 80, label: "Group Potential" },
  { min: 70, label: "Black Type Potential" },
  { min: 60, label: "Commercial / Racing Prospect" },
  { min: 0, label: "High Uncertainty" },
] as const;

export const HORSE_INTELLIGENCE_WEIGHTS = {
  biomechanics: 0.35,
  pedigree: 0.25,
  conformation: 0.20,
  behaviour: 0.10,
  commercial: 0.10,
} as const;

export const BPI_WEIGHTS = {
  strideEfficiency: 0.30,
  motionSymmetry: 0.20,
  jointEfficiency: 0.20,
  powerGeneration: 0.15,
  energyEconomy: 0.15,
} as const;
