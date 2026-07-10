"""Health check router."""

from typing import Dict

from fastapi import APIRouter

from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "engine": "scientific_scoring",
        "version": CURRENT_SCIENTIFIC_VERSION.engine,
    }
