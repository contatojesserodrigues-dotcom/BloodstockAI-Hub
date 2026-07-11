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

    def merge_intelligence_bundle(
        self,
        inspection_id: str,
        user_id: str,
        partial: dict[str, Any],
    ) -> dict[str, Any]:
        analysis = self.get_analysis(inspection_id, user_id)
        current = (analysis or {}).get("intelligence_bundle") or {}
        merged = {**current, **partial, "updated_at": partial.get("updated_at")}
        self.update_analysis_scores(
            inspection_id,
            user_id,
            {"intelligence_bundle": merged},
        )
        return merged

    def upsert_pedigree_analysis(
        self,
        inspection_id: str,
        sire: Optional[str] = None,
        dam: Optional[str] = None,
        damsire: Optional[str] = None,
        pedigree_intelligence_score: Optional[float] = None,
        extraction_json: Optional[dict[str, Any]] = None,
        analysis_json: Optional[dict[str, Any]] = None,
        maternal_family: Optional[str] = None,
        black_type_summary: Optional[str] = None,
    ) -> None:
        row = {
            "analysis_id": inspection_id,
            "sire": sire,
            "dam": dam,
            "damsire": damsire,
            "pedigree_intelligence_score": pedigree_intelligence_score,
            "extraction_json": extraction_json or {},
            "analysis_json": analysis_json or {},
            "maternal_family": maternal_family,
            "black_type_summary": black_type_summary,
        }
        existing = self.client.select_one(
            "inspection_pedigree_analysis",
            {"analysis_id": inspection_id},
        )
        if existing:
            self.client.update(
                "inspection_pedigree_analysis",
                {"analysis_id": inspection_id},
                {k: v for k, v in row.items() if k != "analysis_id"},
            )
        else:
            self.client.insert("inspection_pedigree_analysis", row)
