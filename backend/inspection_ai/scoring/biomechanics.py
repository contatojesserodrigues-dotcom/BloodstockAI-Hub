"""Biomechanical scoring — BPI, stride, symmetry, joints, power."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from .confidence import aggregate_confidence, reduce_confidence_for_sparse_data
from .constants import (
    BPI_WEIGHTS,
    ELITE_SPI,
    ELITE_STRIDE_LENGTH_M,
    JOINT_WEIGHTS,
    OPTIMAL_HOCK_EXTENSION_DEG,
    STRIDE_EFFICIENCY_FREQUENCY_WEIGHT,
    STRIDE_EFFICIENCY_LENGTH_WEIGHT,
    TARGET_STRIDE_FREQUENCY,
)
from .models import BiomechanicsInput, ScoreWithConfidence
from .normalization import (
    clamp,
    normalize_distance,
    normalize_frequency,
    normalize_ratio,
    normalize_symmetry,
    normalize_variability_to_consistency,
    safe_div,
)


@dataclass
class BiomechanicsBreakdown:
    """Internal biomechanics calculation results."""

    stride_length_m: float = 0.0
    stride_length_score: float = 50.0
    stride_frequency: float = 0.0
    frequency_score: float = 50.0
    stride_efficiency: float = 50.0
    ground_contact_score: float = 50.0
    suspension_score: float = 50.0
    joint_efficiency: float = 50.0
    motion_symmetry: float = 50.0
    asymmetry_pct: float = 0.0
    power_index: float = 0.0
    power_score: float = 50.0
    movement_consistency: float = 50.0
    balance_score: float = 50.0
    energy_economy: float = 50.0
    bpi: float = 50.0
    joint_components: dict[str, float] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


def calculate_stride_length(data: BiomechanicsInput) -> tuple[float, float]:
    """Compute stride length (m) and normalized score.

    Formula:
        stride_length = distance_m / stride_count  OR direct stride_length_m
        score = (current / elite_7.5m) × 100

    Returns:
        (length_m, score_0_100)
    """
    length_m = data.stride_length_m
    if length_m is None and data.distance_m and data.stride_count:
        length_m = safe_div(data.distance_m, float(data.stride_count), 0.0)
    if length_m is None or length_m <= 0:
        return 0.0, 50.0
    return length_m, normalize_distance(length_m, ELITE_STRIDE_LENGTH_M)


def calculate_stride_frequency(data: BiomechanicsInput) -> tuple[float, float]:
    """Compute stride frequency (Hz) and score.

    Formula:
        frequency = stride_count / duration_sec
        score = (current / 2.2 target) × 100
    """
    freq = data.stride_frequency
    if freq is None and data.stride_count and data.duration_sec:
        freq = safe_div(float(data.stride_count), data.duration_sec, 0.0)
    if freq is None or freq <= 0:
        return 0.0, 50.0
    return freq, normalize_frequency(freq, TARGET_STRIDE_FREQUENCY)


def calculate_stride_efficiency(length_score: float, frequency_score: float) -> float:
    """Stride Efficiency = Length×0.6 + Frequency×0.4."""
    return clamp(
        length_score * STRIDE_EFFICIENCY_LENGTH_WEIGHT
        + frequency_score * STRIDE_EFFICIENCY_FREQUENCY_WEIGHT
    )


def calculate_symmetry(data: BiomechanicsInput) -> tuple[float, float]:
    """Motion symmetry from left/right stride comparison.

    Formula:
        asymmetry% = |left − right| / average × 100
        symmetry = 100 − (asymmetry% × 5)
    """
    left = data.left_stride_m
    right = data.right_stride_m
    if left is None or right is None or left <= 0 or right <= 0:
        return 0.0, 50.0
    avg = (left + right) / 2.0
    asymmetry = safe_div(abs(left - right), avg, 0.0) * 100.0
    return asymmetry, normalize_symmetry(asymmetry)


def calculate_joint_efficiency(data: BiomechanicsInput) -> tuple[float, dict[str, float]]:
    """Joint efficiency from ROM / extension metrics.

    Joint Score = Shoulder×0.30 + Hip×0.25 + Hock×0.25 + Fetlock×0.20
    """
    shoulder = clamp(safe_div(data.shoulder_rom_deg or 0, 35.0, 0.0) * 100) if data.shoulder_rom_deg else 55.0
    hip = clamp(safe_div(data.hip_rom_deg or 0, 40.0, 0.0) * 100) if data.hip_rom_deg else 55.0
    hock = normalize_ratio(data.hock_extension_deg or 0, OPTIMAL_HOCK_EXTENSION_DEG) if data.hock_extension_deg else 55.0
    fetlock = clamp(safe_div(data.fetlock_rom_deg or 0, 45.0, 0.0) * 100) if data.fetlock_rom_deg else 55.0

    components = {
        "shoulder": shoulder,
        "hip": hip,
        "hock": hock,
        "fetlock": fetlock,
    }
    total = sum(components[k] * JOINT_WEIGHTS[k] for k in components)
    return clamp(total), components


def calculate_power_index(length_m: float, frequency: float, mass_factor: float = 1.0) -> tuple[float, float]:
    """SPI = length × frequency × mass; score = SPI / elite_SPI × 100."""
    spi = length_m * frequency * mass_factor
    return spi, normalize_ratio(spi, ELITE_SPI)


def calculate_energy_economy(data: BiomechanicsInput, velocity: float) -> float:
    """Energy Economy = velocity / movement_variability (normalized)."""
    variability = data.movement_variability or 0.1
    if variability <= 0:
        variability = 0.1
    raw = safe_div(velocity, variability, 0.0)
    return clamp(min(raw * 8.0, 100.0))


def calculate_biomechanics_score(data: BiomechanicsInput, body_mass_factor: float = 1.0) -> BiomechanicsBreakdown:
    """Full biomechanical analysis → BPI and sub-scores."""
    breakdown = BiomechanicsBreakdown()

    length_m, length_score = calculate_stride_length(data)
    freq, freq_score = calculate_stride_frequency(data)
    breakdown.stride_length_m = length_m
    breakdown.stride_length_score = length_score
    breakdown.stride_frequency = freq
    breakdown.frequency_score = freq_score
    breakdown.stride_efficiency = calculate_stride_efficiency(length_score, freq_score)

    if data.ground_contact_time_ms is not None:
        # Shorter contact → higher score (elite ~150ms)
        breakdown.ground_contact_score = clamp(100.0 - max(0, data.ground_contact_time_ms - 120) * 0.15)
    if data.suspension_phase_pct is not None:
        breakdown.suspension_score = clamp(data.suspension_phase_pct * 1.2)

    asymmetry, symmetry = calculate_symmetry(data)
    breakdown.asymmetry_pct = asymmetry
    breakdown.motion_symmetry = symmetry

    joint_score, joint_comp = calculate_joint_efficiency(data)
    breakdown.joint_efficiency = joint_score
    breakdown.joint_components = joint_comp

    spi, power_score = calculate_power_index(length_m, freq, body_mass_factor)
    breakdown.power_index = spi
    breakdown.power_score = power_score

    if data.movement_consistency_cv is not None:
        breakdown.movement_consistency = normalize_variability_to_consistency(data.movement_consistency_cv)
    else:
        breakdown.movement_consistency = 55.0

    breakdown.balance_score = clamp(data.balance_score_raw or 55.0)

    velocity = data.velocity_proxy or (length_m * freq if length_m and freq else 1.0)
    breakdown.energy_economy = calculate_energy_economy(data, velocity)

    breakdown.bpi = clamp(
        breakdown.stride_efficiency * BPI_WEIGHTS["stride_efficiency"]
        + breakdown.motion_symmetry * BPI_WEIGHTS["motion_symmetry"]
        + breakdown.joint_efficiency * BPI_WEIGHTS["joint_efficiency"]
        + breakdown.power_score * BPI_WEIGHTS["power_generation"]
        + breakdown.energy_economy * BPI_WEIGHTS["energy_economy"]
    )
    return breakdown


def biomechanics_to_score_with_confidence(
    data: BiomechanicsInput,
    body_mass_factor: float = 1.0,
) -> ScoreWithConfidence:
    """Public API: biomechanics → ScoreWithConfidence."""
    bd = calculate_biomechanics_score(data, body_mass_factor)
    fields = [
        (data.stride_length_m or data.distance_m, 1.0),
        (data.stride_frequency or data.stride_count, 1.0),
        (data.left_stride_m, 0.8),
        (data.hock_extension_deg, 0.7),
        (data.shoulder_rom_deg, 0.6),
    ]
    conf = reduce_confidence_for_sparse_data(
        aggregate_confidence(fields),
        sum(1 for v, _ in fields if v is not None),
        len(fields),
    )
    return ScoreWithConfidence(
        score=bd.bpi,
        confidence=conf,
        components={
            "stride_length_score": bd.stride_length_score,
            "frequency_score": bd.frequency_score,
            "stride_efficiency": bd.stride_efficiency,
            "motion_symmetry": bd.motion_symmetry,
            "joint_efficiency": bd.joint_efficiency,
            "power_score": bd.power_score,
            "energy_economy": bd.energy_economy,
            "movement_consistency": bd.movement_consistency,
            "balance_score": bd.balance_score,
            "bpi": bd.bpi,
            **bd.joint_components,
        },
        notes=bd.notes,
    )
