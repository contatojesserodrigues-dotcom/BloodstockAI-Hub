"""Unit tests for Pedigree Intelligence Engine."""

from inspection_ai.pedigree_engine import compute_pedigree_intelligence, research_to_pedigree_input


def test_pedigree_intelligence_g1_signal():
    research = {
        "sire": {"name": "Galileo", "commercial": {"fee": {"value": "€250,000", "verified": True}}},
        "dam": {"name": "Test Dam", "produce_record": {"black_type": {"value": "2", "verified": True}}},
        "black_type_family": {"winners": ["Sibling A G1", "Sibling B G2"]},
        "notes": "Successful nick with Danehill line — Group 1 winner in family",
    }
    result = compute_pedigree_intelligence(research)
    assert result["pedigree_rating"] >= 6.0
    assert result["pedigree_score"] >= 60
    assert "module" in result


def test_research_to_pedigree_input():
    research = {"sire": {"name": "Sire"}}
    intel = compute_pedigree_intelligence(research)
    inp = research_to_pedigree_input(research, intel)
    assert "sire_performance" in inp
    assert inp["pedigree_rating"] == intel["pedigree_rating"]
