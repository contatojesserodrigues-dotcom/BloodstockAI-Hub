"""M7 — Risk Assessment."""

from __future__ import annotations

from typing import Any

from inspection_ai.scoring.normalization import clamp


def compute_risk_assessment(
    structural_risk: float,
    movement_risk: float,
    pedigree_risk: float,
    hoof_risk: float = 50.0,
) -> dict[str, Any]:
    """Unified Risk Score 0–100 (higher = more risk)."""
    score = clamp(
        structural_risk * 0.35
        + movement_risk * 0.30
        + pedigree_risk * 0.20
        + hoof_risk * 0.15
    )
    level = "Low" if score < 35 else "Medium" if score < 60 else "High"
    return {
        "risk_score": score,
        "risk_level": level,
        "components": {
            "structural_risk": structural_risk,
            "movement_risk": movement_risk,
            "pedigree_risk": pedigree_risk,
            "hoof_risk": hoof_risk,
        },
        "risk_adjustment_factor": round((100 - score) / 100.0, 2),
    }


def pedigree_risk_from_module(pedigree_module: dict[str, Any]) -> float:
    """Low dam/sibling/family production → higher pedigree risk."""
    dam = (pedigree_module.get("dam") or {}).get("score", 55)
    sibs = (pedigree_module.get("siblings") or {}).get("score", 55)
    family = (pedigree_module.get("family") or {}).get("score", 55)
    avg = (dam + sibs + family) / 3.0
    return clamp(100.0 - avg)
