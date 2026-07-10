"""Verify Python and TypeScript scoring constants stay in sync."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SHARED = REPO_ROOT / "shared" / "scoring_constants.json"
EDGE_COPY = (
    REPO_ROOT
    / "platform"
    / "supabase"
    / "functions"
    / "_shared"
    / "inspection-ai"
    / "scoring_constants.json"
)


class TestConstantsParity:
    def test_shared_and_edge_copy_identical(self):
        assert SHARED.exists(), "shared/scoring_constants.json missing"
        assert EDGE_COPY.exists(), "edge function copy missing"
        shared = json.loads(SHARED.read_text(encoding="utf-8"))
        edge = json.loads(EDGE_COPY.read_text(encoding="utf-8"))
        assert shared == edge

    def test_python_loads_shared_constants(self):
        from inspection_ai.scoring.constants import (
            ELITE_STRIDE_LENGTH_M,
            FINAL_SCORE_WEIGHTS,
            SHARED_CONSTANTS_VERSION,
        )

        data = json.loads(SHARED.read_text(encoding="utf-8"))
        assert SHARED_CONSTANTS_VERSION == data["version"]
        assert ELITE_STRIDE_LENGTH_M == data["elite_stride_length_m"]
        assert FINAL_SCORE_WEIGHTS["biomechanics"] == data["final_score_weights"]["biomechanics"]

    def test_fixture_scores_match_expected_formulas(self):
        from inspection_ai.scoring.normalization import normalize_distance

        assert normalize_distance(7.5) == 100.0
        assert normalize_distance(8.0) == 100.0
