"""Normalization utilities — convert raw metrics to 0–100 scale."""

from __future__ import annotations

import math
from typing import Optional


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    """Clamp *value* to [low, high] and round to one decimal."""
    return round(max(low, min(high, value)), 1)


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Divide safely; return *default* when denominator is zero."""
    if denominator == 0 or math.isnan(denominator) or math.isinf(denominator):
        return default
    return numerator / denominator


def normalize_ratio(current: float, reference: float, cap: float = 100.0) -> float:
    """Normalize a ratio against a reference value.

    Formula: (current / reference) × 100, capped at *cap*.

    Args:
        current: Observed value.
        reference: Elite / target reference (> 0).
        cap: Maximum score.

    Returns:
        Score on 0–100 scale.
    """
    if reference <= 0:
        return 50.0
    return clamp(safe_div(current, reference, 0.0) * 100.0, 0.0, cap)


def normalize_distance(current_m: float, elite_m: float = 7.5) -> float:
    """Normalize stride length in metres to 0–100."""
    return normalize_ratio(current_m, elite_m)


def normalize_frequency(current_hz: float, target_hz: float = 2.2) -> float:
    """Normalize stride frequency (strides/sec) to 0–100."""
    return normalize_ratio(current_hz, target_hz)


def normalize_angle(
    observed_deg: float,
    optimal_deg: float,
    tolerance_deg: float = 15.0,
) -> float:
    """Score an angle against an optimal target.

    Formula: 100 − (|observed − optimal| / tolerance) × 100, clamped 0–100.

    Args:
        observed_deg: Measured angle.
        optimal_deg: Ideal angle.
        tolerance_deg: Degrees of deviation that map to score 0.

    Returns:
        Score 0–100.
    """
    if tolerance_deg <= 0:
        return 50.0
    deviation = abs(observed_deg - optimal_deg)
    return clamp(100.0 - safe_div(deviation, tolerance_deg, 0.0) * 100.0)


def normalize_symmetry(asymmetry_pct: float) -> float:
    """Convert asymmetry percentage to symmetry score.

    Formula: 100 − (asymmetry_pct × 5), per BloodstockAI spec.
    """
    return clamp(100.0 - asymmetry_pct * 5.0)


def normalize_angle_extension(observed: float, optimal: float = 155.0) -> float:
    """Hock / joint extension score: (observed / optimal) × 100."""
    return normalize_ratio(observed, optimal)


def normalize_leg_alignment(deviation_deg: float) -> float:
    """Leg alignment: 100 − (|deviation| × 10). Ideal 0–3°."""
    return clamp(100.0 - abs(deviation_deg) * 10.0)


def normalize_variability_to_consistency(coefficient_of_variation: float) -> float:
    """Higher CV → lower consistency score."""
    return clamp(100.0 - coefficient_of_variation * 100.0)


def normalize_optional(value: Optional[float], default: float = 50.0) -> float:
    """Return *value* or *default* when missing."""
    if value is None or math.isnan(value):
        return default
    return float(value)
