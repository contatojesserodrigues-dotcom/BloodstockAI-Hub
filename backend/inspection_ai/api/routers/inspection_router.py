"""Inspection scoring REST API."""

import logging
import os
from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from inspection_ai.api.models import (
    InspectionScoreRequest,
    InspectionScoreResponse,
    MarketEstimateRequest,
    MarketEstimateResponse,
    PedigreeIntelligenceRequest,
    PedigreeIntelligenceResponse,
)
from inspection_ai.application.inspection_scoring_service import InspectionScoringService
from inspection_ai.application.market_estimate_service import MarketEstimateService
from inspection_ai.application.pedigree_intelligence_service import PedigreeIntelligenceService
from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/inspection", tags=["inspection"])

_service = InspectionScoringService()
_pedigree_service = PedigreeIntelligenceService()
_market_service = MarketEstimateService()
_API_KEY = os.getenv("SCORING_API_KEY", "")


def _check_auth(authorization: Optional[str], x_api_key: Optional[str]) -> None:
    if not _API_KEY:
        return
    token = (x_api_key or "").strip()
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if token != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.get("/version")
def get_version() -> Dict[str, str]:
    """Return active scientific module versions."""
    return CURRENT_SCIENTIFIC_VERSION.to_dict()


@router.post("/score", response_model=InspectionScoreResponse)
def score_inspection(
    body: InspectionScoreRequest,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> InspectionScoreResponse:
    """Score an inspection — Python is the single source of truth for all formulas."""
    _check_auth(authorization, x_api_key)
    try:
        return _service.score_inspection(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Inspection scoring failed")
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/pedigree/intelligence", response_model=PedigreeIntelligenceResponse)
def pedigree_intelligence(
    body: PedigreeIntelligenceRequest,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> PedigreeIntelligenceResponse:
    """Compute dynamic pedigree intelligence from Tavily research JSON."""
    _check_auth(authorization, x_api_key)
    try:
        return _pedigree_service.compute(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Pedigree intelligence failed")
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@router.post("/market/estimate", response_model=MarketEstimateResponse)
def market_estimate(
    body: MarketEstimateRequest,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> MarketEstimateResponse:
    """Market Estimate Engine — commercial valuation from inspection + pedigree."""
    _check_auth(authorization, x_api_key)
    try:
        return _market_service.estimate(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Market estimate failed")
        raise HTTPException(status_code=422, detail=str(exc)) from exc
