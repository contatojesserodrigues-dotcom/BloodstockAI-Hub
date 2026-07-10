"""Scientific Scoring Engine — main orchestrator."""

from __future__ import annotations

import logging
from typing import Any

from .behaviour import calculate_behaviour_score
from .biomechanics import (
    biomechanics_to_score_with_confidence,
    calculate_biomechanics_score,
    calculate_stride_efficiency,
    calculate_stride_frequency,
    calculate_stride_length,
    calculate_symmetry,
    calculate_joint_efficiency,
)
from .confidence import aggregate_confidence
from .conformation import calculate_conformation_score
from .constants import FINAL_SCORE_WEIGHTS
from .hoof import calculate_hoof_score
from .models import (
    BiomechanicsInput,
    BehaviourInput,
    CommercialInput,
    ConformationInput,
    HoofInput,
    PedigreeInput,
    ScoreWithConfidence,
    ScoringInput,
    ScoringOutput,
)
from .normalization import clamp
from .pedigree import calculate_pedigree_score
from .prediction import (
    buying_recommendation,
    calculate_distance_prediction,
    calculate_g1_potential,
    calculate_longevity,
    calculate_roi,
    calculate_surface_prediction,
    g1_tier_label,
)
from .report_formatter import format_report
from .validators import validate_input

logger = logging.getLogger(__name__)


