"""Transport layer: the ``GET /search`` route.

Defines :data:`search_router`, the FastAPI router exposing the search endpoint.
This layer is deliberately thin (see design.md "Transport layer - search_router"):
it binds query parameters to :class:`~app.schemas.request.SearchQuery`, injects a
request-scoped async session, delegates to the :class:`~app.strategies.router.HybridRouter`
orchestrator, and serializes the :class:`~app.schemas.response.SearchResponse`.

Validation (Property 1; Requirement 1.9)
-----------------------------------------
``SearchQuery`` is bound as query parameters via ``Annotated[SearchQuery, Query()]``,
so each field maps to a single scalar query parameter and FastAPI returns HTTP 422
with per-field detail automatically when any constraint fails -- no search runs
until every field validates.

Time-service failure mapping (Property 11; Requirement 3.12)
------------------------------------------------------------
When Fallback_Estimation is the *selected* strategy, a
:class:`~app.services.time_client.TimeEstimationError` propagates out of
:meth:`HybridRouter.search_jobs` uncaught. This route catches it and maps it to
HTTP 502 with no records. The exact-match path never raises it here because the
error is handled best-effort inside :class:`~app.strategies.exact.ExactMatchStrategy`,
so exact demo jobs are still returned with HTTP 200.

Query budget (Property 15; Requirement 6.3)
-------------------------------------------
The route holds no query logic of its own; all database access happens inside the
orchestrator and repository within the 4-query bound.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.request import SearchQuery
from app.schemas.response import SearchResponse
from app.services.time_client import TimeEstimationError
from app.strategies.router import HybridRouter

# A single shared orchestrator for the process. Constructing it once builds one
# TimeEstimationClient (API key, base URL, 1.5 s timeout) shared across requests.
hybrid_router = HybridRouter()

search_router = APIRouter(tags=["search"])


@search_router.get("/search", response_model=SearchResponse)
async def search(
    query: Annotated[SearchQuery, Query()],
    db: AsyncSession = Depends(get_session),
) -> SearchResponse:
    """Return job postings priced by commute cost for the user's location.

    ``query`` is validated by FastAPI before this handler runs; invalid input
    yields HTTP 422 automatically and this body never executes (Property 1;
    Requirement 1.9).

    Args:
        query: The validated search input bound from query parameters.
        db: The request-scoped async session.

    Returns:
        The assembled :class:`SearchResponse` with an HTTP 200 status.

    Raises:
        HTTPException: HTTP 502 when Fallback_Estimation is the selected
            strategy and the Time_Estimation_Service errors or times out
            (Property 11; Requirement 3.12).
    """
    try:
        return await hybrid_router.search_jobs(query, db)
    except TimeEstimationError as exc:
        raise HTTPException(
            status_code=502,
            detail="Commute time estimation is unavailable",
        ) from exc
