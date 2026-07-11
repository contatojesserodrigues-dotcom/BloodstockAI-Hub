"""M9 — Final Horse Score with category-specific weights."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.intelligence_framework.m01_identity import is_national_hunt, resolve_category_weights
from inspection_ai.scoring.normalization import clamp


def calculate_final_horse_score(
    category: Optional[str],
    biomechanics: float,
    pedigree: float,
    conformation: float,
    behaviour: float,
    commercial: float,
    durability: Optional[float] = None,
) -> dict[str, Any]:
    """Category-weighted final score — Framework v1.0 MODULE 9."""
    weights = resolve_category_weights(category)
    nh = is_national_hunt(category)

    if nh:
        structure = conformation
        movement = biomechanics
        dur = durability if durability is not None else conformation * 0.5 + biomechanics * 0.5
        score = clamp(
            structure * weights.get("structure", 0.3)
            + pedigree * weights.get("pedigree", 0.25)
            + dur * weights.get("durability", 0.2)
            + movement * weights.get("movement", 0.15)
            + behaviour * weights.get("behaviour", 0.1)
        )
        applied = {
            "structure": structure,
            "pedigree": pedigree,
            "durability": dur,
            "movement": movement,
            "behaviour": behaviour,
        }
    else:
        score = clamp(
            pedigree * weights.get("pedigree", 0.3)
            + biomechanics * weights.get("biomechanics", 0.3)
            + conformation * weights.get("conformation", 0.2)
            + commercial * weights.get("commercial", 0.15)
            + behaviour * weights.get("behaviour", 0.05)
        )
        applied = {
            "pedigree": pedigree,
            "biomechanics": biomechanics,
            "conformation": conformation,
            "commercial": commercial,
            "behaviour": behaviour,
        }

    return {
        "overall_score": score,
        "weight_profile": weights,
        "is_national_hunt": nh,
        "applied_scores": applied,
    }
