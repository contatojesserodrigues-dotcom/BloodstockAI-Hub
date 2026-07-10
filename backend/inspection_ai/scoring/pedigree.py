"""Pedigree scoring module."""

from __future__ import annotations

from .confidence import aggregate_confidence, reduce_confidence_for_sparse_data
from .constants import PEDIGREE_WEIGHTS
from .models import PedigreeInput, ScoreWithConfidence
from .normalization import clamp, normalize_optional


def _invert_inbreeding(coef: float | None) -> float:
    """Lower inbreeding → higher score. COI 0% → 100, COI 20%+ → ~40."""
    if coef is None:
        return 55.0
    return clamp(100.0 - coef * 300.0)


def calculate_pedigree_score(data: PedigreeInput) -> ScoreWithConfidence:
    """Pedigree Score from component influences.

    Components (normalized 0–100):
        Sire 30%, Dam 30%, Black Type 20%, Nick 20%
    Extended inputs also feed stamina/speed indices in components dict.
    """
    rating_scale = (data.pedigree_rating * 10.0) if data.pedigree_rating is not None else None

    sire = normalize_optional(data.sire_performance, rating_scale or 50.0)
    dam = normalize_optional(data.dam_performance, rating_scale or 50.0)
    damsire = normalize_optional(data.damsire_influence, 50.0)
    black_type = normalize_optional(data.black_type_score, rating_scale or 50.0 if rating_scale else 50.0)
    family_depth = normalize_optional(data.family_depth, 50.0)
    commercial = normalize_optional(data.commercial_appeal, 50.0)
    nick = normalize_optional(data.nick_compatibility, 50.0)
    inbreeding = _invert_inbreeding(data.inbreeding_coefficient)
    stamina = normalize_optional(data.stamina_index, 50.0)
    speed = normalize_optional(data.speed_index, 50.0)

    composite = clamp(
        sire * PEDIGREE_WEIGHTS["sire_influence"]
        + dam * PEDIGREE_WEIGHTS["dam_influence"]
        + black_type * PEDIGREE_WEIGHTS["family_black_type"]
        + nick * PEDIGREE_WEIGHTS["nick_compatibility"]
    )

    fields = [
        (data.sire_performance, 1.0),
        (data.dam_performance, 1.0),
        (data.black_type_score, 0.9),
        (data.nick_compatibility, 0.7),
        (data.pedigree_rating, 0.8),
    ]
    conf = reduce_confidence_for_sparse_data(
        aggregate_confidence(fields),
        sum(1 for v, _ in fields if v is not None),
        len(fields),
    )

    return ScoreWithConfidence(
        score=composite,
        confidence=conf,
        components={
            "sire_influence": sire,
            "dam_influence": dam,
            "damsire_influence": damsire,
            "black_type_score": black_type,
            "family_depth": family_depth,
            "commercial_appeal": commercial,
            "nick_compatibility": nick,
            "inbreeding_score": inbreeding,
            "stamina_index": stamina,
            "speed_index": speed,
        },
    )
