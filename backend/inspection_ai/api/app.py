"""FastAPI HTTP API — use inspection_ai.api.main:app for uvicorn."""

from inspection_ai.api.main import app, create_app

__all__ = ["app", "create_app"]
