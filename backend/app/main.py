"""FastAPI application entry point.

Constructs the application and wires in the transport routers. The
``GET /search`` route lives in :mod:`app.api.search` and is registered here via
``include_router`` alongside the lightweight ``/health`` liveness probe.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.search import search_router
from app.services.booth_cache import init_booth_cache


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup/shutdown hook.

    Loads the Booth Demo Mode Static Route Cache into memory exactly once at
    startup (a no-op disk read of an empty dict when
    ``settings.booth_demo_mode`` is false), so no ``/search`` request ever
    performs that disk I/O itself.
    """
    init_booth_cache()
    yield


app = FastAPI(
    title="Hybrid Routing Search API",
    version="0.1.0",
    description=(
        "Search endpoint returning job postings ranked and priced by commute "
        "cost using a Hybrid Routing Strategy (exact match near demo origins, "
        "spatial fallback estimation otherwise)."
    ),
    lifespan=_lifespan,
)

# Local dev CORS: allows the Vite dev server (default port 5173, plus the
# common 3000/4173 alternates) to call this API with fetch()/XHR from the
# browser. Without this, browser requests from the frontend origin are
# blocked by CORS even though the API itself works fine (e.g. via curl or
# direct browser navigation, which are not subject to CORS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """Lightweight liveness probe."""
    return {"status": "ok"}
