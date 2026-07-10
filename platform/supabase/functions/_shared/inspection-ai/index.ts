// Equine Intelligence Inspection Engine™ — module index

export * from "./types.ts";
export * from "./constants.ts";
export * from "./scoring_engine.ts";
export * from "./biomechanics.ts";
export * from "./report_engine.ts";

export {
  analyzeBiomechanics,
  computeBPI,
  computeStrideEfficiency,
  computeMotionSymmetry,
  computeJointScore,
} from "./biomechanics.ts";

export {
  buildIntelligenceScores,
  computeHorseIntelligenceScore,
  computeG1Potential,
  computeConformationScore,
  computePedigreeScore,
  computeBehaviourScore,
  computeDistanceIndices,
  computeLongevityScore,
  computeRoiScore,
  computeLegAlignmentScore,
  g1TierLabel,
} from "./scoring_engine.ts";

export { buildReportPayload } from "./report_engine.ts";
export { buildScientificReport } from "./scientific_scoring.ts";
export { scoreBiomechanicsFromMetrics } from "./biomechanics.ts";
