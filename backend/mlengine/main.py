"""Main entrypoint exporting FastAPI app from app.main."""

# pyrefly: ignore [missing-import]
from app.main import app

__all__ = ["app"]
