"""Inspection scoring application service."""

from __future__ import annotations

import logging
from typing import Any, Optional

from inspection_ai.api.models import InspectionScoreRequest, InspectionScoreResponse, RecommendationsBlock
from inspection_ai.application.payload_assembler import assemble_scoring_input
from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION, scoring_audit_metadata
from inspection_ai.infrastructure.repositories.inspection_repository import InspectionRepository
from inspection_ai.scoring import ScientificScoringEngine
from inspection_ai.scoring.models import ScoringInput

logger = logging.getLogger(__name__)


class InspectionScoringService:
    """Orchestrates load → validate → score → persist."""

    def __init__(
        self,
        engine: Optional[ScientificScoringEngine] = None,
        repository: Optional[InspectionRepository] = None,
    ) -> None:
        self.engine = engine or ScientificScoringEngine()
        self.repository = repository or InspectionRepository()

    def score_inspection(self, request: InspectionScoreRequest) -> InspectionScoreResponse:
        """Run full scoring pipeline for an inspection."""
        analysis = self.repository.get_analysis(request.inspection_id, request.user_id)
        if not analysis:
            raise ValueError(f"Inspection not found: {request.inspection_id}")

        user_id = request.user_id or str(analysis.get("user_id", ""))
        blocks = self.repository.get_blocks(request.inspection_id)
        biomech = self.repository.get_biomechanical_metrics(request.inspection_id)

        overrides = {
            "horse": request.horse,
            "pedigree": request.pedigree,
            "biomechanics": request.biomechanics,
            "conformation": request.conformation,
            "behaviour": request.behaviour,
            "hoof": request.hoof,
            "commercial": request.commercial,
            "metadata": request.metadata,
        }

        scoring_input = assemble_scoring_input(analysis, blocks, biomech, overrides)
        raw_metrics = scoring_input.model_dump(mode="json")

        output = self.engine.score(scoring_input)
        full_report = self.engine.generate_final_report(scoring_input)
        audit = scoring_audit_metadata()

        response = self._to_response(request.inspection_id, output, full_report, audit)

        if request.persist and self.repository.client.enabled:
            self._persist(
                inspection_id=request.inspection_id,
                user_id=user_id,
                raw_metrics=raw_metrics,
                calculated_metrics=output.raw_breakdown,
                scores=full_report,
                scientific_version=audit["scientific_version"],
                final_report=full_report,
                response=response,
            )

        logger.info(
            "Scored inspection=%s overall=%.1f version=%s",
            request.inspection_id,
            response.overall_score,
            audit["scientific_version"]["engine"],
        )
        return response

    def score_payload(self, payload: dict[str, Any]) -> InspectionScoreResponse:
        """Score explicit payload without DB load (testing / direct API)."""
        request = InspectionScoreRequest.model_validate({**payload, "persist": False})
        if not payload.get("inspection_id"):
            raise ValueError("inspection_id required")
        scoring_input = ScoringInput.model_validate({
            "horse": request.horse,
            "pedigree": request.pedigree,
            "biomechanics": request.biomechanics,
            "conformation": request.conformation,
            "behaviour": request.behaviour,
            "hoof": request.hoof,
            "commercial": request.commercial,
            "metadata": request.metadata,
        })
        output = self.engine.score(scoring_input)
        full_report = self.engine.generate_final_report(scoring_input)
        audit = scoring_audit_metadata()
        return self._to_response(request.inspection_id, output, full_report, audit)

    def _to_response(
        self,
        inspection_id: str,
        output: Any,
        full_report: dict[str, Any],
        audit: dict[str, Any],
    ) -> InspectionScoreResponse:
        g1_note = output.g1_potential.notes[0] if output.g1_potential.notes else None
        recommendations = RecommendationsBlock(
            buying=output.recommendation,
            risk_profile=output.risk_profile,
            roi_score=output.roi.score.score,
            roi_grade=output.roi.investment_grade,
            longevity_score=output.longevity.score.score,
            longevity_risk=output.longevity.risk_level,
            distance_recommended=output.distance_prediction.recommended,
            g1_tier=g1_note,
        )
        return InspectionScoreResponse(
            inspection_id=inspection_id,
            overall_score=output.overall_score,
            elite_potential=output.elite_potential,
            confidence=output.confidence,
            biomechanics=output.biomechanics.model_dump(mode="json"),
            pedigree=output.pedigree.model_dump(mode="json"),
            conformation=output.conformation.model_dump(mode="json"),
            behaviour=output.behaviour.model_dump(mode="json"),
            hoof=output.hoof.model_dump(mode="json"),
            commercial=output.commercial.model_dump(mode="json"),
            recommendations=recommendations,
            scientific_version=audit["scientific_version"],
            scored_at=audit["scored_at"],
            report=full_report,
        )

    def _persist(
        self,
        inspection_id: str,
        user_id: str,
        raw_metrics: dict[str, Any],
        calculated_metrics: dict[str, Any],
        scores: dict[str, Any],
        scientific_version: dict[str, str],
        final_report: dict[str, Any],
        response: InspectionScoreResponse,
    ) -> None:
        run = self.repository.save_scoring_run(
            inspection_id=inspection_id,
            user_id=user_id,
            raw_metrics=raw_metrics,
            calculated_metrics=calculated_metrics,
            scores=scores,
            scientific_version=scientific_version,
            final_report=final_report,
        )

        engine_label = f"scientific_scoring_{scientific_version['engine']}"
        patch = {
            "consolidated_score": response.overall_score,
            "elite_potential_score": response.elite_potential,
            "biomechanics_score": response.biomechanics.get("score"),
            "pedigree_intelligence_score": response.pedigree.get("score"),
            "conformation_score": response.conformation.get("score"),
            "behaviour_score": response.behaviour.get("score"),
            "hoof_health_score": response.hoof.get("score"),
            "soundness_risk": response.recommendations.longevity_risk,
            "intelligence_scores": final_report,
            "raw_metrics_json": raw_metrics,
            "calculated_metrics_json": calculated_metrics,
            "scientific_version_json": scientific_version,
            "last_scoring_run_id": run.get("id"),
            "roi_projection": final_report.get("roi"),
            "distance_profile": final_report.get("distance_prediction"),
            "g1_potential_index": {
                "score": response.elite_potential,
                "tier_label": response.recommendations.g1_tier,
            },
            "engine_version": engine_label,
            "processing_status": "complete",
        }
        self.repository.update_analysis_scores(inspection_id, user_id, patch)
        self.repository.save_report(inspection_id, user_id, final_report)

        from inspection_ai.report_engine import build_intelligence_bundle

        bundle = build_intelligence_bundle(
            scores=final_report,
            prediction={
                "g1_potential": final_report.get("g1_potential"),
                "distance_prediction": final_report.get("distance_prediction"),
                "roi": final_report.get("roi"),
            },
            biomechanics={"score": response.biomechanics.get("score")},
        )
        self.repository.merge_intelligence_bundle(inspection_id, user_id, bundle)
