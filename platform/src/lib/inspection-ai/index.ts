/**
 * Inspection AI client — frontend consumes API JSON only.
 * NO scientific formulas in TypeScript.
 *
 * Flow:
 *   inspection-analysis     → vision block analysis (raw scores from Claude Vision)
 *   video-pose-frames       → pose keypoints
 *   inspection-engine       → feature extraction (raw biomechanical metrics)
 *   inspection-scoring      → Python Scientific Scoring Engine (SSOT)
 */

export type { InspectionScoringResult } from "@/lib/inspectionUpload";
export {
  runInspectionScoring,
  runFeatureExtraction,
  uploadInspectionVideo,
} from "@/lib/inspectionUpload";

export type { IntelligenceDashboardData } from "@/components/dashboard/inspection/EquineIntelligenceDashboard";
