"""Benchmarks, weights, and tier thresholds — loaded from shared JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_SHARED_PATH = Path(__file__).resolve().parents[3] / "shared" / "scoring_constants.json"


def _load_shared() -> dict[str, Any]:
    with _SHARED_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


_C = _load_shared()

# ── Normalization references ───────────────────────────────────────────────
ELITE_STRIDE_LENGTH_M: float = float(_C["elite_stride_length_m"])
TARGET_STRIDE_FREQUENCY: float = float(_C["target_stride_frequency"])
ELITE_SPI: float = float(_C["elite_spi"])
OPTIMAL_HOCK_EXTENSION_DEG: float = float(_C["optimal_hock_extension_deg"])
OPTIMAL_SHOULDER_ANGLE_DEG: float = float(_C["optimal_shoulder_angle_deg"])
IDEAL_LEG_DEVIATION_DEG: float = 0.0
MAX_LEG_DEVIATION_PENALTY: float = float(_C["max_leg_deviation_penalty"])
SYMMETRY_PENALTY_MULTIPLIER: float = float(_C["symmetry_penalty_multiplier"])
STRIDE_EFFICIENCY_LENGTH_WEIGHT: float = float(_C["stride_efficiency_length_weight"])
STRIDE_EFFICIENCY_FREQUENCY_WEIGHT: float = float(_C["stride_efficiency_frequency_weight"])
ENERGY_ECONOMY_MULTIPLIER: float = float(_C["energy_economy_multiplier"])

# ── Weights ────────────────────────────────────────────────────────────────
FINAL_SCORE_WEIGHTS: dict[str, float] = dict(_C["final_score_weights"])
BPI_WEIGHTS: dict[str, float] = dict(_C["bpi_weights"])
JOINT_WEIGHTS: dict[str, float] = dict(_C["joint_weights"])
CONFORMATION_WEIGHTS: dict[str, float] = dict(_C["conformation_weights"])
PEDIGREE_WEIGHTS: dict[str, float] = dict(_C["pedigree_weights"])
BEHAVIOUR_WEIGHTS: dict[str, float] = dict(_C["behaviour_weights"])
HOOF_WEIGHTS: dict[str, float] = dict(_C["hoof_weights"])
LONGEVITY_RISK_WEIGHTS: dict[str, float] = dict(_C["longevity_risk_weights"])
ROI_WEIGHTS: dict[str, float] = dict(_C["roi_weights"])

# ── G1 tiers ─────────────────────────────────────────────────────────────────
G1_TIERS: list[tuple[float, str]] = [
    (float(t["min"]), str(t["label"])) for t in _C["g1_tiers"]
]

# ── Confidence ───────────────────────────────────────────────────────────────
MIN_CONFIDENCE: float = float(_C["confidence"]["min"])
MAX_CONFIDENCE: float = float(_C["confidence"]["max"])
DEFAULT_FIELD_CONFIDENCE: float = float(_C["confidence"]["default_field"])

SHARED_CONSTANTS_VERSION: str = str(_C["version"])
