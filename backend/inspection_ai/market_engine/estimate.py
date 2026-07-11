"""Market Estimate Engine — delegates to Intelligence Framework M10."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.intelligence_framework.m10_market import compute_framework_market_estimate
from inspection_ai.scoring.normalization import clamp

BASE_BY_CATEGORY: dict[str, float] = {
    "FOAL": 25_000,
    "WEANLING": 25_000,
    "YEARLING": 80_000,
    "FLAT_YEARLING": 80_000,
    "FLAT_IN_TRAINING": 120_000,
    "NH_STORE_YOUNG": 40_000,
    "NH_IN_TRAINING": 90_000,
    "BREEZE_UP": 100_000,
    "BROODMARE_STALLION": 150_000,
    "STALLION_PROSPECT": 150_000,
}


def _fmt_usd(n: float) -> str:
    return f"${int(round(n)):,}"


def compute_market_estimate(
    overall_score: float,
    category: str,
    pedigree_rating: Optional[float] = None,
    biomechanics_score: Optional[float] = None,
    conformation_score: Optional[float] = None,
    commercial_pedigree: Optional[float] = None,
    sibling_prices: Optional[list[float]] = None,
    region: Optional[str] = None,
    auction: Optional[str] = None,
    family_score: Optional[float] = None,
    commercial_score: Optional[float] = None,
    risk_adjustment_factor: Optional[float] = None,
) -> dict[str, Any]:
    """Market Estimate — uses Framework v1.0 weights when component scores available."""
    ped_score = (pedigree_rating * 10) if pedigree_rating is not None else overall_score
    bio = biomechanics_score if biomechanics_score is not None else overall_score
    conf = conformation_score if conformation_score is not None else overall_score
    fam = family_score if family_score is not None else ped_score * 0.85
    comm = commercial_score if commercial_score is not None else (commercial_pedigree or ped_score)
    risk_adj = risk_adjustment_factor if risk_adjustment_factor is not None else 0.7

    if any(x is not None for x in (biomechanics_score, conformation_score, family_score, commercial_score)):
        return compute_framework_market_estimate(
            category=category,
            pedigree_score=ped_score,
            family_score=fam,
            biomechanics_score=bio,
            conformation_score=conf,
            commercial_score=comm,
            risk_adjustment_factor=risk_adj,
            sibling_prices=sibling_prices,
            region=region,
            auction=auction,
        )

    # Legacy fallback when only overall + pedigree_rating available
    s = clamp(overall_score)
    ped = pedigree_rating if pedigree_rating is not None else 5.0
    blended = round(s * 0.6 + ped * 10 * 0.4) if pedigree_rating is not None else s
    base = BASE_BY_CATEGORY.get(category.upper().replace(" ", "_"), 60_000)
    factor = 0.4 + (blended / 100) * 1.6
    lo = round(base * factor * 0.55 / 1000) * 1000
    mid = round(base * factor / 1000) * 1000
    med = round(base * factor * 1.45 / 1000) * 1000
    hi = round(base * factor * 2.2 / 1000) * 1000
    confidence = "high" if blended >= 75 else "medium" if blended >= 55 else "low"
    return {
        "estimated_market_value": mid,
        "expected_sale_range": f"{_fmt_usd(lo)} – {_fmt_usd(hi)}",
        "low_estimate": lo,
        "most_likely_price": mid,
        "high_estimate": hi,
        "confidence_score": round(blended / 100.0, 2),
        "confidence_label": confidence,
        "blended_score": blended,
        "engine_version": "1.0.0",
        "framework": "bloodstock_intelligence_v1",
    }
