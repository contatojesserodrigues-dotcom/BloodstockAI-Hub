"""Integration tests for Inspection Scoring API."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from inspection_ai.api.main import create_app
from inspection_ai.api.models import InspectionScoreRequest
from inspection_ai.application.inspection_scoring_service import InspectionScoringService
from inspection_ai.scoring import ScientificScoringEngine

FIXTURE = {
    "inspection_id": "00000000-0000-4000-8000-000000000001",
    "horse": {"name": "Test Horse", "category": "FLAT_YEARLING"},
    "biomechanics": {
        "distance_m": 80,
        "stride_count": 10,
        "duration_sec": 5,
        "left_stride_m": 7.8,
        "right_stride_m": 8.2,
    },
    "pedigree": {"sire_performance": 85, "dam_performance": 78},
    "conformation": {"balance": 80, "leg_alignment_deviation_deg": 2},
    "persist": False,
}


@pytest.fixture
def client():
    return TestClient(create_app())


def test_inspection_score_endpoint_without_db(client):
    """Score with explicit payload when DB unavailable."""
    with patch.object(InspectionScoringService, "score_inspection") as mock_score:
        from inspection_ai.api.models import InspectionScoreResponse, RecommendationsBlock

        mock_score.return_value = InspectionScoreResponse(
            inspection_id=FIXTURE["inspection_id"],
            overall_score=82.5,
            elite_potential=82.5,
            confidence=0.85,
            biomechanics={"score": 80},
            pedigree={"score": 78},
            conformation={"score": 80},
            behaviour={"score": 55},
            hoof={"score": 50},
            commercial={"score": 75},
            recommendations=RecommendationsBlock(buying="Strong Racing Prospect — verify vet"),
            scientific_version={"engine": "1.0.0"},
            scored_at="2026-07-11T00:00:00+00:00",
            report={},
        )
        res = client.post("/api/v1/inspection/score", json=FIXTURE)
        assert res.status_code == 200
        body = res.json()
        assert body["overall_score"] == 82.5
        assert "scientific_version" in body


def test_version_endpoint(client):
    res = client.get("/api/v1/inspection/version")
    assert res.status_code == 200
    assert res.json()["engine"] == "1.0.0"


def test_service_scores_without_persistence():
    service = InspectionScoringService(engine=ScientificScoringEngine())
    mock_repo = MagicMock()
    mock_repo.get_analysis.return_value = {
        "id": FIXTURE["inspection_id"],
        "user_id": "user-1",
        "horse_name": "Test",
        "horse_category": "FLAT_YEARLING",
        "pedigree_research": {"pedigree_rating": 8.0},
    }
    mock_repo.get_blocks.return_value = []
    mock_repo.get_biomechanical_metrics.return_value = []
    mock_repo.client.enabled = False
    service.repository = mock_repo

    req = InspectionScoreRequest(
        inspection_id=FIXTURE["inspection_id"],
        user_id="user-1",
        biomechanics=FIXTURE["biomechanics"],
        persist=False,
    )
    result = service.score_inspection(req)
    assert result.overall_score > 0
    assert result.scientific_version["engine"] == "1.0.0"
    assert result.recommendations.buying
