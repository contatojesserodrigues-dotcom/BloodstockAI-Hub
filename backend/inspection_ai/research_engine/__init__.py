"""Internet Research Engine — query templates (Python mirror for tests/docs)."""

from __future__ import annotations

from typing import Any


def build_research_query_keys(meta: dict[str, Any]) -> list[str]:
    """Return expected Tavily query keys for a pedigree meta dict."""
    keys: list[str] = []
    horse = (meta.get("horse_name") or "").strip()
    sire = (meta.get("sire") or "").strip()
    dam = (meta.get("dam") or "").strip()
    damsire = (meta.get("damsire") or meta.get("dam_sire") or "").strip()

    if horse:
        keys.append("horse_racing")
    if sire:
        keys.extend(["sire_g1", "sire_stats", "sire_distance"])
    if dam:
        keys.extend(["dam_produce", "dam_family"])
    if damsire:
        keys.append("damsire_influence")
    if sire and damsire:
        keys.append("nick_analysis")
    if horse and dam:
        keys.append("maternal_siblings")
    keys.append("black_type_family")
    return keys
