"""Unit tests for Market Estimate Engine."""

from inspection_ai.market_engine import compute_market_estimate


def test_market_estimate_yearling():
    result = compute_market_estimate(
        overall_score=75,
        category="YEARLING",
        pedigree_rating=7.5,
        biomechanics_score=80,
        conformation_score=78,
    )
    assert result["most_likely_price"] > 0
    assert result["low_estimate"] <= result["most_likely_price"] <= result["high_estimate"]
    assert result["confidence_label"] in ("high", "medium", "low", "insufficient")
    assert "tiers" in result


def test_market_estimate_sibling_prices():
    result = compute_market_estimate(
        overall_score=70,
        category="YEARLING",
        sibling_prices=[120_000, 150_000],
    )
    assert result["most_likely_price"] >= 80_000
