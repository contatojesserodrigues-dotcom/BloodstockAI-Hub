"""Unit tests for payload assembler (mapping only — no formulas)."""

from inspection_ai.application.payload_assembler import assemble_scoring_input


def test_assemble_from_blocks():
    analysis = {
        "id": "abc",
        "horse_name": "Lot 1",
        "horse_category": "FLAT_YEARLING",
        "pedigree_research": {"pedigree_rating": 7.5},
    }
    blocks = [{
        "block_score": 72,
        "score_breakdown": {"conformation": 75, "gait": 68, "hoof": 70},
        "measurements_json": {"leg_deviation_degrees": 2},
    }]
    inp = assemble_scoring_input(analysis, blocks, [])
    assert inp.horse.name == "Lot 1"
    assert inp.conformation.balance == 75
    assert inp.pedigree.sire_performance == 75.0
