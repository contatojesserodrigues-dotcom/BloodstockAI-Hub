"""Map persisted inspection data → ScoringInput (no formulas — data only)."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.scoring.models import ScoringInput


def _avg(nums: list[float]) -> Optional[float]:
    xs = [n for n in nums if isinstance(n, (int, float))]
    if not xs:
        return None
    return sum(xs) / len(xs)


def assemble_scoring_input(
    analysis: dict[str, Any],
    blocks: list[dict[str, Any]],
    biomech_rows: list[dict[str, Any]],
    overrides: Optional[dict[str, Any]] = None,
) -> ScoringInput:
    """Build ScoringInput from DB rows. Vision AI block scores are raw inputs, not calculated here."""
    overrides = overrides or {}

    horse = {
        "name": analysis.get("horse_name"),
        "registration": analysis.get("registration_number"),
        "birth_year": analysis.get("birth_year"),
        "sex": analysis.get("sex"),
        "breed": analysis.get("breed") or "Thoroughbred",
        "country": analysis.get("country"),
        "category": analysis.get("horse_category"),
        "region": analysis.get("region"),
    }
    horse.update(overrides.get("horse") or {})

    pr = analysis.get("pedigree_research") or {}
    pedigree = {
        "sire_performance": _pedigree_component(pr, "sire"),
        "dam_performance": _pedigree_component(pr, "dam"),
        "black_type_score": _black_type(pr),
        "nick_compatibility": _nick(pr),
        "stamina_index": pr.get("stamina_index"),
        "speed_index": pr.get("speed_index"),
        "pedigree_rating": pr.get("pedigree_rating"),
        "commercial_appeal": pr.get("commercial_appeal"),
    }
    if isinstance(pr.get("pedigree_rating"), (int, float)):
        rating = float(pr["pedigree_rating"]) * 10
        pedigree.setdefault("sire_performance", rating)
        pedigree.setdefault("dam_performance", rating)
    pedigree.update(overrides.get("pedigree") or {})

    conf_scores = [_block_score(b, "conformation") for b in blocks]
    gait_scores = [_block_score(b, "gait") for b in blocks]
    hoof_scores = [_block_score(b, "hoof") for b in blocks]
    leg_devs = [_leg_deviation(b) for b in blocks]

    conformation = {
        "balance": _avg([s for s in conf_scores if s is not None]),
        "shoulder": _avg(conf_scores),
        "bone": _avg(conf_scores),
        "leg_alignment_deviation_deg": next((d for d in leg_devs if d is not None), None),
        "overall_structure": _avg(conf_scores),
    }
    conformation.update(overrides.get("conformation") or {})

    behaviour = {
        "calmness": _avg(conf_scores) or 55,
        "focus": 55,
        "handling": 55,
        "recovery": 55,
    }
    behaviour.update(overrides.get("behaviour") or {})
    if analysis.get("behaviour_score") is not None:
        bs = float(analysis["behaviour_score"])
        behaviour.update({"calmness": bs, "focus": bs, "handling": bs, "recovery": bs})

    hoof = {
        "hoof_balance": _avg(hoof_scores),
        "hoof_angle": _avg(hoof_scores),
        "symmetry": _avg(hoof_scores),
        "wall_quality": _avg(hoof_scores),
    }
    hoof.update(overrides.get("hoof") or {})
    if analysis.get("hoof_health_score") is not None:
        hs = float(analysis["hoof_health_score"])
        hoof.update({"hoof_balance": hs, "hoof_angle": hs, "symmetry": hs, "wall_quality": hs})

    biomechanics: dict[str, Any] = {}
    if biomech_rows:
        latest = biomech_rows[-1]
        mj = latest.get("metrics_json") or {}
        sa = mj.get("stride_analysis") or {}
        biomechanics = {
            "stride_length_m": latest.get("stride_length_estimate") or sa.get("stride_length_m"),
            "stride_frequency": latest.get("stride_frequency") or sa.get("stride_frequency"),
            "stride_count": sa.get("stride_count"),
            "duration_sec": sa.get("duration_sec"),
            "left_stride_m": mj.get("left_stride_m"),
            "right_stride_m": mj.get("right_stride_m"),
            "shoulder_rom_deg": mj.get("shoulder_rom_deg"),
            "hip_rom_deg": mj.get("hip_rom_deg"),
            "hock_extension_deg": mj.get("hock_extension_deg"),
            "fetlock_rom_deg": mj.get("fetlock_rom_deg"),
            "movement_variability": mj.get("movement_variability"),
            "movement_consistency_cv": mj.get("movement_consistency_cv"),
        }
    if gait_scores:
        avg_gait = _avg([g for g in gait_scores if g is not None])
        if avg_gait and not biomechanics.get("stride_frequency"):
            biomechanics.setdefault("balance_score_raw", avg_gait)
    biomechanics.update(overrides.get("biomechanics") or {})

    commercial = {}
    me = analysis.get("market_estimate") or {}
    if isinstance(me, dict):
        commercial["market_demand"] = me.get("demand_score")
        commercial["commercial_profile"] = me.get("commercial_score")
    commercial.update(overrides.get("commercial") or {})

    payload = {
        "horse": horse,
        "pedigree": pedigree,
        "biomechanics": biomechanics,
        "conformation": conformation,
        "behaviour": behaviour,
        "hoof": hoof,
        "commercial": commercial,
        "metadata": {
            "inspection_id": analysis.get("id"),
            "block_count": len(blocks),
            **(overrides.get("metadata") or {}),
        },
    }
    return ScoringInput.model_validate(payload)


def _block_score(block: dict[str, Any], key: str) -> Optional[float]:
    sb = block.get("score_breakdown") or {}
    val = sb.get(key)
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(block.get("block_score"), (int, float)) and key == "conformation":
        return float(block["block_score"])
    return None


def _leg_deviation(block: dict[str, Any]) -> Optional[float]:
    m = block.get("measurements_json") or {}
    v = m.get("leg_deviation_degrees")
    return float(v) if isinstance(v, (int, float)) else None


def _pedigree_component(pr: dict[str, Any], side: str) -> Optional[float]:
    node = pr.get(side) or {}
    if isinstance(node.get("performance_score"), (int, float)):
        return float(node["performance_score"])
    rating = pr.get("pedigree_rating")
    if isinstance(rating, (int, float)):
        return float(rating) * 10
    return None


def _black_type(pr: dict[str, Any]) -> Optional[float]:
    dam = pr.get("dam") or {}
    produce = dam.get("produce_record") or {}
    bt = produce.get("black_type") or {}
    if isinstance(bt.get("value"), (int, float)):
        return min(100.0, float(bt["value"]) * 10)
    return None


def _nick(pr: dict[str, Any]) -> Optional[float]:
    if isinstance(pr.get("nick_rating"), (int, float)):
        return min(100.0, float(pr["nick_rating"]) * 10)
    return None
