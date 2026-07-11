"""Pedigree input mapping for Scientific Scoring Engine."""

from __future__ import annotations

from typing import Any


def research_to_pedigree_input(research: dict[str, Any], intelligence: dict[str, Any]) -> dict[str, Any]:
    """Map framework pedigree intelligence → PedigreeInput fields."""
    comp = intelligence.get("components") or {}
    module = intelligence.get("module") or {}
    sire = (module.get("sire") or {}).get("components") or {}
    return {
        "sire_performance": comp.get("sire_performance"),
        "dam_performance": comp.get("dam_performance"),
        "black_type_score": comp.get("black_type_score"),
        "nick_compatibility": comp.get("nick_compatibility"),
        "commercial_appeal": comp.get("commercial_appeal"),
        "stamina_index": sire.get("distance_compatibility"),
        "speed_index": sire.get("g1_production"),
        "pedigree_rating": intelligence.get("pedigree_rating"),
    }
