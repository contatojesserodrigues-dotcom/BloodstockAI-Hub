"""Inspection persistence — raw metrics, calculated scores, versioning."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.infrastructure.supabase_client import SupabaseRestClient


class InspectionRepository:
    """Read/write inspection data via Supabase PostgREST."""

    def __init__(self, client: Optional[SupabaseRestClient] = None) -> None:
        self.client = client or SupabaseRestClient()

    def get_analysis(self, inspection_id: str, user_id: Optional[str] = None) -> Optional[dict[str, Any]]:
        filters: dict[str, str] = {"id": inspection_id}
        if user_id:
            filters["user_id"] = user_id
        return self.client.select_one("inspection_analyses", filters)

    def get_blocks(self, inspection_id: str) -> list[dict[str, Any]]:
        return self.client.select_many(
            "inspection_blocks",
            {"analysis_id": inspection_id},
            order="created_at.asc",
        )

    def get_biomechanical_metrics(self, inspection_id: str) -> list[dict[str, Any]]:
        return self.client.select_many(
            "inspection_biomechanical_metrics",
            {"analysis_id": inspection_id},
            order="created_at.asc",
        )

    def save_scoring_run(
        self,
        inspection_id: str,
        user_id: str,
        raw_metrics: dict[str, Any],
        calculated_metrics: dict[str, Any],
        scores: dict[str, Any],
        scientific_version: dict[str, str],
        final_report: dict[str, Any],
    ) -> dict[str, Any]:
        row = {
            "inspection_id": inspection_id,
            "user_id": user_id,
            "raw_metrics": raw_metrics,
            "calculated_metrics": calculated_metrics,
            "scores": scores,
            "scientific_version": scientific_version,
            "final_report": final_report,
        }
        return self.client.insert("inspection_scoring_runs", row)

    def update_analysis_scores(
        self,
        inspection_id: str,
        user_id: str,
        patch: dict[str, Any],
    ) -> None:
        self.client.update(
            "inspection_analyses",
            {"id": inspection_id, "user_id": user_id},
            patch,
        )

    def save_report(self, inspection_id: str, user_id: str, report_json: dict[str, Any]) -> None:
        self.client.insert(
            "inspection_reports",
            {
                "analysis_id": inspection_id,
                "user_id": user_id,
                "report_type": "scientific",
                "report_json": report_json,
            },
        )
