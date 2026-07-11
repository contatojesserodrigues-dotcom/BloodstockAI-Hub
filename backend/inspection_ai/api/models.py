"""API request/response models for Inspection Scoring endpoint."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class InspectionScoreRequest(BaseModel):
    """POST /api/v1/inspection/score body."""

    inspection_id: str = Field(..., description="UUID of inspection_analyses row")
    user_id: Optional[str] = Field(default=None, description="Set by edge auth proxy")
    horse: Dict[str, Any] = Field(default_factory=dict)
    pedigree: Dict[str, Any] = Field(default_factory=dict)
    biomechanics: Dict[str, Any] = Field(default_factory=dict)
    conformation: Dict[str, Any] = Field(default_factory=dict)
    behaviour: Dict[str, Any] = Field(default_factory=dict)
    hoof: Dict[str, Any] = Field(default_factory=dict)
    commercial: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    persist: bool = Field(default=True, description="Write results to Supabase")


class RecommendationsBlock(BaseModel):
    """Buying / ROI / longevity recommendations."""

    buying: str = ""
    risk_profile: str = "Medium"
    roi_score: float = 0.0
    roi_grade: str = "Moderate"
    longevity_score: float = 0.0
    longevity_risk: str = "Medium"
    distance_recommended: Optional[str] = None
    g1_tier: Optional[str] = None


class InspectionScoreResponse(BaseModel):
    """Standardized API response — frontend consumes this only."""

    inspection_id: str
    overall_score: float
    elite_potential: float
    confidence: float
    biomechanics: Dict[str, Any]
    pedigree: Dict[str, Any]
    conformation: Dict[str, Any]
    behaviour: Dict[str, Any]
    hoof: Dict[str, Any]
    commercial: Dict[str, Any]
    recommendations: RecommendationsBlock
    scientific_version: Dict[str, str]
    scored_at: str
    report: Dict[str, Any] = Field(default_factory=dict)


class PedigreeIntelligenceRequest(BaseModel):
    """POST /api/v1/inspection/pedigree/intelligence body."""

    inspection_id: str
    user_id: Optional[str] = None
    research: Dict[str, Any] = Field(default_factory=dict)
    persist: bool = True


class PedigreeIntelligenceResponse(BaseModel):
    inspection_id: str
    intelligence: Dict[str, Any]
    pedigree_input: Dict[str, Any]
    engine_version: str = "1.0.0"


class MarketEstimateRequest(BaseModel):
    """POST /api/v1/inspection/market/estimate body."""

    inspection_id: str
    user_id: Optional[str] = None
    persist: bool = True


class MarketEstimateResponse(BaseModel):
    inspection_id: str
    estimate: Dict[str, Any]
    engine_version: str = "1.0.0"