class ScientificScoringEngine:
    """BloodstockAI Scientific Scoring Engine.

    Receives structured metrics from CV / pedigree / conformation modules
    and produces standardized 0–100 scores with confidence intervals.

    All methods return Pydantic models serializable to JSON.
    """

    def __init__(self) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)

    # ── Biomechanics sub-methods ───────────────────────────────────────────

    def calculate_stride_score(self, data: BiomechanicsInput) -> dict[str, float]:
        """Stride length + frequency + efficiency sub-scores."""
        length_m, length_score = calculate_stride_length(data)
        freq, freq_score = calculate_stride_frequency(data)
        efficiency = calculate_stride_efficiency(length_score, freq_score)
        return {
            "stride_length_m": length_m,
            "stride_length_score": length_score,
            "stride_frequency": freq,
            "frequency_score": freq_score,
            "stride_efficiency": efficiency,
        }

    def calculate_symmetry_score(self, data: BiomechanicsInput) -> dict[str, float]:
        """Motion symmetry from left/right stride data."""
        asymmetry, symmetry = calculate_symmetry(data)
        return {"asymmetry_pct": asymmetry, "motion_symmetry": symmetry}

    def calculate_joint_score(self, data: BiomechanicsInput) -> dict[str, float]:
        """Joint efficiency breakdown."""
        score, components = calculate_joint_efficiency(data)
        return {"joint_efficiency": score, **components}

    def calculate_biomechanics_score(
        self,
        data: BiomechanicsInput,
        body_mass_factor: float = 1.0,
    ) -> ScoreWithConfidence:
        """Full BPI biomechanics score."""
        return biomechanics_to_score_with_confidence(data, body_mass_factor)

    # ── Domain scores ──────────────────────────────────────────────────────

    def calculate_pedigree_score(self, data: PedigreeInput) -> ScoreWithConfidence:
        return calculate_pedigree_score(data)

    def calculate_conformation_score(self, data: ConformationInput) -> ScoreWithConfidence:
        return calculate_conformation_score(data)

    def calculate_behaviour_score(self, data: BehaviourInput) -> ScoreWithConfidence:
        return calculate_behaviour_score(data)

    def calculate_hoof_score(self, data: HoofInput) -> ScoreWithConfidence:
        return calculate_hoof_score(data)

    # ── Predictions ────────────────────────────────────────────────────────

    def calculate_g1_potential(
        self,
        biomechanics: float,
        pedigree: float,
        conformation: float,
        behaviour: float,
        commercial: float,
        confidence: float,
    ) -> ScoreWithConfidence:
        return calculate_g1_potential(
            biomechanics, pedigree, conformation, behaviour, commercial, confidence
        )

    def calculate_roi(
        self,
        performance: float,
        pedigree: float,
        market: float,
        risk_adj: float,
        commercial: CommercialInput,
        confidence: float,
    ):
        return calculate_roi(performance, pedigree, market, risk_adj, commercial, confidence)

    def calculate_longevity(
        self,
        asymmetry_risk: float,
        conformation_risk: float,
        hoof_risk: float,
        movement_risk: float,
        confidence: float,
    ):
        return calculate_longevity(asymmetry_risk, conformation_risk, hoof_risk, movement_risk, confidence)

    # ── Full pipeline ──────────────────────────────────────────────────────

    def score(self, payload: dict[str, Any] | ScoringInput) -> ScoringOutput:
        """Run complete scoring pipeline on validated input."""
        data = payload if isinstance(payload, ScoringInput) else validate_input(payload)
        return self._build_output(data)

    def generate_final_report(self, payload: dict[str, Any] | ScoringInput) -> dict[str, Any]:
        """Generate JSON report dict for frontend / PDF generator."""
        output = self.score(payload)
        data = payload if isinstance(payload, ScoringInput) else validate_input(payload)
        return format_report(output, data)

    def _build_output(self, data: ScoringInput) -> ScoringOutput:
        mass_factor = 1.0
        if data.horse.body_mass_kg and data.horse.body_mass_kg > 0:
            mass_factor = data.horse.body_mass_kg / 500.0

        bio = self.calculate_biomechanics_score(data.biomechanics, mass_factor)
        ped = self.calculate_pedigree_score(data.pedigree)
        conf = self.calculate_conformation_score(data.conformation)
        beh = self.calculate_behaviour_score(data.behaviour)
        hoof = self.calculate_hoof_score(data.hoof)

        commercial_score = clamp(
            data.commercial.commercial_profile
            if data.commercial.commercial_profile is not None
            else data.commercial.market_demand
            if data.commercial.market_demand is not None
            else (conf.score + ped.score + bio.score) / 3.0
        )
        commercial = ScoreWithConfidence(
            score=commercial_score,
            confidence=aggregate_confidence([
                (data.commercial.commercial_profile, 1.0),
                (data.commercial.market_demand, 0.8),
            ]),
        )

        overall = clamp(
            bio.score * FINAL_SCORE_WEIGHTS["biomechanics"]
            + ped.score * FINAL_SCORE_WEIGHTS["pedigree"]
            + conf.score * FINAL_SCORE_WEIGHTS["conformation"]
            + beh.score * FINAL_SCORE_WEIGHTS["behaviour"]
            + commercial.score * FINAL_SCORE_WEIGHTS["commercial"]
        )

        module_confidences = [bio.confidence, ped.confidence, conf.confidence, beh.confidence, hoof.confidence]
        global_confidence = round(sum(module_confidences) / len(module_confidences), 3)

        g1 = self.calculate_g1_potential(
            bio.score, ped.score, conf.score, beh.score, commercial.score, global_confidence
        )
        g1.notes = [g1_tier_label(g1.score)]

        bd = calculate_biomechanics_score(data.biomechanics, mass_factor)
        distance = calculate_distance_prediction(
            speed=bio.components.get("power_score", bio.score),
            frequency=bio.components.get("frequency_score", 50.0),
            explosiveness=bio.components.get("power_score", 50.0),
            stride=bio.components.get("stride_efficiency", 50.0),
            efficiency=bio.components.get("stride_efficiency", 50.0),
            balance=conf.components.get("balance", 50.0),
            stamina_pedigree=ped.components.get("stamina_index", 50.0),
            energy_economy=bio.components.get("energy_economy", 50.0),
            heart_proxy=clamp(100.0 - bd.asymmetry_pct * 5.0),
            pedigree=ped.score,
            confidence=global_confidence,
        )

        surface = calculate_surface_prediction(
            data.horse.category,
            data.pedigree,
            conf.components.get("balance", 50.0),
            global_confidence,
        )

        longevity = self.calculate_longevity(
            asymmetry_risk=clamp(100.0 - bio.components.get("motion_symmetry", 50.0)),
            conformation_risk=clamp(100.0 - conf.score),
            hoof_risk=clamp(100.0 - hoof.score),
            movement_risk=clamp(100.0 - bio.components.get("movement_consistency", 50.0)),
            confidence=global_confidence,
        )

        roi = self.calculate_roi(
            overall,
            ped.score,
            commercial.score,
            longevity.score.score,
            data.commercial,
            global_confidence,
        )

        recommendation = buying_recommendation(overall, roi.score.score, longevity.score.score)
        risk_profile = longevity.risk_level

        bpi = ScoreWithConfidence(
            score=bio.score,
            confidence=bio.confidence,
            components=bio.components,
        )

        self.logger.info(
            "Scored horse=%s overall=%.1f bpi=%.1f confidence=%.2f",
            data.horse.name,
            overall,
            bio.score,
            global_confidence,
        )

        return ScoringOutput(
            overall_score=overall,
            elite_potential=g1.score,
            confidence=global_confidence,
            biomechanics=bio,
            pedigree=ped,
            conformation=conf,
            behaviour=beh,
            hoof=hoof,
            commercial=commercial,
            bpi=bpi,
            roi=roi,
            longevity=longevity,
            distance_prediction=distance,
            surface_prediction=surface,
            g1_potential=g1,
            recommendation=recommendation,
            risk_profile=risk_profile,
            buying_recommendation=recommendation,
            raw_breakdown={
                "stride": self.calculate_stride_score(data.biomechanics),
                "symmetry": self.calculate_symmetry_score(data.biomechanics),
                "joints": self.calculate_joint_score(data.biomechanics),
            },
        )
