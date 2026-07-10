"""Unit tests for Scientific Scoring Engine."""

from __future__ import annotations

import pytest

from inspection_ai.scoring import ScientificScoringEngine
from inspection_ai.scoring.biomechanics import calculate_stride_length, calculate_stride_efficiency
from inspection_ai.scoring.models import BiomechanicsInput, ScoringInput
from inspection_ai.scoring.normalization import (
    normalize_distance,
    normalize_frequency,
    normalize_leg_alignment,
    normalize_symmetry,
    safe_div,
)
from inspection_ai.scoring.prediction import g1_tier_label


class TestNormalization:
    def test_safe_div_zero(self):
        assert safe_div(10, 0, default=0.0) == 0.0

    def test_normalize_distance_elite(self):
        assert normalize_distance(7.5, 7.5) == 100.0

    def test_normalize_frequency(self):
        assert normalize_frequency(2.2, 2.2) == 100.0

    def test_normalize_symmetry(self):
        assert normalize_symmetry(3.0) == 85.0

    def test_normalize_leg_alignment(self):
        assert normalize_leg_alignment(4.0) == 60.0


class TestBiomechanics:
    def test_stride_length_from_distance(self):
        data = BiomechanicsInput(distance_m=80, stride_count=10)
        length_m, score = calculate_stride_length(data)
        assert length_m == pytest.approx(8.0)
        assert score > 100 * 0.9  # above 90% of elite

    def test_stride_efficiency_formula(self):
        eff = calculate_stride_efficiency(80.0, 90.0)
        assert eff == pytest.approx(80 * 0.6 + 90 * 0.4)


class TestScientificScoringEngine:
    @pytest.fixture
    def engine(self):
        return ScientificScoringEngine()

    @pytest.fixture
    def rich_payload(self):
        return {
            "horse": {"name": "Test Horse", "category": "FLAT_YEARLING"},
            "biomechanics": {
                "distance_m": 80,
                "stride_count": 10,
                "duration_sec": 5,
                "left_stride_m": 7.9,
                "right_stride_m": 8.1,
                "hock_extension_deg": 152,
                "shoulder_rom_deg": 34,
                "hip_rom_deg": 38,
                "movement_variability": 0.5,
            },
            "pedigree": {
                "sire_performance": 88,
                "dam_performance": 82,
                "black_type_score": 75,
                "nick_compatibility": 80,
            },
            "conformation": {
                "balance": 85,
                "leg_alignment_deviation_deg": 2,
                "shoulder": 47,
                "bone": 80,
            },
            "behaviour": {"calmness": 78, "focus": 82, "handling": 80, "recovery": 75},
            "hoof": {"hoof_balance": 82, "hoof_angle": 80, "symmetry": 85, "wall_quality": 83},
            "commercial": {"market_demand": 75, "commercial_profile": 78},
        }

    def test_full_pipeline(self, engine, rich_payload):
        out = engine.score(rich_payload)
        assert 0 <= out.overall_score <= 100
        assert 0 <= out.bpi.score <= 100
        assert 0 <= out.confidence <= 1
        assert out.recommendation

    def test_deterministic(self, engine, rich_payload):
        a = engine.score(rich_payload)
        b = engine.score(rich_payload)
        assert a.overall_score == b.overall_score
        assert a.bpi.score == b.bpi.score

    def test_incomplete_data_defaults(self, engine):
        out = engine.score({})
        assert out.overall_score == pytest.approx(50.0, abs=15)
        assert out.confidence < 0.85

    def test_json_report_serializable(self, engine, rich_payload):
        report = engine.generate_final_report(rich_payload)
        assert "overall_score" in report
        assert "biomechanics" in report
        assert "distance_prediction" in report
        assert isinstance(report["overall_score"], float)

    def test_g1_tiers(self):
        assert "G1" in g1_tier_label(92)
        assert "Group" in g1_tier_label(85)
        assert "Black Type" in g1_tier_label(72)

    def test_stride_submethods(self, engine):
        data = BiomechanicsInput(distance_m=80, stride_count=10, duration_sec=5)
        stride = engine.calculate_stride_score(data)
        assert stride["stride_length_m"] == 8.0
        sym = engine.calculate_symmetry_score(
            BiomechanicsInput(left_stride_m=8, right_stride_m=8)
        )
        assert sym["motion_symmetry"] == 100.0

    def test_pydantic_input(self, engine):
        inp = ScoringInput.model_validate({"horse": {"name": "X"}})
        out = engine.score(inp)
        assert out.overall_score >= 0
