"""M3 — Commercial Analysis."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.scoring.normalization import clamp


def compute_commercial_appeal(
    pedigree_module: dict[str, Any],
    research: Optional[dict[str, Any]] = None,
    commercial_score: Optional[float] = None,
) -> dict[str, Any]:
    """Commercial Appeal Score — pedigree demand + sire popularity + family."""
    research = research or {}
    sire = pedigree_module.get("sire") or {}
    dam = pedigree_module.get("dam") or {}
    family = pedigree_module.get("family") or {}

    sire_commercial = (sire.get("components") or {}).get("commercial_value", 55)
    family_strength = family.get("score", 55)
    dam_bt = (dam.get("components") or {}).get("black_type_production", 55)

    pedigree_commercial = clamp((sire_commercial + dam_bt + family_strength) / 3.0)
    demand = commercial_score if commercial_score is not None else pedigree_commercial

    score = clamp(pedigree_commercial * 0.5 + demand * 0.35 + family_strength * 0.15)
    return {
        "score": score,
        "components": {
            "pedigree_commercial": pedigree_commercial,
            "market_demand": demand,
            "family_demand": family_strength,
        },
    }
