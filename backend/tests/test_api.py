"""FastAPI endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from inspection_ai.api.app import app

client = TestClient(app)

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
    res = client.post("/v1/score", json=FIXTURE)
    assert res.status_code == 200
    body = res.json()
    assert "overall_score" in body
    assert "recommendation" in body
    assert body["overall_score"] > 0


def test_score_summary():
    res = client.post("/v1/score/summary", json=FIXTURE)
    assert res.status_code == 200
    body = res.json()
    assert "overall_score" in body
    assert "confidence" in body
