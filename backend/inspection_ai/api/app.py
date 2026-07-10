"""FastAPI HTTP API for BloodstockAI Scientific Scoring Engine."""

import logging
import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from inspection_ai.scoring import ScientificScoringEngine
from inspection_ai.scoring.constants import SHARED_CONSTANTS_VERSION
from inspection_ai.scoring.models import ScoringInput
from inspection_ai.scoring.report_formatter import format_summary

logger = logging.getLogger(__name__)

app = FastAPI(
    title="BloodstockAI Scientific Scoring Engine",
    version=SHARED_CONSTANTS_VERSION,
    description="Structured equine inspection scoring — JSON in, JSON out.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("SCORING_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine = ScientificScoringEngine()
_API_KEY = os.getenv("SCORING_API_KEY", "")


class ScoreRequest(BaseModel):
    """Request body mirrors ScoringInput JSON."""

    horse: Dict[str, Any] = Field(default_factory=dict)
    pedigree: Dict[str, Any] = Field(default_factory=dict)
    biomechanics: Dict[str, Any] = Field(default_factory=dict)
    conformation: Dict[str, Any] = Field(default_factory=dict)
    behaviour: Dict[str, Any] = Field(default_factory=dict)
    hoof: Dict[str, Any] = Field(default_factory=dict)
    commercial: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


def _check_auth(authorization: Optional[str], x_api_key: Optional[str]) -> None:
    if not _API_KEY:
        return
    token = (x_api_key or "").strip()
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if token != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health() -> Dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "engine": "scientific_scoring", "version": SHARED_CONSTANTS_VERSION}


@app.post("/v1/score")
def score_v1(
    body: ScoreRequest,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    """Run full Scientific Scoring Engine pipeline."""
    _check_auth(authorization, x_api_key)
    payload = body.model_dump()
    try:
        report = _engine.generate_final_report(payload)
        logger.info(
            "Scored horse=%s overall=%s",
            payload.get("horse", {}).get("name"),
            report.get("overall_score"),
        )
        return report
    except Exception as exc:
        logger.exception("Scoring failed")
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/score/summary")
def score_summary_v1(
    body: ScoreRequest,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    """Compact scoring summary for list views."""
    _check_auth(authorization, x_api_key)
    output = _engine.score(body.model_dump())
    return format_summary(output)


@app.post("/v1/validate")
def validate_v1(body: ScoreRequest) -> Dict[str, Any]:
    """Validate input schema without scoring."""
    data = ScoringInput.model_validate(body.model_dump())
    return {"valid": True, "horse": data.horse.name}
