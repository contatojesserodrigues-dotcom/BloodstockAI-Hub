/**
 * Frontend mirror of inspection-ai module structure.
 * Core scoring runs server-side via inspection-engine edge function.
 *
 * /inspection-ai
 *   /modules
 *     /video_analysis   → extractVideoFrames.ts, inspectionUpload.ts
 *     /pose_detection   → VideoPoseViewer, poseAngles.ts, video-pose-frames
 *     /biomechanics     → inspection-engine (server)
 *     /conformation     → inspection-analysis (Claude Vision)
 *     /hoof_analysis    → inspection-analysis HOOF_DETAIL purpose
 *     /behaviour        → Phase 2 (video tension indicators)
 *     /pedigree_engine  → inspection-pedigree-insight, inspection-pedigree-research
 *     /scoring_engine   → inspection-engine (server)
 *     /report_engine    → visualAnalysisPdfReport.ts + inspection_reports table
 */

export type { IntelligenceDashboardData } from "@/components/dashboard/inspection/EquineIntelligenceDashboard";
