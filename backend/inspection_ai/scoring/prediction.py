"""Prediction engines — distance, surface, elite / group potential."""

from __future__ import annotations

from .confidence import aggregate_confidence
from .constants import G1_TIERS, LONGEVITY_RISK_WEIGHTS, ROI_WEIGHTS
from .models import (
    CommercialInput,
    DistancePrediction,
    LongevityResult,
    PedigreeInput,
    RoiResult,
    ScoreWithConfidence,
    ScoringInput,
    SurfacePrediction,
)
from .normalization import clamp


def g1_tier_label(score: float) -> str:
    """Map score to G1 tier label."""
    for threshold, label in G1_TIERS:
        if score >= threshold:
            return label
    return G1_TIERS[-1][1]


def calculate_g1_potential(
    biomechanics: float,
    pedigree: float,
    conformation: float,
    behaviour: float,
    commercial: float,
    confidence: float,
) -> ScoreWithConfidence:
    """G1 / Horse Intelligence Score.

    Formula:
        Bio×0.35 + Ped×0.25 + Conf×0.20 + Beh×0.10 + Com×0.10
    """
    score = clamp(
        biomechanics * 0.35
        + pedigree * 0.25
        + conformation * 0.20
        + behaviour * 0.10
        + commercial * 0.10
    )
    return ScoreWithConfidence(
        score=score,
        confidence=confidence,
        components={},
        notes=[g1_tier_label(score)],
    )


def calculate_distance_prediction(
    speed: float,
    frequency: float,
    explosiveness: float,
    stride: float,
    efficiency: float,
    balance: float,
    stamina_pedigree: float,
    energy_economy: float,
    heart_proxy: float,
    pedigree: float,
    confidence: float,
) -> DistancePrediction:
    """Racing distance model — Sprint / Mile / Classic / Stayer indices."""
    sprint = clamp(speed * 0.5 + frequency * 0.3 + explosiveness * 0.2)
    mile = clamp(speed * 0.3 + stride * 0.4 + efficiency * 0.3)
    classic = clamp(stride * 0.3 + balance * 0.3 + stamina_pedigree * 0.4)
    stayer = clamp(energy_economy * 0.4 + heart_proxy * 0.3 + pedigree * 0.3)

    conf = ScoreWithConfidence(score=0, confidence=confidence)
    values = {"sprint": sprint, "mile": mile, "classic": classic, "stayer": stayer}
    best = max(values, key=values.get)  # type: ignore[arg-type]
    recommended_map = {
        "sprint": "1000–1400m (sprint)",
        "mile": "1400–1800m (mile)",
        "classic": "1800–2200m (classic)",
        "stayer": "2200m+ (stayer)",
    }

    return DistancePrediction(
        sprint=ScoreWithConfidence(score=sprint, confidence=confidence),
        mile=ScoreWithConfidence(score=mile, confidence=confidence),
        classic=ScoreWithConfidence(score=classic, confidence=confidence),
        stayer=ScoreWithConfidence(score=stayer, confidence=confidence),
        recommended=recommended_map.get(best),
    )


def calculate_surface_prediction(
    category: str | None,
    pedigree: PedigreeInput,
    conformation_balance: float,
    confidence: float,
) -> SurfacePrediction:
    """Surface suitability — Turf / Dirt / Synthetic / NH."""
    stamina = pedigree.stamina_index or 50.0
    speed = pedigree.speed_index or 50.0
    is_nh = bool(category and "NH" in category.upper())

    turf = clamp(stamina * 0.5 + conformation_balance * 0.3 + speed * 0.2)
    dirt = clamp(speed * 0.5 + conformation_balance * 0.25 + stamina * 0.25)
    synthetic = clamp((turf + dirt) / 2.0)
    nh = clamp(stamina * 0.6 + conformation_balance * 0.4) if is_nh else clamp(stamina * 0.4 + 30.0)

    c = confidence
    return SurfacePrediction(
        turf=ScoreWithConfidence(score=turf, confidence=c),
        dirt=ScoreWithConfidence(score=dirt, confidence=c),
        synthetic=ScoreWithConfidence(score=synthetic, confidence=c),
        national_hunt=ScoreWithConfidence(score=nh, confidence=c),
    )


def calculate_longevity(
    asymmetry_risk: float,
    conformation_risk: float,
    hoof_risk: float,
    movement_risk: float,
    confidence: float,
) -> LongevityResult:
    """Longevity Score = 100 − weighted risk."""
    total_risk = clamp(
        asymmetry_risk * LONGEVITY_RISK_WEIGHTS["asymmetry"]
        + conformation_risk * LONGEVITY_RISK_WEIGHTS["conformation"]
        + hoof_risk * LONGEVITY_RISK_WEIGHTS["hoof"]
        + movement_risk * LONGEVITY_RISK_WEIGHTS["movement"]
    )
    score = clamp(100.0 - total_risk)
    risk_level = "Low" if score >= 75 else "Medium" if score >= 55 else "High"
    return LongevityResult(
        score=ScoreWithConfidence(
            score=score,
            confidence=confidence,
            components={
                "asymmetry_risk": asymmetry_risk,
                "conformation_risk": conformation_risk,
                "hoof_risk": hoof_risk,
                "movement_risk": movement_risk,
                "total_risk": total_risk,
            },
        ),
        risk_level=risk_level,
        risk_components={
            "asymmetry": asymmetry_risk,
            "conformation": conformation_risk,
            "hoof": hoof_risk,
            "movement": movement_risk,
        },
    )


def calculate_roi(
    performance_potential: float,
    pedigree_value: float,
    market_demand: float,
    risk_adjustment: float,
    commercial: CommercialInput,
    confidence: float,
) -> RoiResult:
    """ROI Score for buyers."""
    score = clamp(
        performance_potential * ROI_WEIGHTS["performance_potential"]
        + pedigree_value * ROI_WEIGHTS["pedigree_value"]
        + market_demand * ROI_WEIGHTS["market_demand"]
        + risk_adjustment * ROI_WEIGHTS["risk_adjustment"]
    )
    grade = "Strong" if score >= 80 else "Good" if score >= 65 else "Moderate" if score >= 50 else "Cautious"
    risk = "Low" if risk_adjustment >= 75 else "Medium" if risk_adjustment >= 55 else "High"
    return RoiResult(
        score=ScoreWithConfidence(score=score, confidence=confidence),
        investment_grade=grade,
        risk_level=risk,
    )


def buying_recommendation(overall: float, roi: float, longevity: float) -> str:
    """Human-readable buying recommendation string."""
    if overall >= 85 and roi >= 75:
        return "High Commercial & Racing Potential"
    if overall >= 75:
        return "Strong Racing Prospect — verify vet"
    if overall >= 65:
        return "Commercial / Racing Prospect — price sensitive"
    if longevity < 55:
        return "Caution — elevated longevity risk"
    return "High Uncertainty — insufficient data or below threshold"
