"""Decision explanations — WHY / WHAT / RISK / OPPORTUNITY."""

from __future__ import annotations

from typing import Any


def build_decision_narrative(
    identity: dict[str, Any],
    pedigree_module: dict[str, Any],
    commercial: dict[str, Any],
    risk: dict[str, Any],
    final_score: dict[str, Any],
    distance: dict[str, Any],
    market: dict[str, Any],
) -> dict[str, Any]:
    """Framework rule: never a simple opinion — always explain WHY/WHAT/RISK/OPPORTUNITY."""
    why: list[str] = []
    what: list[str] = []
    risk_items: list[str] = []
    opportunity: list[str] = []

    overall = final_score.get("overall_score", 0)
    cat = identity.get("category_label", "horse")

    # WHY
    if overall >= 80:
        why.append(f"Overall score {overall:.0f}/100 places this {cat} in the upper commercial tier.")
    elif overall >= 65:
        why.append(f"Overall score {overall:.0f}/100 indicates a credible racing/commercial prospect for its category.")
    else:
        why.append(f"Overall score {overall:.0f}/100 reflects mixed signals requiring selective buyer interest.")

    sire_s = (pedigree_module.get("sire") or {}).get("score", 0)
    dam_s = (pedigree_module.get("dam") or {}).get("score", 0)
    if sire_s >= 70:
        why.append(f"Sire line scores {sire_s:.0f}/100 — strong stallion influence on athletic and commercial profile.")
    if dam_s >= 70:
        why.append(f"Dam production scores {dam_s:.0f}/100 — maternal line supports class potential.")

    # WHAT
    applied = final_score.get("applied_scores") or {}
    for k, v in applied.items():
        what.append(f"{k.replace('_', ' ').title()}: {v:.0f}/100")

    rec = distance.get("recommended") or distance.get("best_distance")
    if rec:
        what.append(f"Recommended distance profile: {rec}")

    comm_s = commercial.get("score", 0)
    if comm_s >= 70:
        what.append(f"Commercial appeal {comm_s:.0f}/100 — pedigree and market demand align.")

    # RISK
    risk_level = risk.get("risk_level", "Medium")
    risk_items.append(f"Composite risk level: {risk_level} ({risk.get('risk_score', 0):.0f}/100)")
    comps = risk.get("components") or {}
    if comps.get("structural_risk", 0) >= 60:
        risk_items.append("Structural/conformation risk elevated — vet and farrier scrutiny advised.")
    if comps.get("movement_risk", 0) >= 60:
        risk_items.append("Movement irregularity or asymmetry flagged in biomechanical assessment.")
    if comps.get("pedigree_risk", 0) >= 60:
        risk_items.append("Pedigree production risk — dam line or siblings underperform commercially.")

    # OPPORTUNITY
    if overall >= 75 and risk.get("risk_score", 100) < 45:
        opportunity.append("Strong score with manageable risk — upside candidate at appropriate reserve.")
    fam = (pedigree_module.get("family") or {}).get("score", 0)
    if fam >= 75:
        opportunity.append(f"Family strength {fam:.0f}/100 — black-type upside in maternal line.")
    sib = pedigree_module.get("siblings") or {}
    if sib.get("count", 0) > 0 and sib.get("score", 0) >= 70:
        opportunity.append("Sibling cohort performs well — commercial validation of family.")

    likely = market.get("most_likely_price")
    if likely:
        opportunity.append(f"Framework market estimate: {_fmt(likely)} (confidence: {market.get('confidence_label', 'medium')}).")

    return {"why": why, "what": what, "risk": risk_items, "opportunity": opportunity}


def _fmt(n: Any) -> str:
    try:
        return f"${int(n):,}"
    except (TypeError, ValueError):
        return str(n)
