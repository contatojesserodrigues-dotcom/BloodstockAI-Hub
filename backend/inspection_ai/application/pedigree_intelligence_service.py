"""Pedigree Intelligence application service."""

from __future__ import annotations

import logging
from typing import Any, Optional

from inspection_ai.api.models import PedigreeIntelligenceRequest, PedigreeIntelligenceResponse
from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION
from inspection_ai.infrastructure.repositories.inspection_repository import InspectionRepository
from inspection_ai.pedigree_engine import compute_pedigree_intelligence, research_to_pedigree_input
from inspection_ai.report_engine import build_intelligence_bundle

logger = logging.getLogger(__name__)


class PedigreeIntelligenceService:
    """Research JSON → pedigree intelligence scores → DB persistence."""

    def __init__(self, repository: Optional[InspectionRepository] = None) -> None:
        self.repository = repository or InspectionRepository()

    def compute(self, request: PedigreeIntelligenceRequest) -> PedigreeIntelligenceResponse:
        intelligence = compute_pedigree_intelligence(request.research)
        pedigree_input = research_to_pedigree_input(request.research, intelligence)

        response = PedigreeIntelligenceResponse(
            inspection_id=request.inspection_id,
            intelligence=intelligence,
            pedigree_input=pedigree_input,
            engine_version=intelligence.get("engine_version", "1.0.0"),
        )

        if request.persist and self.repository.client.enabled:
            self._persist(request.inspection_id, request.user_id, request.research, intelligence, pedigree_input)

        return response

    def _persist(
        self,
        inspection_id: str,
        user_id: Optional[str],
        research: dict[str, Any],
        intelligence: dict[str, Any],
        pedigree_input: dict[str, Any],
    ) -> None:
        analysis = self.repository.get_analysis(inspection_id, user_id)
        if not analysis:
            raise ValueError(f"Inspection not found: {inspection_id}")
        uid = user_id or str(analysis.get("user_id", ""))

        merged_research = {**(analysis.get("pedigree_research") or {}), **research}
        merged_research["pedigree_rating"] = intelligence.get("pedigree_rating")
        merged_research["pedigree_score"] = intelligence.get("pedigree_score")
        merged_research["nick_rating"] = intelligence.get("nick_rating")
        merged_research["components"] = intelligence.get("components")
        merged_research["intelligence"] = intelligence

        patch = {
            "pedigree_research": merged_research,
            "pedigree_intelligence_score": intelligence.get("pedigree_score"),
        }
        self.repository.update_analysis_scores(inspection_id, uid, patch)

        self.repository.upsert_pedigree_analysis(
            inspection_id=inspection_id,
            sire=(research.get("sire") or {}).get("name") if isinstance(research.get("sire"), dict) else None,
            dam=(research.get("dam") or {}).get("name") if isinstance(research.get("dam"), dict) else None,
            damsire=(research.get("damsire") or {}).get("name") if isinstance(research.get("damsire"), dict) else None,
            pedigree_intelligence_score=intelligence.get("pedigree_score"),
            analysis_json=intelligence,
            extraction_json=pedigree_input,
        )

        bundle = build_intelligence_bundle(
            pedigree={"research": merged_research, "intelligence": intelligence},
            scores={"pedigree_input": pedigree_input},
        )
        self.repository.merge_intelligence_bundle(inspection_id, uid, bundle)

        logger.info(
            "Pedigree intelligence persisted inspection=%s rating=%.1f",
            inspection_id,
            intelligence.get("pedigree_rating", 0),
        )
