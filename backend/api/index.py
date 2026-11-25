"""Vercel entry point: exposes the FastAPI app."""
import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402,F401
