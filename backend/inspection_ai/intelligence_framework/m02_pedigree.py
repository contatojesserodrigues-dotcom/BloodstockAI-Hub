"""M2 — Pedigree Intelligence: sire, dam, sibling, family sub-scores."""

from __future__ import annotations

import re
from typing import Any, Optional

from inspection_ai.scoring.constants import (
    DAM_SCORE_WEIGHTS,
    PEDIGREE_MODULE_WEIGHTS,
    SIBLING_SCORE_WEIGHTS,
    SIRE_SCORE_WEIGHTS,
)
from inspection_ai.scoring.normalization import clamp


def _text_blob(data: Any) -> str:
    return str(data).lower() if data is not None else ""


def _verifiable_value(field: Any) -> str:
    if isinstance(field, dict):
        return str(field.get("value") or "")
    return str(field or "")


def _count_signals(text: str, patterns: list[str]) -> int:
    return sum(1 for p in patterns if re.search(p, text, re.I))


def score_sire(research: dict[str, Any], pedigree_input: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Sire Performance Score per Framework v1.0."""
    sire = research.get("sire") or {}
    blob = _text_blob(sire) + _text_blob(research.get("notes"))
    ped = pedigree_input or {}

    g1 = clamp(50 + _count_signals(blob, [r"g1\b", r"group\s*1", r"grade\s*1"]) * 15)
    stakes = clamp(50 + _count_signals(blob, [r"stakes\s+winner", r"g2\b", r"g3\b", r"group\s*[23]"]) * 10)
    winner_pct = clamp(float(ped.get("sire_performance") or 55) + _count_signals(blob, [r"winner", r"strike\s*rate"]) * 5)
    commercial = clamp(
        float(ped.get("commercial_appeal") or 55)
        + (15 if "fee" in blob or "stud" in blob else 0)
    )
    distance = clamp(float(ped.get("stamina_index") or ped.get("speed_index") or 55))

    score = clamp(
        g1 * SIRE_SCORE_WEIGHTS["g1_production"]
        + stakes * SIRE_SCORE_WEIGHTS["stakes_production"]
        + winner_pct * SIRE_SCORE_WEIGHTS["winner_percentage"]
        + commercial * SIRE_SCORE_WEIGHTS["commercial_value"]
        + distance * SIRE_SCORE_WEIGHTS["distance_compatibility"]
    )
    return {
        "score": score,
        "name": sire.get("name") if isinstance(sire, dict) else None,
        "components": {
            "g1_production": g1,
            "stakes_production": stakes,
            "winner_percentage": winner_pct,
            "commercial_value": commercial,
            "distance_compatibility": distance,
        },
    }


def score_dam(research: dict[str, Any], pedigree_input: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Dam Production Score per Framework v1.0."""
    dam = research.get("dam") or {}
    blob = _text_blob(dam) + _text_blob(research.get("notes"))
    ped = pedigree_input or {}

    black_type = clamp(
        float(ped.get("black_type_score") or 50)
        + _count_signals(blob, [r"black\s*type", r"stakes"]) * 8
    )
    winner_rate = clamp(float(ped.get("dam_performance") or 55))
    quality = clamp(55 + _count_signals(blob, [r"best\s+runner", r"graded", r"stakes\s+placed"]) * 8)
    family = clamp(55 + _count_signals(blob, [r"family", r"producer", r"broodmare"]) * 5)

    score = clamp(
        black_type * DAM_SCORE_WEIGHTS["black_type_production"]
        + winner_rate * DAM_SCORE_WEIGHTS["winner_rate"]
        + quality * DAM_SCORE_WEIGHTS["quality_of_progeny"]
        + family * DAM_SCORE_WEIGHTS["family_strength"]
    )
    return {
        "score": score,
        "name": dam.get("name") if isinstance(dam, dict) else None,
        "components": {
            "black_type_production": black_type,
            "winner_rate": winner_rate,
            "quality_of_progeny": quality,
            "family_strength": family,
        },
    }


def _parse_price(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    s = _verifiable_value(value)
    digits = re.sub(r"[^\d.]", "", s.replace(",", ""))
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def score_siblings(research: dict[str, Any]) -> dict[str, Any]:
    """Sibling Quality Score — aggregate across known siblings."""
    siblings = research.get("siblings") or []
    if not isinstance(siblings, list) or not siblings:
        return {"score": 55.0, "count": 0, "components": {}, "details": []}

    details = []
    sale_scores: list[float] = []
    race_scores: list[float] = []
    bt_scores: list[float] = []

    for sib in siblings:
        if not isinstance(sib, dict):
            continue
        blob = _text_blob(sib)
        price = _parse_price(sib.get("sale_price"))
        sale_s = clamp(55 + (min(price, 500_000) / 500_000) * 35) if price else 50.0
        wins = _count_signals(blob, [r"\bw\b", r"win", r"victory"])
        race_s = clamp(50 + wins * 12 + _count_signals(blob, [r"rating", r"earnings"]) * 5)
        bt_s = clamp(50 + _count_signals(blob, [r"black\s*type", r"stakes", r"group"]) * 15)
        sale_scores.append(sale_s)
        race_scores.append(race_s)
        bt_scores.append(bt_s)
        details.append({"name": sib.get("name"), "sale_score": sale_s, "race_score": race_s, "black_type_score": bt_s})

    def _avg(xs: list[float], default: float = 55.0) -> float:
        return sum(xs) / len(xs) if xs else default

    sale_avg = _avg(sale_scores)
    race_avg = _avg(race_scores)
    bt_avg = _avg(bt_scores)
    score = clamp(
        sale_avg * SIBLING_SCORE_WEIGHTS["sale_performance"]
        + race_avg * SIBLING_SCORE_WEIGHTS["race_performance"]
        + bt_avg * SIBLING_SCORE_WEIGHTS["black_type"]
    )
    return {
        "score": score,
        "count": len(details),
        "components": {
            "sale_performance": sale_avg,
            "race_performance": race_avg,
            "black_type": bt_avg,
        },
        "details": details[:8],
    }


def score_family(research: dict[str, Any]) -> dict[str, Any]:
    """Family Strength Score from maternal line / black type family."""
    bt = research.get("black_type_family") or {}
    blob = _text_blob(bt) + _text_blob(research.get("notes"))
    winners = bt.get("winners") or []
    winner_count = len(winners) if isinstance(winners, list) else 0
    g1 = _count_signals(blob, [r"g1\b", r"group\s*1"])
    g2 = _count_signals(blob, [r"g2\b", r"group\s*2"])
    g3 = _count_signals(blob, [r"g3\b", r"group\s*3"])
    stakes = _count_signals(blob, [r"stakes\s+winner", r"black\s*type"])

    score = clamp(50 + winner_count * 8 + g1 * 12 + g2 * 8 + g3 * 5 + stakes * 4)
    return {
        "score": score,
        "components": {
            "black_type_winners": winner_count,
            "g1_signals": g1,
            "g2_signals": g2,
            "g3_signals": g3,
            "stakes_signals": stakes,
        },
        "female_family": bt.get("female_family") if isinstance(bt, dict) else None,
    }


def compute_pedigree_module(
    research: dict[str, Any],
    pedigree_input: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """M2 composite — feeds Scientific Scoring Engine."""
    sire = score_sire(research, pedigree_input)
    dam = score_dam(research, pedigree_input)
    siblings = score_siblings(research)
    family = score_family(research)

    composite = clamp(
        sire["score"] * PEDIGREE_MODULE_WEIGHTS["sire_score"]
        + dam["score"] * PEDIGREE_MODULE_WEIGHTS["dam_score"]
        + siblings["score"] * PEDIGREE_MODULE_WEIGHTS["sibling_score"]
        + family["score"] * PEDIGREE_MODULE_WEIGHTS["family_score"]
    )
    return {
        "composite_score": composite,
        "pedigree_rating": round(composite / 10.0, 1),
        "sire": sire,
        "dam": dam,
        "siblings": siblings,
        "family": family,
        "engine_version": "1.0.0",
    }
