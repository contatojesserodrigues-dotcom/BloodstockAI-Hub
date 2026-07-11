"""Intelligence Framework orchestrator — runs all 10 modules."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.intelligence_framework.decision import build_decision_narrative
from inspection_ai.intelligence_framework.m01_identity import build_identity_context
from inspection_ai.intelligence_framework.m02_pedigree import compute_pedigree_module
from inspection_ai.intelligence_framework.m03_commercial import compute_commercial_appeal
from inspection_ai.intelligence_framework.m07_risk import compute_risk_assessment, pedigree_risk_from_module
from inspection_ai.intelligence_framework.m09_final_score import calculate_final_horse_score
from inspection_ai.intelligence_framework.m10_market import compute_framework_market_estimate
from inspection_ai.scoring.models import ScoringInput, ScoringOutput


class IntelligenceOrchestrator:
    """BloodstockAI Intelligence Framework v1.0 — decision engine."""

    FRAMEWORK_VERSION = "1.0.0"

    def run(
        self,
        scoring_input: ScoringInput,
        scoring_output: ScoringOutput,
        research: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Execute framework modules and return unified JSON bundle."""
        research = research or scoring_input.metadata.get("pedigree_research") or {}

        # M1 — Identity
        identity = build_identity_context(scoring_input.horse.model_dump())

        # M2 — Pedigree Intelligence
        ped_input = scoring_input.pedigree.model_dump()
        pedigree_module = compute_pedigree_module(research, ped_input)

        # M3 — Commercial
        commercial = compute_commercial_appeal(
            pedigree_module,
            research,
            scoring_output.commercial.score,
        )

        # M4/M5/M6 — delegate to scoring engine outputs
        physical = {
            "conformation_score": scoring_output.conformation.score,
            "conformation_components": scoring_output.conformation.components,
            "biomechanics_score": scoring_output.biomechanics.score,
            "biomechanics_components": scoring_output.biomechanics.components,
            "behaviour_score": scoring_output.behaviour.score,
            "hoof_score": scoring_output.hoof.score,
        }

        # M7 — Risk
        structural_risk = max(0.0, 100.0 - scoring_output.conformation.score)
        movement_risk = max(0.0, 100.0 - scoring_output.biomechanics.components.get("motion_symmetry", scoring_output.biomechanics.score))
        hoof_risk = max(0.0, 100.0 - scoring_output.hoof.score)
        ped_risk = pedigree_risk_from_module(pedigree_module)
        risk = compute_risk_assessment(structural_risk, movement_risk, ped_risk, hoof_risk)

        # M8 — Racing prediction (from scoring output)
        distance = scoring_output.distance_prediction.model_dump(mode="json")

        # M9 — Final score (category-weighted)
        durability = scoring_output.longevity.score.score if scoring_output.longevity else None
        final = calculate_final_horse_score(
            category=identity["category"],
            biomechanics=scoring_output.biomechanics.score,
            pedigree=pedigree_module["composite_score"],
            conformation=scoring_output.conformation.score,
            behaviour=scoring_output.behaviour.score,
            commercial=commercial["score"],
            durability=100.0 - (durability or 50.0) if durability is not None else None,
        )

        # M10 — Market estimate
        family_score = (pedigree_module.get("family") or {}).get("score", 55)
        market = compute_framework_market_estimate(
            category=identity["category"],
            pedigree_score=pedigree_module["composite_score"],
            family_score=family_score,
            biomechanics_score=scoring_output.biomechanics.score,
            conformation_score=scoring_output.conformation.score,
            commercial_score=commercial["score"],
            risk_adjustment_factor=risk["risk_adjustment_factor"],
            region=scoring_input.horse.region,
            auction=scoring_input.metadata.get("auction_name"),
        )

        decision = build_decision_narrative(
            identity, pedigree_module, commercial, risk, final, distance, market
        )

        return {
            "framework_version": self.FRAMEWORK_VERSION,
            "modules": {
                "m01_identity": identity,
                "m02_pedigree": pedigree_module,
                "m03_commercial": commercial,
                "m04_physical": physical,
                "m05_biomechanics": {
                    "score": scoring_output.biomechanics.score,
                    "components": scoring_output.biomechanics.components,
                    "raw_breakdown": scoring_output.raw_breakdown,
                },
                "m06_behaviour": {
                    "score": scoring_output.behaviour.score,
                    "components": scoring_output.behaviour.components,
                },
                "m07_risk": risk,
                "m08_racing_prediction": distance,
                "m09_final_score": final,
                "m10_market": market,
            },
            "decision": decision,
            "learning_record": {
                "initial_analysis": final["overall_score"],
                "predicted_market": market["most_likely_price"],
                "category": identity["category"],
                "ready_for_ml": True,
            },
        }
