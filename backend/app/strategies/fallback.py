"""Fallback_Estimation pricing strategy.

Implements :class:`FallbackEstimationStrategy`, the strategy that prices job
postings spatially when the user is outside every Demo_Origin's Hero_Radius. It
also serves the Exact_Match strategy as its best-effort "other companies"
pricer (see design.md "FallbackEstimationStrategy" and "ExactMatchStrategy").

Pipeline (design.md "FallbackEstimationStrategy", steps 5-7; the spatial
bounding, fare computation, fare filter, and top-25 selection are performed in
SQL by :func:`~app.db.repository.select_fallback_candidates`):

1. Build the user's geography point and select the priced fallback candidate
   pool -- at most 25 companies, already ordered by station-to-station distance
   and already fare-filtered (Property 8; Requirements 3.7, 4.1, 4.3).
2. When invoked on behalf of the Exact_Match strategy, drop the matched demo
   ``company_id`` from the pool so its jobs are priced exactly, not estimated.
3. Call the Time_Estimation_Service once for the whole pool (<= 25 destinations),
   obtaining whole-minute commute times aligned to candidate order (Property 9;
   Requirements 3.8, 3.9). In Booth Demo Mode this call is transparently served
   from the pre-computed Static Route Cache instead of the live Google API
   (see :mod:`app.services.booth_cache`); a company whose pair is a cache miss
   or has no pre-computed route is dropped from the pool for this request.
4. Fetch the candidate companies' jobs in a single set-based query.
5. Build one :class:`PricedJob` per job: fare from its company's computed
   ``fare_thb``, commute time from the estimate for that company,
   ``is_estimate=True`` (Requirement 3.11).
6. Apply the ``max_time`` filter AFTER estimation -- drop jobs whose
   ``commute_time_mins`` exceeds ``max_time``, and only when ``max_time`` was
   provided (Property 9; Requirements 3.10, 4.2, 4.4, 4.8).

Time-service failure handling (Property 11): this strategy never catches
:class:`~app.services.time_client.TimeEstimationError`. When Fallback_Estimation
is the *selected* strategy the error propagates to the caller, which maps it to
HTTP 502 with no records (Requirement 3.12). The Exact_Match strategy, which
uses this strategy on a best-effort basis, is responsible for catching the error
itself so it can downgrade to an exact-only response (Requirement 2.4, 2.9).
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repository import (
    fetch_jobs_for_companies,
    make_user_point,
    select_fallback_candidates,
)
from app.schemas.request import SearchQuery
from app.services.time_client import TimeEstimationClient
from app.strategies.types import PricedJob


class FallbackEstimationStrategy:
    """Prices job postings spatially with estimated fares and commute times.

    The Time_Estimation_Service client is injected so it can be shared or
    substituted; when omitted a default :class:`TimeEstimationClient` is used.
    """

    def __init__(self, time_client: TimeEstimationClient | None = None) -> None:
        self._time_client = (
            time_client if time_client is not None else TimeEstimationClient()
        )

    async def price(
        self,
        db: AsyncSession,
        query: SearchQuery,
        *,
        exclude_company_id: int | None = None,
    ) -> list[PricedJob]:
        """Produce estimated :class:`PricedJob` records for the candidate pool.

        Args:
            db: The active async session.
            query: The validated search input. ``lat``/``lng`` locate the user,
                ``max_fare`` bounds the candidate pool (applied in SQL before the
                top-25 selection), and ``max_time`` filters jobs after time
                estimation.
            exclude_company_id: When provided (by the Exact_Match strategy), the
                matched demo company is removed from the fallback pool before the
                time-estimation call so its jobs are priced exactly elsewhere and
                never double-counted as estimates.

        Returns:
            A flat list of :class:`PricedJob`, each with ``is_estimate=True``.
            Empty when no company survives the spatial/fare bounding or when no
            job satisfies the ``max_time`` filter.

        Raises:
            TimeEstimationError: If the Time_Estimation_Service errors or times
                out. This is intentionally not caught here; the selected-strategy
                caller maps it to HTTP 502 (Property 11, Requirement 3.12), while
                the Exact_Match best-effort caller catches it (Requirement 2.4).
        """
        user_point = make_user_point(query.lat, query.lng)

        # (1) Priced, fare-filtered, top-25 candidate pool (SQL-side).
        candidates = await select_fallback_candidates(db, user_point, query.max_fare)

        # (2) Exclude the exactly-priced demo company from the estimated pool.
        if exclude_company_id is not None:
            candidates = [
                c for c in candidates if c.company_id != exclude_company_id
            ]

        if not candidates:
            return []

        # (3) One batched Time_Estimation_Service call for the whole pool.
        # ``estimate`` transparently routes to the Booth Demo Mode Static
        # Route Cache when active, or the live Google API otherwise. Each
        # result is aligned to candidate order; ``commute_time_mins`` is
        # ``None`` only on a booth-mode cache miss/no-route (never on the live
        # path, which still raises TimeEstimationError as before).
        origin = (query.lat, query.lng)
        destinations = [(c.latitude, c.longitude) for c in candidates]
        estimates = await self._time_client.estimate(origin, destinations)

        # Index pricing and timing by company id for the per-job build below.
        # A company whose estimate is None (booth cache miss/no-route) is
        # excluded here rather than carried forward with a null
        # commute_time_mins, since JobResult.commute_time_mins is a
        # non-nullable whole-minute field (Requirement 5.4) -- this mirrors
        # the pre-existing pattern of dropping jobs whose company falls
        # outside the timed pool.
        fare_by_company = {c.company_id: c.fare_thb for c in candidates}
        time_by_company: dict[int, int] = {}
        segments_by_company: dict[int, list | None] = {}
        for candidate, result in zip(candidates, estimates):
            if result.commute_time_mins is None:
                continue
            time_by_company[candidate.company_id] = result.commute_time_mins
            segments_by_company[candidate.company_id] = result.transit_segments

        # (4) Fetch all candidate companies' jobs in a single set-based query.
        company_ids = [c.company_id for c in candidates]
        jobs = await fetch_jobs_for_companies(db, company_ids)

        # (5) Build a PricedJob per job and (6) apply the post-estimation
        # max_time filter.
        priced: list[PricedJob] = []
        for row in jobs:
            company_id = row.job.company_id
            if company_id not in time_by_company:
                # Defensive: a job whose company was excluded/absent from the
                # timed pool is not estimable and is skipped.
                continue

            commute_time_mins = time_by_company[company_id]
            if query.max_time is not None and commute_time_mins > query.max_time:
                continue

            priced.append(
                PricedJob(
                    job=row.job,
                    fare_thb=fare_by_company[company_id],
                    commute_time_mins=commute_time_mins,
                    is_estimate=True,
                    company_name=row.company_name,
                    company_lat=row.company_lat,
                    company_lng=row.company_lng,
                    transit_segments=segments_by_company.get(company_id),
                )
            )

        return priced
