"""Conformation scoring module."""

from __future__ import annotations

from .confidence import aggregate_confidence, reduce_confidence_for_sparse_data
from .constants import CONFORMATION_WEIGHTS, OPTIMAL_SHOULDER_ANGLE_DEG
from .models import ConformationInput, ScoreWithConfidence
from .normalization import clamp, normalize_leg_alignment, normalize_optional


def calculate_conformation_score(data: ConformationInput) -> ScoreWithConfidence:
    """Conformation Score — weighted structural assessment.

    Formula:
        Balance×0.25 + Leg Alignment×0.20 + Shoulder×0.15
        + Hindquarter×0.20 + Bone×0.20

    Leg alignment from deviation degrees: 100 − (|dev| × 10).
    """
    leg_score = (
        normalize_leg_alignment(data.leg_alignment_deviation_deg)
        if data.leg_alignment_deviation_deg is not None
        else normalize_optional(data.front_limb, 50.0)
    )

    balance = normalize_optional(data.balance, normalize_optional(data.overall_structure, 50.0))
    shoulder = normalize_optional(
        data.shoulder,
        clamp(100.0 - abs(normalize_optional(data.shoulder, OPTIMAL_SHOULDER_ANGLE_DEG) - OPTIMAL_SHOULDER_ANGLE_DEG) * 3)
        if data.shoulder is not None
        else 50.0,
    )
    hind = normalize_optional(data.hip, normalize_optional(data.rear_limb, 50.0))
    bone = normalize_optional(data.bone, 50.0)
    topline = normalize_optional(data.topline, 50.0)
    pastern = normalize_optional(data.pastern, 50.0)
    front = normalize_optional(data.front_limb, leg_score)
    rear = normalize_optional(data.rear_limb, hind)

    total = clamp(
        balance * CONFORMATION_WEIGHTS["balance"]
        + leg_score * CONFORMATION_WEIGHTS["leg_alignment"]
        + shoulder * CONFORMATION_WEIGHTS["shoulder"]
        + hind * CONFORMATION_WEIGHTS["hindquarter"]
        + bone * CONFORMATION_WEIGHTS["bone_structure"]
    )

    fields = [
        (data.balance, 1.0),
        (data.leg_alignment_deviation_deg or data.front_limb, 0.9),
        (data.shoulder, 0.7),
        (data.hip or data.rear_limb, 0.7),
        (data.bone, 0.6),
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
            "balance": balance,
            "leg_alignment": leg_score,
            "shoulder": shoulder,
            "hindquarter": hind,
            "bone_structure": bone,
            "topline": topline,
            "front_limb": front,
            "rear_limb": rear,
            "pastern": pastern,
            "overall_structure": normalize_optional(data.overall_structure, total),
        },
    )
