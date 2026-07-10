"""Feature Extraction Engine — CV pipeline skeleton (future modules plug in here).

Pipeline target:
  Video → Frames → Horse Detection → Pose → 3D Skeleton → Joint Coordinates
       → Stride Detection → Ground Contact → Joint Angles → Biomechanical Features
       → Scientific Scoring Engine
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class FeatureExtractionResult:
    """Raw biomechanical features — inputs for ScientificScoringEngine only."""

    biomechanics: dict[str, Any] = field(default_factory=dict)
    conformation: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    stage_status: dict[str, str] = field(default_factory=dict)
    version: str = "0.1.0"


class FeatureExtractionEngine:
    """Orchestrates CV stages. Stubs until Computer Vision modules are connected."""

    VERSION = "0.1.0"

    def extract_from_pose_frames(
        self,
        frames: list[dict[str, Any]],
        fps: float = 6.0,
        distance_m: Optional[float] = None,
    ) -> FeatureExtractionResult:
        """Extract raw metrics from pose keypoints (no scoring formulas)."""
        result = FeatureExtractionResult(version=self.VERSION)
        result.stage_status = {
            "horse_detection": "pending",
            "pose_detection": "complete" if frames else "skipped",
            "skeleton_3d": "pending",
            "stride_detection": "pending",
            "ground_contact": "pending",
            "joint_angles": "partial" if frames else "skipped",
        }

        if not frames:
            return result

        # Delegate numeric extraction to existing biomechanics module when frames present.
        # This stage produces RAW metrics only — scoring happens in Python engine.
        result.metadata = {"frame_count": len(frames), "fps": fps}
        if distance_m is not None:
            result.biomechanics["distance_m"] = distance_m

        result.stage_status["biomechanical_features"] = "stub"
        return result
