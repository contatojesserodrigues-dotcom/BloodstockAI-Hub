"""Hoof scoring module."""

from __future__ import annotations

from .confidence import aggregate_confidence, reduce_confidence_for_sparse_data
from .constants import HOOF_WEIGHTS
from .models import HoofInput, ScoreWithConfidence
from .normalization import clamp, normalize_optional


def calculate_hoof_score(data: HoofInput) -> ScoreWithConfidence:
    """Hoof Health Score from balance, angle, symmetry, wall quality.

    Risk indicators (0–100 risk) inverted into score contribution.
    """
    balance = normalize_optional(data.hoof_balance, 55.0)
    angle = normalize_optional(data.hoof_angle, 55.0)
    symmetry = normalize_optional(data.symmetry, 55.0)
    wall = normalize_optional(data.wall_quality, 55.0)
    risk = data.risk_indicators
    risk_score = clamp(100.0 - normalize_optional(risk, 30.0)) if risk is not None else 60.0

    total = clamp(
        balance * HOOF_WEIGHTS["hoof_balance"]
        + angle * HOOF_WEIGHTS["hoof_angle"]
        + symmetry * HOOF_WEIGHTS["symmetry"]
        + wall * HOOF_WEIGHTS["wall_quality"]
    )
    if risk is not None:
        total = clamp(total * 0.85 + risk_score * 0.15)

    fields = [
        (data.hoof_balance, 1.0),
        (data.hoof_angle, 0.9),
        (data.symmetry, 0.9),
        (data.wall_quality, 0.8),
        (data.risk_indicators, 0.7),
    ]
    conf = reduce_confidence_for_sparse_data(
        aggregate_confidence(fields),
        sum(1 for v, _ in fields if v is not None),
        len(fields),
    )

    return ScoreWithConfidence(
        score=total,
        confidence=conf,
        components={
            "hoof_balance": balance,
            "hoof_angle": angle,
            "symmetry": symmetry,
            "wall_quality": wall,
            "risk_adjusted": risk_score,
        },
    )
