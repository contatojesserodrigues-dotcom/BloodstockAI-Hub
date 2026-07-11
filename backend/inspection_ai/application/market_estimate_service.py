"""Market Estimate application service."""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from inspection_ai.api.models import MarketEstimateRequest, MarketEstimateResponse
from inspection_ai.infrastructure.repositories.inspection_repository import InspectionRepository
from inspection_ai.market_engine import compute_market_estimate
from inspection_ai.report_engine import build_intelligence_bundle

logger = logging.getLogger(__name__)


def _parse_price(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    digits = re.sub(r"[^\d.]", "", value.replace(",", ""))
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _sibling_prices(research: dict[str, Any]) -> list[float]:
    siblings = research.get("siblings") or []
    prices: list[float] = []
    if not isinstance(siblings, list):
        return prices
    for sib in siblings:
        if not isinstance(sib, dict):
            continue
        p = _parse_price(sib.get("sale_price"))
        if p:
            prices.append(p)
    return prices


class MarketEstimateService:
    """Combine inspection scores + pedigree → commercial valuation."""

    def __init__(self, repository: Optional[InspectionRepository] = None) -> None:
        self.repository = repository or InspectionRepository()

    def estimate(self, request: MarketEstimateRequest) -> MarketEstimateResponse:
        analysis = self.repository.get_analysis(request.inspection_id, request.user_id)
        if not analysis:
            raise ValueError(f"Inspection not found: {request.inspection_id}")

        overall = float(analysis.get("consolidated_score") or 50)
        category = str(analysis.get("horse_category") or "YEARLING")
        pr = analysis.get("pedigree_research") or {}
        pedigree_rating = pr.get("pedigree_rating")
        if isinstance(pedigree_rating, (int, float)):
            pedigree_rating = float(pedigree_rating)
        else:
            pedigree_rating = None

        commercial = None
        components = (pr.get("components") or pr.get("intelligence") or {}).get("components") or {}
        if isinstance(components, dict):
            commercial = components.get("commercial_appeal")

        estimate = compute_market_estimate(
            overall_score=overall,
            category=category,
            pedigree_rating=pedigree_rating,
            biomechanics_score=_num(analysis.get("biomechanics_score")),
            conformation_score=_num(analysis.get("conformation_score")),
            commercial_pedigree=_num(commercial),
            sibling_prices=_sibling_prices(pr),
            region=analysis.get("region"),
            auction=analysis.get("auction_name") or analysis.get("sale_context"),
            family_score=_family_score(pr),
            commercial_score=_num(commercial) or _num(analysis.get("pedigree_intelligence_score")),
            risk_adjustment_factor=_risk_factor(analysis),
        )

        response = MarketEstimateResponse(
            inspection_id=request.inspection_id,
            estimate=estimate,
            engine_version=estimate.get("engine_version", "1.0.0"),
        )

        if request.persist and self.repository.client.enabled:
            uid = request.user_id or str(analysis.get("user_id", ""))
            self._persist(request.inspection_id, uid, estimate)

        return response

    def _persist(self, inspection_id: str, user_id: str, estimate: dict[str, Any]) -> None:
        patch = {"market_estimate": estimate}
        self.repository.update_analysis_scores(inspection_id, user_id, patch)
        bundle = build_intelligence_bundle(market=estimate)
        self.repository.merge_intelligence_bundle(inspection_id, user_id, bundle)
        logger.info(
            "Market estimate persisted inspection=%s value=%s",
            inspection_id,
            estimate.get("most_likely_price"),
        )


def _num(v: Any) -> Optional[float]:
    return float(v) if isinstance(v, (int, float)) else None


def _family_score(pr: dict[str, Any]) -> Optional[float]:
    intel = pr.get("intelligence") or pr.get("components") or {}
    module = pr.get("module") or intel.get("module") or {}
    family = module.get("family") or {}
    if isinstance(family, dict) and family.get("score") is not None:
        return float(family["score"])
    return _num(intel.get("black_type_score"))


def _risk_factor(analysis: dict[str, Any]) -> float:
    risk = analysis.get("soundness_risk")
    if risk == "Low":
        return 0.85
    if risk == "High":
        return 0.45
    return 0.65
