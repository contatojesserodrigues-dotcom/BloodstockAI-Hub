"""Unit tests for BloodstockAI Intelligence Framework v1.0."""

from inspection_ai.intelligence_framework.m01_identity import normalize_category, resolve_category_weights
from inspection_ai.intelligence_framework.m02_pedigree import compute_pedigree_module
from inspection_ai.intelligence_framework.m09_final_score import calculate_final_horse_score
from inspection_ai.intelligence_framework.orchestrator import IntelligenceOrchestrator
from inspection_ai.scoring.models import (
    BehaviourInput,
    BiomechanicsInput,
    CommercialInput,
    ConformationInput,
    HoofInput,
    HorseInput,
    PedigreeInput,
    ScoringInput,
)
from inspection_ai.scoring.scoring_engine import ScientificScoringEngine


def test_category_weights_flat_yearling():
    w = resolve_category_weights("YEARLING")
    assert abs(w["pedigree"] - 0.3) < 0.001
    assert abs(w["biomechanics"] - 0.3) < 0.001


def test_category_weights_nh():
    w = resolve_category_weights("NH_IN_TRAINING")
    assert "structure" in w
    assert abs(w["structure"] - 0.3) < 0.001


def test_pedigree_module_composite():
    research = {
        "sire": {"name": "Galileo", "commercial": {"fee": {"value": "250000"}}},
        "dam": {"name": "Dam", "produce_record": {"black_type": {"value": "2"}}},
        "siblings": [{"name": "Sib1", "sale_price": "$120,000", "black_type": "G3 winner"}],
        "black_type_family": {"winners": ["Horse A G1", "Horse B G2"]},
    }
    result = compute_pedigree_module(research)
    assert result["composite_score"] >= 60
    assert "sire" in result and "dam" in result


def test_final_score_nh_vs_flat():
    flat = calculate_final_horse_score("YEARLING", 80, 75, 78, 70, 72)
    nh = calculate_final_horse_score("NH_IN_TRAINING", 80, 75, 78, 70, 72, durability=65)
    assert flat["is_national_hunt"] is False
    assert nh["is_national_hunt"] is True
    assert flat["overall_score"] != nh["overall_score"] or flat["weight_profile"] != nh["weight_profile"]


def test_orchestrator_produces_decision():
    inp = ScoringInput(
        horse=HorseInput(name="Test", category="YEARLING"),
        pedigree=PedigreeInput(sire_performance=80, dam_performance=75),
        biomechanics=BiomechanicsInput(distance_m=80, stride_count=10, duration_sec=5),
        conformation=ConformationInput(balance=80),
        behaviour=BehaviourInput(calmness=70),
        hoof=HoofInput(hoof_balance=75),
        commercial=CommercialInput(commercial_profile=72),
        metadata={"pedigree_research": {"sire": {"name": "Sire"}, "dam": {"name": "Dam"}}},
    )
    engine = ScientificScoringEngine()
    out = engine.score(inp)
    framework = IntelligenceOrchestrator().run(inp, out)
    assert framework["framework_version"] == "1.0.0"
    assert "decision" in framework
    assert "why" in framework["decision"]
    assert framework["modules"]["m10_market"]["most_likely_price"] > 0
