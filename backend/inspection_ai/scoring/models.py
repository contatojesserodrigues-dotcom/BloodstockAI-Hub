"""Pydantic models for Scientific Scoring Engine I/O."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Input sub-models ─────────────────────────────────────────────────────────

class HorseInput(BaseModel):
    """Horse identity and sale context."""

    name: Optional[str] = None
    registration: Optional[str] = None
    birth_year: Optional[int] = None
    sex: Optional[str] = None
    breed: str = "Thoroughbred"
    country: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    body_mass_kg: Optional[float] = None


class BiomechanicsInput(BaseModel):
    """Raw biomechanical metrics from video / CV pipeline."""

    stride_length_m: Optional[float] = None
    stride_count: Optional[int] = None
    duration_sec: Optional[float] = None
    distance_m: Optional[float] = None
    stride_frequency: Optional[float] = None
    left_stride_m: Optional[float] = None
    right_stride_m: Optional[float] = None
    ground_contact_time_ms: Optional[float] = None
    suspension_phase_pct: Optional[float] = None
    shoulder_rom_deg: Optional[float] = None
    hip_rom_deg: Optional[float] = None
    hock_extension_deg: Optional[float] = None
    fetlock_rom_deg: Optional[float] = None
    movement_variability: Optional[float] = None
    velocity_proxy: Optional[float] = None
    balance_score_raw: Optional[float] = None
    movement_consistency_cv: Optional[float] = None


class PedigreeInput(BaseModel):
    """Pedigree intelligence inputs."""

    sire_performance: Optional[float] = None
    dam_performance: Optional[float] = None
    damsire_influence: Optional[float] = None
    black_type_score: Optional[float] = None
    family_depth: Optional[float] = None
    commercial_appeal: Optional[float] = None
    nick_compatibility: Optional[float] = None
    inbreeding_coefficient: Optional[float] = None
    stamina_index: Optional[float] = None
    speed_index: Optional[float] = None
    pedigree_rating: Optional[float] = None  # 0–10 scale


class ConformationInput(BaseModel):
    """Conformation assessment inputs (degrees / 0–100 sub-scores)."""

    shoulder: Optional[float] = None
    hip: Optional[float] = None
    topline: Optional[float] = None
    balance: Optional[float] = None
    bone: Optional[float] = None
    leg_alignment_deviation_deg: Optional[float] = None
    front_limb: Optional[float] = None
    rear_limb: Optional[float] = None
    pastern: Optional[float] = None
    overall_structure: Optional[float] = None


class BehaviourInput(BaseModel):
    """Behaviour video / handling inputs."""

    focus: Optional[float] = None
    stress: Optional[float] = None
    calmness: Optional[float] = None
    handling: Optional[float] = None
    recovery: Optional[float] = None
    movement_behaviour: Optional[float] = None
    environmental_reaction: Optional[float] = None


class HoofInput(BaseModel):
    """Hoof analysis inputs."""

    hoof_balance: Optional[float] = None
    hoof_angle: Optional[float] = None
    symmetry: Optional[float] = None
    wall_quality: Optional[float] = None
    risk_indicators: Optional[float] = None  # 0–100 risk → inverted for score


class CommercialInput(BaseModel):
    """Commercial / market inputs."""

    market_demand: Optional[float] = None
    commercial_profile: Optional[float] = None
    purchase_price: Optional[float] = None
    currency: str = "USD"


class ScoringInput(BaseModel):
    """Top-level engine input."""

    horse: HorseInput = Field(default_factory=HorseInput)
    pedigree: PedigreeInput = Field(default_factory=PedigreeInput)
    biomechanics: BiomechanicsInput = Field(default_factory=BiomechanicsInput)
    conformation: ConformationInput = Field(default_factory=ConformationInput)
    behaviour: BehaviourInput = Field(default_factory=BehaviourInput)
    hoof: HoofInput = Field(default_factory=HoofInput)
    commercial: CommercialInput = Field(default_factory=CommercialInput)
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Output sub-models ────────────────────────────────────────────────────────

class ScoreWithConfidence(BaseModel):
    """Standard score envelope."""

    score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1, default=0.55)
    components: dict[str, float] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class DistancePrediction(BaseModel):
    """Racing distance suitability indices."""

    sprint: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    mile: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    classic: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    stayer: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    recommended: Optional[str] = None


class SurfacePrediction(BaseModel):
    """Surface suitability."""

    turf: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    dirt: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    synthetic: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))
    national_hunt: ScoreWithConfidence = Field(default_factory=lambda: ScoreWithConfidence(score=50.0))


class RoiResult(BaseModel):
    """ROI analysis output."""

    score: ScoreWithConfidence
    investment_grade: str = "Moderate"
    risk_level: str = "Medium"


class LongevityResult(BaseModel):
    """Longevity / soundness output."""

    score: ScoreWithConfidence
    risk_level: str = "Medium"
    risk_components: dict[str, float] = Field(default_factory=dict)


class ScoringOutput(BaseModel):
    """Final structured engine output — consumed by frontend & reports."""

    overall_score: float
    elite_potential: float
    confidence: float
    biomechanics: ScoreWithConfidence
    pedigree: ScoreWithConfidence
    conformation: ScoreWithConfidence
    behaviour: ScoreWithConfidence
    hoof: ScoreWithConfidence
    commercial: ScoreWithConfidence
    bpi: ScoreWithConfidence
    roi: RoiResult
    longevity: LongevityResult
    distance_prediction: DistancePrediction
    surface_prediction: SurfacePrediction
    g1_potential: ScoreWithConfidence
    recommendation: str
    risk_profile: str
    buying_recommendation: str
    report_version: str = "scientific_scoring_v1"
    raw_breakdown: dict[str, Any] = Field(default_factory=dict)
