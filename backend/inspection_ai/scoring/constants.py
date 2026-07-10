"""Benchmarks, weights, and tier thresholds for the Scientific Scoring Engine."""

from __future__ import annotations

# ── Normalization references ───────────────────────────────────────────────
ELITE_STRIDE_LENGTH_M: float = 7.5
TARGET_STRIDE_FREQUENCY: float = 2.2
ELITE_SPI: float = ELITE_STRIDE_LENGTH_M * TARGET_STRIDE_FREQUENCY
OPTIMAL_HOCK_EXTENSION_DEG: float = 155.0
OPTIMAL_SHOULDER_ANGLE_DEG: float = 48.0
IDEAL_LEG_DEVIATION_DEG: float = 0.0
MAX_LEG_DEVIATION_PENALTY: float = 10.0  # per degree

# ── Horse Intelligence / Final score weights ─────────────────────────────────
FINAL_SCORE_WEIGHTS: dict[str, float] = {
    "biomechanics": 0.35,
    "pedigree": 0.25,
    "conformation": 0.20,
    "behaviour": 0.10,
    "commercial": 0.10,
}

# ── BPI weights ──────────────────────────────────────────────────────────────
BPI_WEIGHTS: dict[str, float] = {
    "stride_efficiency": 0.30,
    "motion_symmetry": 0.20,
    "joint_efficiency": 0.20,
    "power_generation": 0.15,
    "energy_economy": 0.15,
}

# ── Stride efficiency ────────────────────────────────────────────────────────
STRIDE_EFFICIENCY_LENGTH_WEIGHT: float = 0.60
STRIDE_EFFICIENCY_FREQUENCY_WEIGHT: float = 0.40

# ── Symmetry ─────────────────────────────────────────────────────────────────
SYMMETRY_PENALTY_MULTIPLIER: float = 5.0

# ── Joint efficiency ─────────────────────────────────────────────────────────
JOINT_WEIGHTS: dict[str, float] = {
    "shoulder": 0.30,
    "hip": 0.25,
    "hock": 0.25,
    "fetlock": 0.20,
}

# ── Conformation ─────────────────────────────────────────────────────────────
CONFORMATION_WEIGHTS: dict[str, float] = {
    "balance": 0.25,
    "leg_alignment": 0.20,
    "shoulder": 0.15,
    "hindquarter": 0.20,
    "bone_structure": 0.20,
}

# ── Pedigree ─────────────────────────────────────────────────────────────────
PEDIGREE_WEIGHTS: dict[str, float] = {
    "sire_influence": 0.30,
    "dam_influence": 0.30,
    "family_black_type": 0.20,
    "nick_compatibility": 0.20,
}

# ── Behaviour ────────────────────────────────────────────────────────────────
BEHAVIOUR_WEIGHTS: dict[str, float] = {
    "calmness": 0.30,
    "focus": 0.25,
    "handling": 0.20,
    "stress_recovery": 0.25,
}

# ── Hoof ─────────────────────────────────────────────────────────────────────
HOOF_WEIGHTS: dict[str, float] = {
    "hoof_balance": 0.25,
    "hoof_angle": 0.25,
    "symmetry": 0.25,
    "wall_quality": 0.25,
}

# ── Longevity risk ───────────────────────────────────────────────────────────
LONGEVITY_RISK_WEIGHTS: dict[str, float] = {
    "asymmetry": 0.30,
    "conformation": 0.30,
    "hoof": 0.20,
    "movement": 0.20,
}

# ── ROI ──────────────────────────────────────────────────────────────────────
ROI_WEIGHTS: dict[str, float] = {
    "performance_potential": 0.40,
    "pedigree_value": 0.25,
    "market_demand": 0.20,
    "risk_adjustment": 0.15,
}

# ── G1 / Elite tiers ─────────────────────────────────────────────────────────
G1_TIERS: list[tuple[float, str]] = [
    (90.0, "Elite / G1 Potential"),
    (80.0, "Group Potential"),
    (70.0, "Black Type Potential"),
    (60.0, "Commercial / Racing Prospect"),
    (0.0, "High Uncertainty"),
]

# ── Confidence ───────────────────────────────────────────────────────────────
MIN_CONFIDENCE: float = 0.35
MAX_CONFIDENCE: float = 0.98
DEFAULT_FIELD_CONFIDENCE: float = 0.55
