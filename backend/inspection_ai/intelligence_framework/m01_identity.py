"""M1 — Identity Analysis: category classification and weight resolution."""

from __future__ import annotations

from typing import Any, Optional

from inspection_ai.scoring.constants import CATEGORY_FINAL_SCORE_WEIGHTS, FINAL_SCORE_WEIGHTS

NH_CATEGORIES = frozenset({
    "NATIONAL_HUNT", "NH_STORE_YOUNG", "NH_IN_TRAINING",
})

FLAT_CATEGORIES = frozenset({
    "FLAT_YEARLING", "YEARLING", "FOAL", "WEANLING",
    "BREEZE_UP", "FLAT_IN_TRAINING", "BROODMARE_STALLION",
})

CATEGORY_LABELS = {
    "FOAL": "Foal",
    "WEANLING": "Weanling",
    "YEARLING": "Yearling",
    "FLAT_YEARLING": "Flat Yearling",
    "BREEZE_UP": "Breeze Up",
    "FLAT_IN_TRAINING": "Flat Horse In Training",
    "NH_STORE_YOUNG": "National Hunt — Store/Young",
    "NH_IN_TRAINING": "National Hunt — In Training",
    "NATIONAL_HUNT": "National Hunt",
    "BROODMARE_STALLION": "Broodmare / Stallion",
}


def normalize_category(category: Optional[str]) -> str:
    if not category:
        return "FLAT_YEARLING"
    key = category.upper().replace(" ", "_").replace("-", "_")
    if key in CATEGORY_FINAL_SCORE_WEIGHTS:
        return key
    if "NH" in key or "NATIONAL" in key or "HUNT" in key:
        return "NH_STORE_YOUNG"
    if "BREEZE" in key:
        return "BREEZE_UP"
    if "WEANLING" in key:
        return "WEANLING"
    if "FOAL" in key:
        return "FOAL"
    if "TRAINING" in key:
        return "FLAT_IN_TRAINING"
    if "BROODMARE" in key or "STALLION" in key:
        return "BROODMARE_STALLION"
    return "FLAT_YEARLING"


def resolve_category_weights(category: Optional[str]) -> dict[str, float]:
    """Return final-score weight profile for horse category."""
    key = normalize_category(category)
    return dict(CATEGORY_FINAL_SCORE_WEIGHTS.get(key, FINAL_SCORE_WEIGHTS))


def is_national_hunt(category: Optional[str]) -> bool:
    return normalize_category(category) in NH_CATEGORIES or normalize_category(category) == "NATIONAL_HUNT"


def build_identity_context(horse: dict[str, Any]) -> dict[str, Any]:
    """MODULE 1 — structured identity + category classification."""
    category = normalize_category(horse.get("category"))
    return {
        "name": horse.get("name"),
        "birth_year": horse.get("birth_year"),
        "sex": horse.get("sex"),
        "breed": horse.get("breed") or "Thoroughbred",
        "country": horse.get("country"),
        "region": horse.get("region"),
        "category": category,
        "category_label": CATEGORY_LABELS.get(category, category),
        "is_national_hunt": is_national_hunt(category),
        "weight_profile": resolve_category_weights(category),
    }
