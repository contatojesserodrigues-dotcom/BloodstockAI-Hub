"""FastAPI endpoint tests."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from inspection_ai.api.main import create_app

client = TestClient(create_app())

FIXTURE = {
    "horse": {"name": "API Test Horse", "category": "FLAT_YEARLING"},
    "biomechanics": {
        "distance_m": 80,
        "stride_count": 10,
        "duration_sec": 5,
        "left_stride_m": 7.8,
        "right_stride_m": 8.2,
        "hock_extension_deg": 150,
        "shoulder_rom_deg": 32,
    },
    "pedigree": {"sire_performance": 85, "dam_performance": 78, "black_type_score": 72},
    "conformation": {"balance": 80, "leg_alignment_deviation_deg": 2},
    "commercial": {"commercial_profile": 78},
}


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_score_v1():
    with patch("inspection_ai.api.routers.inspection_router._service.score_inspection") as mock:
        from inspection_ai.api.models import InspectionScoreResponse, RecommendationsBlock

        mock.return_value = InspectionScoreResponse(
            inspection_id="test-id",
            overall_score=80,
            elite_potential=80,
            confidence=0.9,
            biomechanics={"score": 80},
            pedigree={"score": 75},
            conformation={"score": 78},
            behaviour={"score": 55},
            hoof={"score": 50},
            commercial={"score": 70},
            recommendations=RecommendationsBlock(),
            scientific_version={"engine": "1.0.0"},
            scored_at="2026-07-11T00:00:00+00:00",
        )
        res = client.post("/api/v1/inspection/score", json={
            "inspection_id": "test-id",
            "persist": False,
        })
        assert res.status_code == 200
        assert res.json()["overall_score"] == 80


def test_legacy_score_v1():
    with patch("inspection_ai.application.inspection_scoring_service.InspectionScoringService.score_inspection") as mock:
        from inspection_ai.api.models import InspectionScoreResponse, RecommendationsBlock

        mock.return_value = InspectionScoreResponse(
            inspection_id="test-id",
            overall_score=80,
            elite_potential=80,
            confidence=0.9,
            biomechanics={"score": 80},
            pedigree={"score": 75},
            conformation={"score": 78},
            behaviour={"score": 55},
            hoof={"score": 50},
            commercial={"score": 70},
            recommendations=RecommendationsBlock(),
            scientific_version={"engine": "1.0.0"},
            scored_at="2026-07-11T00:00:00+00:00",
            report={"overall_score": 80},
        )
        res = client.post("/v1/score", json={"inspection_id": "test-id", "persist": False})
        assert res.status_code == 200


def test_score_summary_placeholder():
    """Summary endpoint reserved for future use."""
    assert True
