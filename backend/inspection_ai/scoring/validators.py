"""Input validation helpers."""

from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from .models import ScoringInput

logger = logging.getLogger(__name__)


def validate_input(payload: dict[str, Any]) -> ScoringInput:
    """Validate and coerce raw JSON into ScoringInput.

    Args:
        payload: Raw dict from API / edge function.

    Returns:
        Validated ScoringInput.

    Raises:
        ValidationError: If structure is invalid.
    """
    try:
        return ScoringInput.model_validate(payload)
    except ValidationError:
        logger.exception("Scoring input validation failed")
        raise


def count_present_fields(section: dict[str, Any]) -> tuple[int, int]:
    """Count non-null fields in a flat dict."""
    total = len(section)
    present = sum(1 for v in section.values() if v is not None)
    return present, total
