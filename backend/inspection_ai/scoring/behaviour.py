"""Behaviour scoring module."""

from __future__ import annotations

from .confidence import aggregate_confidence, reduce_confidence_for_sparse_data
from .constants import BEHAVIOUR_WEIGHTS
from .models import BehaviourInput, ScoreWithConfidence
from .normalization import clamp, normalize_optional


def calculate_behaviour_score(data: BehaviourInput) -> ScoreWithConfidence:
    """Behaviour Score from handling / temperament metrics.

    Formula:
        Calmness×0.30 + Focus×0.25 + Handling×0.20 + Recovery×0.25
    Stress inverted; environmental reaction penalizes high reactivity.
    """
    calmness = normalize_optional(data.calmness, 55.0)
    focus = normalize_optional(data.focus, 55.0)
    handling = normalize_optional(data.handling, 55.0)
    recovery = normalize_optional(data.recovery, 55.0)

    # Invert stress (high stress = low score)
    stress = data.stress
    if stress is not None:
        calmness = clamp((calmness + (100.0 - stress)) / 2.0)

    movement = normalize_optional(data.movement_behaviour, 55.0)
    env = normalize_optional(data.environmental_reaction, 55.0)
    if env > 60:
        focus = clamp(focus - (env - 60) * 0.3)

    total = clamp(
        calmness * BEHAVIOUR_WEIGHTS["calmness"]
        + focus * BEHAVIOUR_WEIGHTS["focus"]
        + handling * BEHAVIOUR_WEIGHTS["handling"]
        + recovery * BEHAVIOUR_WEIGHTS["stress_recovery"]
    )

    fields = [
        (data.calmness, 0.9),
        (data.focus, 0.9),
        (data.handling, 0.8),
        (data.recovery, 0.8),
        (data.stress, 0.5),
    ]
    conf = reduce_confidence_for_sparse_data(
        aggregate_confidence(fields),
        sum(1 for v, _ in fields if v is not None),
        len(fields),
    )

    return ScoreWithConfidence(
        score=total,
        confidence=conf,
        components={
            "calmness": calmness,
            "focus": focus,
            "handling": handling,
            "stress_recovery": recovery,
            "movement_behaviour": movement,
            "environmental_reaction": env,
        },
    )
