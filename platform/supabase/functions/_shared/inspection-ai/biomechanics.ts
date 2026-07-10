// Biomechanical analysis — BPI, stride, symmetry, joints, energy economy
// Formulas per BloodstockAI Equine Intelligence specification

import type { PoseFrameInput } from "./types.ts";
import {
  ELITE_NORMALIZED_STRIDE,
  ELITE_SPI,
  ELITE_STRIDE_LENGTH_M,
  OPTIMAL_HOCK_EXTENSION,
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
  return clamp(lengthScore * 0.6 + frequencyScore * 0.4);
}

export function computeMotionSymmetry(leftStride: number, rightStride: number): {
  asymmetry_pct: number;
  symmetry_score: number;
} {
  const average = (leftStride + rightStride) / 2 || 1;
  const asymmetry_pct = clamp((Math.abs(leftStride - rightStride) / average) * 100, 0, 100);
  const symmetry_score = clamp(100 - asymmetry_pct * 5);
  return { asymmetry_pct, symmetry_score };
}

export function computeJointScore(breakdown: {
  shoulder: number;
  hip: number;
  hock: number;
  fetlock: number;
}): number {
  return clamp(
    breakdown.shoulder * 0.30 +
    breakdown.hip * 0.25 +
    breakdown.hock * 0.25 +
    breakdown.fetlock * 0.20,
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
    ? clamp((shoulderRom / 35) * 100) // ~35° ROM = excellent
    : 55;

  const hipRom = range(hipAngles);
  const hipScore = hipRom > 0 ? clamp((hipRom / 40) * 100) : 55;

  const maxHock = hockAngles.length ? Math.max(...hockAngles) : OPTIMAL_HOCK_EXTENSION * 0.85;
  const hockScore = clamp((maxHock / OPTIMAL_HOCK_EXTENSION) * 100);

  const fetlockRom = range(fetlockAngles);
  const fetlockScore = fetlockRom > 0 ? clamp((fetlockRom / 45) * 100) : 55;

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
    ? clamp((velocityProxy / movementVariability) * 8)
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
