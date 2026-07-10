"""Report JSON formatter — structured output for frontend & PDF pipeline."""

from __future__ import annotations

from typing import Any

from .models import ScoringInput, ScoringOutput


def format_report(output: ScoringOutput, input_data: ScoringInput) -> dict[str, Any]:
    """Serialize ScoringOutput to frontend-ready JSON dict.

    Never returns HTML — only structured data.
    """
    from inspection_ai.domain.versioning import scoring_audit_metadata

    payload = output.model_dump(mode="json")
    payload.update(scoring_audit_metadata())
    payload["inspection_id"] = input_data.metadata.get("inspection_id")
    return payload


def format_summary(output: ScoringOutput) -> dict[str, Any]:
    """Compact summary for API list views."""
    return {
        "overall_score": output.overall_score,
        "elite_potential": output.elite_potential,
        "bpi": output.bpi.score,
        "confidence": output.confidence,
        "recommendation": output.recommendation,
        "risk_profile": output.risk_profile,
        "g1_tier": output.g1_potential.notes[0] if output.g1_potential.notes else None,
    }
