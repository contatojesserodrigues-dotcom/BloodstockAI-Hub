// Biomechanical analysis — BPI, stride, symmetry, joints, energy economy
// Formulas per BloodstockAI Equine Intelligence specification

import type { PoseFrameInput } from "./types.ts";
import {
  ELITE_NORMALIZED_STRIDE,
  ELITE_SPI,
  ELITE_STRIDE_LENGTH_M,
  ENERGY_ECONOMY_MULTIPLIER,
  JOINT_ROM_FETLOCK_DEG,
  JOINT_ROM_HIP_DEG,
  JOINT_ROM_SHOULDER_DEG,
  JOINT_WEIGHTS,
  OPTIMAL_HOCK_EXTENSION,
  STRIDE_EFFICIENCY_FREQUENCY_WEIGHT,
  STRIDE_EFFICIENCY_LENGTH_WEIGHT,
  SYMMETRY_PENALTY_MULTIPLIER,
  TARGET_STRIDE_FREQUENCY,
  BPI_WEIGHTS,
} from "./constants.ts";

type Pt = { x: number; y: number };

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

function dist(a?: Pt, b?: Pt): number | null {
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

function range(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.max(...nums) - Math.min(...nums);
}

export type StrideAnalysis = {
  stride_length_m: number;
  stride_length_score: number;
  stride_frequency: number;
  frequency_score: number;
  stride_efficiency: number;
  stride_count: number;
  duration_sec: number;
};

export type BiomechanicalResult = {
  bpi: number;
  stride_analysis: StrideAnalysis;
  stride_power_index: number;
  spi_score: number;
  motion_symmetry_score: number;
  asymmetry_pct: number;
  joint_efficiency_score: number;
  joint_breakdown: {
    shoulder: number;
    hip: number;
    hock: number;
    fetlock: number;
  };
  energy_economy_index: number;
  power_generation_score: number;
  /** Legacy fields for DB compatibility */
  stride_length_estimate: number;
  stride_frequency: number;
  stride_consistency: number;
  stride_efficiency: number;
  limb_symmetry_score: number;
  suspension_phase: string;
  metrics_json: Record<string, unknown>;
};

export type BiomechanicsOptions = {
  fps?: number;
  /** Real-world distance covered (metres) — enables precise stride length */
  distanceMeters?: number;
  /** Manual stride count override */
  strideCount?: number;
  bodyMassFactor?: number;
};

export function computeStrideLengthScore(currentLengthM: number): number {
  return clamp((currentLengthM / ELITE_STRIDE_LENGTH_M) * 100);
}

export function computeFrequencyScore(frequency: number): number {
  return clamp((frequency / TARGET_STRIDE_FREQUENCY) * 100);
}

export function computeStrideEfficiency(lengthScore: number, frequencyScore: number): number {
  return clamp(
    lengthScore * STRIDE_EFFICIENCY_LENGTH_WEIGHT +
    frequencyScore * STRIDE_EFFICIENCY_FREQUENCY_WEIGHT,
  );
}

export function computeMotionSymmetry(leftStride: number, rightStride: number): {
  asymmetry_pct: number;
  symmetry_score: number;
} {
  const average = (leftStride + rightStride) / 2 || 1;
  const asymmetry_pct = clamp((Math.abs(leftStride - rightStride) / average) * 100, 0, 100);
  const symmetry_score = clamp(100 - asymmetry_pct * SYMMETRY_PENALTY_MULTIPLIER);
  return { asymmetry_pct, symmetry_score };
}

export function computeJointScore(breakdown: {
  shoulder: number;
  hip: number;
  hock: number;
  fetlock: number;
}): number {
  return clamp(
    breakdown.shoulder * JOINT_WEIGHTS.shoulder +
    breakdown.hip * JOINT_WEIGHTS.hip +
    breakdown.hock * JOINT_WEIGHTS.hock +
    breakdown.fetlock * JOINT_WEIGHTS.fetlock,
  );
}

export function computeBPI(input: {
  strideEfficiency: number;
  motionSymmetry: number;
  jointEfficiency: number;
  powerGeneration: number;
  energyEconomy: number;
}): number {
  return clamp(
    input.strideEfficiency * BPI_WEIGHTS.strideEfficiency +
    input.motionSymmetry * BPI_WEIGHTS.motionSymmetry +
    input.jointEfficiency * BPI_WEIGHTS.jointEfficiency +
    input.powerGeneration * BPI_WEIGHTS.powerGeneration +
    input.energyEconomy * BPI_WEIGHTS.energyEconomy,
  );
}

export type BiomechanicsMetricsInput = {
  stride_length_m?: number;
  stride_count?: number;
  duration_sec?: number;
  distance_m?: number;
  stride_frequency?: number;
  left_stride_m?: number;
  right_stride_m?: number;
  ground_contact_time_ms?: number;
  suspension_phase_pct?: number;
  shoulder_rom_deg?: number;
  hip_rom_deg?: number;
  hock_extension_deg?: number;
  fetlock_rom_deg?: number;
  movement_variability?: number;
  velocity_proxy?: number;
  balance_score_raw?: number;
  movement_consistency_cv?: number;
};

/** Score biomechanics from structured metrics (parity with Python engine). */
export function scoreBiomechanicsFromMetrics(
  input: BiomechanicsMetricsInput,
  bodyMassFactor = 1.0,
): {
  bpi: number;
  components: Record<string, number>;
  asymmetry_pct: number;
  movement_consistency: number;
} {
  let length_m = input.stride_length_m ?? 0;
  if (!length_m && input.distance_m && input.stride_count) {
    length_m = input.stride_count > 0 ? input.distance_m / input.stride_count : 0;
  }
  const length_score = length_m > 0 ? computeStrideLengthScore(length_m) : 50;

  let freq = input.stride_frequency ?? 0;
  if (!freq && input.stride_count && input.duration_sec) {
    freq = input.duration_sec > 0 ? input.stride_count / input.duration_sec : 0;
  }
  const frequency_score = freq > 0 ? computeFrequencyScore(freq) : 50;

  const stride_efficiency = computeStrideEfficiency(length_score, frequency_score);

  let asymmetry_pct = 0;
  let motion_symmetry = 50;
  if (input.left_stride_m && input.right_stride_m) {
    const sym = computeMotionSymmetry(input.left_stride_m, input.right_stride_m);
    asymmetry_pct = sym.asymmetry_pct;
    motion_symmetry = sym.symmetry_score;
  }

  const shoulderScore = input.shoulder_rom_deg
    ? clamp((input.shoulder_rom_deg / JOINT_ROM_SHOULDER_DEG) * 100)
    : 55;
  const hipScore = input.hip_rom_deg
    ? clamp((input.hip_rom_deg / JOINT_ROM_HIP_DEG) * 100)
    : 55;
  const hockScore = input.hock_extension_deg
    ? clamp((input.hock_extension_deg / OPTIMAL_HOCK_EXTENSION) * 100)
    : 55;
  const fetlockScore = input.fetlock_rom_deg
    ? clamp((input.fetlock_rom_deg / JOINT_ROM_FETLOCK_DEG) * 100)
    : 55;

  const joint_efficiency = computeJointScore({
    shoulder: shoulderScore,
    hip: hipScore,
    hock: hockScore,
    fetlock: fetlockScore,
  });

  const spi = length_m * freq * bodyMassFactor;
  const power_score = spi > 0 ? clamp((spi / ELITE_SPI) * 100) : 50;

  const velocity = input.velocity_proxy ?? (length_m * freq || 1);
  const variability = input.movement_variability ?? 0.1;
  const energy_economy = variability > 0
    ? clamp((velocity / variability) * ENERGY_ECONOMY_MULTIPLIER)
    : clamp(velocity * 15);

  const movement_consistency = input.movement_consistency_cv != null
    ? clamp(100 - input.movement_consistency_cv * 100)
    : 55;

  const bpi = computeBPI({
    strideEfficiency: stride_efficiency,
    motionSymmetry: motion_symmetry,
    jointEfficiency: joint_efficiency,
    powerGeneration: power_score,
    energyEconomy: energy_economy,
  });

  return {
    bpi,
    asymmetry_pct,
    movement_consistency,
    components: {
      stride_length_score: length_score,
      frequency_score,
      stride_efficiency,
      motion_symmetry,
      joint_efficiency,
      power_score,
      energy_economy,
      movement_consistency,
      balance_score: clamp(input.balance_score_raw ?? 55),
      bpi,
      shoulder: shoulderScore,
      hip: hipScore,
      hock: hockScore,
      fetlock: fetlockScore,
    },
  };
}

export function analyzeBiomechanics(
  frames: PoseFrameInput[],
  options: BiomechanicsOptions = {},
): BiomechanicalResult {
  const fps = options.fps ?? 6;
  const bodyMassFactor = options.bodyMassFactor ?? 1.0;
  const visible = frames.filter((f) => f.keypoints && (f.confidence ?? 0) > 0.2);

  const foreStrides: number[] = [];
  const hindStrides: number[] = [];
  const allStrides: number[] = [];
  const angleSets: Record<string, number[]> = {};

  for (let i = 1; i < visible.length; i++) {
    const prev = visible[i - 1].keypoints!;
    const cur = visible[i].keypoints!;
    const fore = dist(prev.foreHoof as Pt, cur.foreHoof as Pt);
    const hind = dist(prev.hindHoof as Pt, cur.hindHoof as Pt);
    if (fore != null && fore > 0.001) { foreStrides.push(fore); allStrides.push(fore); }
    if (hind != null && hind > 0.001) { hindStrides.push(hind); allStrides.push(hind); }
  }

  for (const f of visible) {
    if (f.angles) {
      for (const [k, v] of Object.entries(f.angles)) {
        if (typeof v === "number") {
          if (!angleSets[k]) angleSets[k] = [];
          angleSets[k].push(v);
        }
      }
    }
  }

  const durationSec = visible.length > 1
    ? Math.max(0.1, (visible[visible.length - 1].timestampMs - visible[0].timestampMs) / 1000)
    : Math.max(0.1, visible.length / fps);

  const strideCount = options.strideCount ?? Math.max(1, Math.floor(allStrides.length / 2) || allStrides.length);

  // 2.1 Stride Length
  const avgNormalizedStride = avg(allStrides) || ELITE_NORMALIZED_STRIDE * 0.8;
  let stride_length_m: number;
  if (options.distanceMeters && strideCount > 0) {
    stride_length_m = options.distanceMeters / strideCount;
  } else {
    // Scale normalized coords to approximate metres (calibration factor)
    stride_length_m = avgNormalizedStride * (ELITE_STRIDE_LENGTH_M / ELITE_NORMALIZED_STRIDE);
  }
  const stride_length_score = computeStrideLengthScore(stride_length_m);

  // 2.2 Stride Frequency
  const stride_frequency = strideCount / durationSec;
  const frequency_score = computeFrequencyScore(stride_frequency);

  // 2.3 Stride Efficiency
  const stride_efficiency = computeStrideEfficiency(stride_length_score, frequency_score);

  // 3 Stride Power Index
  const spi = stride_length_m * stride_frequency * bodyMassFactor;
  const spi_score = clamp((spi / ELITE_SPI) * 100);
  const power_generation_score = spi_score;

  // 4 Motion Symmetry — left (fore) vs right (hind) stride proxy
  const leftAvg = avg(foreStrides) || avgNormalizedStride;
  const rightAvg = avg(hindStrides) || avgNormalizedStride;
  const { asymmetry_pct, symmetry_score: motion_symmetry_score } = computeMotionSymmetry(leftAvg, rightAvg);

  // 5 Joint Efficiency
  const shoulderAngles = angleSets.shoulder || [];
  const hipAngles = angleSets.hip || [];
  const hockAngles = angleSets.hock || [];
  const fetlockAngles = [
    ...(angleSets.fetlockFront || []),
    ...(angleSets.fetlockHind || []),
  ];

  const shoulderRom = range(shoulderAngles);
  const shoulderScore = shoulderRom > 0
    ? clamp((shoulderRom / JOINT_ROM_SHOULDER_DEG) * 100)
    : 55;

  const hipRom = range(hipAngles);
  const hipScore = hipRom > 0 ? clamp((hipRom / JOINT_ROM_HIP_DEG) * 100) : 55;

  const maxHock = hockAngles.length ? Math.max(...hockAngles) : OPTIMAL_HOCK_EXTENSION * 0.85;
  const hockScore = clamp((maxHock / OPTIMAL_HOCK_EXTENSION) * 100);

  const fetlockRom = range(fetlockAngles);
  const fetlockScore = fetlockRom > 0 ? clamp((fetlockRom / JOINT_ROM_FETLOCK_DEG) * 100) : 55;

  const joint_breakdown = {
    shoulder: shoulderScore,
    hip: hipScore,
    hock: hockScore,
    fetlock: fetlockScore,
  };
  const joint_efficiency_score = computeJointScore(joint_breakdown);

  // 6 Energy Economy — velocity / movement variability
  const velocityProxy = stride_length_m * stride_frequency;
  const movementVariability = stdDev(allStrides) + avg(Object.values(angleSets).map((a) => stdDev(a)));
  const energy_economy_index = movementVariability > 0
    ? clamp((velocityProxy / movementVariability) * ENERGY_ECONOMY_MULTIPLIER)
    : clamp(velocityProxy * 15);

  // 1 BPI
  const bpi = computeBPI({
    strideEfficiency: stride_efficiency,
    motionSymmetry: motion_symmetry_score,
    jointEfficiency: joint_efficiency_score,
    powerGeneration: power_generation_score,
    energyEconomy: energy_economy_index,
  });

  const strideStd = stdDev(allStrides);
  const stride_consistency = allStrides.length
    ? clamp(100 - strideStd * 400)
    : 50;

  const phases = visible.map((f) => f.stridePhase).filter(Boolean);
  const suspension_phase = phases.length
    ? phases.sort((a, b) => phases.filter((p) => p === b).length - phases.filter((p) => p === a).length)[0]!
    : "Support";

  return {
    bpi,
    stride_analysis: {
      stride_length_m: Math.round(stride_length_m * 100) / 100,
      stride_length_score,
      stride_frequency: Math.round(stride_frequency * 100) / 100,
      frequency_score,
      stride_efficiency,
      stride_count: strideCount,
      duration_sec: Math.round(durationSec * 100) / 100,
    },
    stride_power_index: Math.round(spi * 100) / 100,
    spi_score,
    motion_symmetry_score,
    asymmetry_pct,
    joint_efficiency_score,
    joint_breakdown,
    energy_economy_index,
    power_generation_score,
    stride_length_estimate: Math.round(avgNormalizedStride * 1000) / 1000,
    stride_frequency: Math.round(stride_frequency * 10) / 10,
    stride_consistency,
    stride_efficiency,
    limb_symmetry_score: motion_symmetry_score,
    suspension_phase,
    metrics_json: {
      frame_count: frames.length,
      visible_frames: visible.length,
      fps,
      bpi_formula: BPI_WEIGHTS,
      stride_length_formula: "distanceMeters / strideCount",
      frequency_formula: "strideCount / durationSec",
      symmetry_formula: "100 - (asymmetry% × 5)",
      energy_economy_formula: "velocity / movementVariability",
      engine: "equine_intelligence_v2",
    },
  };
}
