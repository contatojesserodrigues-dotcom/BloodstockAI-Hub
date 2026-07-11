"""Scientific engine versioning — reproducible scoring audits."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class ScientificVersion:
    """Version bundle persisted with every scoring run."""

    engine: str = "1.0.0"
    intelligence_framework: str = "1.0.0"
    biomechanics: str = "1.0.0"
    pedigree: str = "1.0.0"
    conformation: str = "1.0.0"
    behaviour: str = "1.0.0"
    hoof: str = "1.0.0"
    prediction: str = "1.0.0"
    feature_extraction: str = "0.1.0"

    def to_dict(self) -> dict[str, str]:
        return {
            "engine": self.engine,
            "intelligence_framework": self.intelligence_framework,
            "biomechanics": self.biomechanics,
            "pedigree": self.pedigree,
            "conformation": self.conformation,
            "behaviour": self.behaviour,
            "hoof": self.hoof,
            "prediction": self.prediction,
            "feature_extraction": self.feature_extraction,
        }


CURRENT_SCIENTIFIC_VERSION = ScientificVersion()


def scoring_audit_metadata() -> dict[str, Any]:
    """Timestamp + version stamp for persistence."""
    return {
        "scientific_version": CURRENT_SCIENTIFIC_VERSION.to_dict(),
        "scored_at": datetime.now(timezone.utc).isoformat(),
        "constants_version": "1.0.0",
    }
