"""FastAPI application factory."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from inspection_ai.api.routers.health_router import router as health_router
from inspection_ai.api.routers.inspection_router import router as inspection_router
from inspection_ai.domain.versioning import CURRENT_SCIENTIFIC_VERSION


def create_app() -> FastAPI:
    app = FastAPI(
        title="BloodstockAI Inspection API",
        version=CURRENT_SCIENTIFIC_VERSION.engine,
        description="Scientific Scoring Engine — Python single source of truth.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("SCORING_CORS_ORIGINS", "*").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(inspection_router)

    # Legacy alias — redirects to same engine
    @app.post("/v1/score")
    def legacy_score(body: dict) -> dict:
        from inspection_ai.api.models import InspectionScoreRequest
        from inspection_ai.application.inspection_scoring_service import InspectionScoringService

        req = InspectionScoreRequest.model_validate(body)
        resp = InspectionScoringService().score_inspection(req)
        return resp.report

    return app


app = create_app()
