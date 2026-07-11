"""Report aggregation — unified JSON bundle for PDF/frontend."""

from __future__ import annotations

from typing import Any


def build_intelligence_bundle(
    pedigree: dict[str, Any] | None = None,
    market: dict[str, Any] | None = None,
    biomechanics: dict[str, Any] | None = None,
    behaviour: dict[str, Any] | None = None,
    hoof: dict[str, Any] | None = None,
    scores: dict[str, Any] | None = None,
    prediction: dict[str, Any] | None = None,
    research_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """PASSO 8 — unified internal JSON (never HTML)."""
    return {
        "pedigree": pedigree or {},
        "market": market or {},
        "biomechanics": biomechanics or {},
        "behaviour": behaviour or {},
        "hoof": hoof or {},
        "scores": scores or {},
        "prediction": prediction or {},
        "research_summary": research_summary or {},
    }
