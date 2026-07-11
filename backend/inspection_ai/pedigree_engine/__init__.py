"""Pedigree Intelligence Engine — delegates to Intelligence Framework M2."""

from inspection_ai.intelligence_framework.m02_pedigree import compute_pedigree_module
from inspection_ai.pedigree_engine.intelligence_scorer import research_to_pedigree_input


def compute_pedigree_intelligence(research: dict) -> dict:
    """Facade — returns framework-compatible pedigree intelligence."""
    module = compute_pedigree_module(research)
    components = {
        "sire_performance": module["sire"]["score"],
        "dam_performance": module["dam"]["score"],
        "black_type_score": module["family"]["score"],
        "nick_compatibility": module["sire"]["components"].get("distance_compatibility", 55),
        "commercial_appeal": module["sire"]["components"].get("commercial_value", 55),
        "stamina_index": module["sire"]["components"].get("distance_compatibility", 55),
        "speed_index": module["sire"]["components"].get("g1_production", 55),
        "sibling_score": module["siblings"]["score"],
        "family_score": module["family"]["score"],
    }
    return {
        "pedigree_rating": module["pedigree_rating"],
        "pedigree_score": module["composite_score"],
        "nick_rating": round(components["nick_compatibility"] / 10.0, 1),
        "components": components,
        "module": module,
        "engine_version": "1.0.0",
    }


__all__ = ["compute_pedigree_intelligence", "research_to_pedigree_input"]
