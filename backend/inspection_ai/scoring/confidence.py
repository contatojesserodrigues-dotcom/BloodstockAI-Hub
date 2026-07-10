"""Confidence estimation for scores with incomplete data."""

from __future__ import annotations

from typing import Iterable, Optional

from .constants import DEFAULT_FIELD_CONFIDENCE, MAX_CONFIDENCE, MIN_CONFIDENCE


def field_confidence(value: Optional[float], weight: float = 1.0) -> float:
    """Return confidence contribution for a single field.

    Args:
        value: Field value; None reduces confidence.
        weight: Relative importance (0–1).

    Returns:
        Confidence contribution 0–1.
    """
    if value is None:
        return DEFAULT_FIELD_CONFIDENCE * weight * 0.5
    return MAX_CONFIDENCE * weight


def aggregate_confidence(fields: Iterable[tuple[Optional[float], float]]) -> float:
    """Aggregate confidence from weighted field presence.

    Args:
        fields: Iterable of (value, weight) pairs.

    Returns:
        Combined confidence clamped to [MIN_CONFIDENCE, MAX_CONFIDENCE].
    """
    weights = list(fields)
    if not weights:
        return DEFAULT_FIELD_CONFIDENCE

    total_w = sum(w for _, w in weights) or 1.0
    score = sum(field_confidence(v, w) for v, w in weights) / total_w
    present = sum(1 for v, _ in weights if v is not None)
    coverage = present / len(weights)
    blended = score * 0.7 + coverage * MAX_CONFIDENCE * 0.3
    return round(max(MIN_CONFIDENCE, min(MAX_CONFIDENCE, blended)), 3)


def reduce_confidence_for_sparse_data(
    confidence: float,
    fields_present: int,
    fields_total: int,
) -> float:
    """Penalize confidence when too few inputs are available."""
    if fields_total <= 0:
        return MIN_CONFIDENCE
    ratio = fields_present / fields_total
    if ratio >= 0.8:
        return confidence
    penalty = (0.8 - ratio) * 0.4
    return round(max(MIN_CONFIDENCE, confidence - penalty), 3)
