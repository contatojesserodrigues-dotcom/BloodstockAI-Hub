"""M10 — Market Estimate per Framework v1.0 weights."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.scoring.constants import MARKET_ESTIMATE_WEIGHTS, PHYSICAL_COMPOSITE_WEIGHTS
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


def compute_framework_market_estimate(
    category: str,
    pedigree_score: float,
    family_score: float,
    biomechanics_score: float,
    conformation_score: float,
    commercial_score: float,
    risk_adjustment_factor: float,
    sibling_prices: Optional[list[float]] = None,
    region: Optional[str] = None,
    auction: Optional[str] = None,
) -> dict[str, Any]:
    """Fair Market Value blend per spec MODULE 10."""
    physical = clamp(
        biomechanics_score * PHYSICAL_COMPOSITE_WEIGHTS["biomechanics"]
        + conformation_score * PHYSICAL_COMPOSITE_WEIGHTS["conformation"]
    )
    risk_component = clamp(risk_adjustment_factor * 100)

    blended = clamp(
        pedigree_score * MARKET_ESTIMATE_WEIGHTS["pedigree"]
        + family_score * MARKET_ESTIMATE_WEIGHTS["family"]
        + physical * MARKET_ESTIMATE_WEIGHTS["physical"]
        + commercial_score * MARKET_ESTIMATE_WEIGHTS["commercial"]
        + risk_component * MARKET_ESTIMATE_WEIGHTS["risk"]
    )

    base = BASE_BY_CATEGORY.get(category.upper().replace(" ", "_"), 60_000)
    if sibling_prices:
        base = (base + sum(sibling_prices) / len(sibling_prices)) / 2

    factor = 0.4 + (blended / 100) * 1.6
    lo = round(base * factor * 0.55 / 1000) * 1000
    mid = round(base * factor / 1000) * 1000
    med = round(base * factor * 1.45 / 1000) * 1000
    hi = round(base * factor * 2.2 / 1000) * 1000

    confidence = (
        "high" if blended >= 75 else "medium" if blended >= 55 else "low" if blended > 0 else "insufficient"
    )

    return {
        "estimated_market_value": mid,
        "expected_sale_range": f"{_fmt_usd(lo)} – {_fmt_usd(hi)}",
        "low_estimate": lo,
        "most_likely_price": mid,
        "high_estimate": hi,
        "confidence_score": round(blended / 100.0, 2),
        "confidence_label": confidence,
        "blended_score": blended,
        "components": {
            "pedigree_value": pedigree_score,
            "family_value": family_score,
            "physical_score": physical,
            "commercial_demand": commercial_score,
            "risk_adjustment": risk_component,
        },
        "base_category": category,
        "region": region,
        "auction": auction,
        "tiers": {
            "basic": {"label": "Conservative", "range": f"{_fmt_usd(lo)} – {_fmt_usd(mid)}"},
            "median": {"label": "Base estimate", "range": f"{_fmt_usd(mid)} – {_fmt_usd(med)}"},
            "maximum": {"label": "Upside", "range": f"{_fmt_usd(med)} – {_fmt_usd(hi)}"},
        },
        "engine_version": "1.0.0",
        "framework": "bloodstock_intelligence_v1",
    }
