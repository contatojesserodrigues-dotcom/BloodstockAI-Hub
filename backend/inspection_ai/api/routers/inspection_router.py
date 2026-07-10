"""Inspection scoring REST API."""

import logging
import os
from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from inspection_ai.api.models import InspectionScoreRequest, InspectionScoreResponse
from inspection_ai.application.inspection_scoring_service import InspectionScoringService
from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/inspection", tags=["inspection"])

_service = InspectionScoringService()
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
