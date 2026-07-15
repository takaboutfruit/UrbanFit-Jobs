"""Exact_Match pricing strategy.

Implements :class:`ExactMatchStrategy`, the strategy selected when the user's
coordinates fall at or within the Hero_Radius (500 m) of a Demo_Origin (see
design.md "ExactMatchStrategy"). It prices the matched demo company's jobs from
the curated ``exact_fare_thb`` / ``exact_time_mins`` (``is_estimate=False``) and
prices every *other* company on a best-effort basis using the same spatial
fallback pool, merging both into one unified :class:`PricedJob` list.

Behaviour (Requirements 2.3, 2.4, 2.5, 2.8, 2.9):

1. The matched demo company's jobs are priced exactly -- fare and time come
   straight from the matched :class:`~app.models.DemoOrigin`, with
   ``is_estimate=False``, applied *only* to jobs whose ``company_id`` equals the
   demo origin's ``company_id`` (Property 3; Requirements 2.3, 2.5).
2. All other companies are priced with the estimated fallback fare/time and
   ``is_estimate=True``, bound to the same 20 km Spatial_Bounding_Radius and the
   same 25-company Candidate_Company_Limit as the fallback strategy
   (Requirement 2.4).
3. The best-effort fallback pricing NEVER fails the exact-match response. If the
   Time_Estimation_Service errors or times out, the estimated records are simply
   omitted and the exact demo jobs are still returned with HTTP 200 -- never a
   502 (Property 4; Requirements 2.4, 2.9). This is the key divergence from the
   fallback-selected path, which lets the error propagate to a 502.
4. If the matched demo company has no jobs, only the fallback (estimated)
   results are returned, still HTTP 200 (Requirement 2.8).

Query-budget reasoning (Property 15; Requirement 6.3, 6.4)
----------------------------------------------------------
The router has already spent **query 1** on
:func:`~app.db.repository.find_nearest_demo_origin` to select this strategy and
hand us the matched ``demo_origin``. To stay within the 4-query bound this
strategy deliberately does NOT delegate to
:meth:`FallbackEstimationStrategy.price`, because that would run its own
candidate selection *and* its own job fetch, and we would then need a *separate*
fetch for the demo company's jobs -- 5 queries in total (1 + 1 + 1 + 1 + 1).

Instead this strategy replicates the minimal fallback flow with a single
combined job fetch:

- **query 2** -- :func:`~app.db.repository.select_fallback_candidates` builds the
  priced, fare-filtered, top-25 fallback pool. The matched demo ``company_id``
  is dropped from that pool so its jobs are priced exactly, not estimated.
- one external Time_Estimation_Service HTTP call for the pool (not a DB query;
  does not count against the budget) -- errors here are caught and downgrade to
  an exact-only response.
- **query 3** -- a single :func:`~app.db.repository.fetch_jobs_for_companies`
  call covering BOTH the demo company id AND the surviving fallback candidate
  ids. The returned jobs are then split: demo-company jobs are priced exactly,
  the rest estimated.

Total: 3 queries (1 in the router + 2 here), comfortably within the 4-query
budget, independent of the number of matched companies or jobs.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repository import (
    fetch_jobs_for_companies,
    make_user_point,
    select_fallback_candidates,
)
from app.models import DemoOrigin
from app.schemas.request import SearchQuery
from app.services.time_client import TimeEstimationClient, TimeEstimationError
from app.strategies.types import PricedJob


class ExactMatchStrategy:
    """Prices the matched demo company's jobs exactly and others best-effort.

    The Time_Estimation_Service client is injected so it can be shared with the
    fallback strategy or substituted; when omitted a default
    :class:`TimeEstimationClient` is used.
    """

    def __init__(self, time_client: TimeEstimationClient | None = None) -> None:
        self._time_client = (
            time_client if time_client is not None else TimeEstimationClient()
        )

    async def price(
        self,
        db: AsyncSession,
        query: SearchQuery,
        demo_origin: DemoOrigin,
    ) -> list[PricedJob]:
        """Produce the merged exact + best-effort estimated ``PricedJob`` list.

        Args:
            db: The active async session.
            query: The validated search input. ``lat``/``lng`` locate the user,
                ``max_fare`` bounds the fallback pool (applied in SQL before the
                top-25 selection), and ``max_time`` filters the *estimated*
                fallback jobs after time estimation.
            demo_origin: The Demo_Origin matched by the router within the
                Hero_Radius. Its ``company_id`` is priced exactly from
                ``exact_fare_thb`` / ``exact_time_mins``.

        Returns:
            A flat list of :class:`PricedJob`. The matched demo company's jobs
            carry ``is_estimate=False`` with the origin's exact fare/time; all
            other jobs carry ``is_estimate=True`` with estimated fare/time. When
            time estimation fails, only the exact demo jobs are returned; when
            the demo company has no jobs, only the estimated fallback jobs are
            returned. Never raises for a time-service failure (Property 4).
        """
        user_point = make_user_point(query.lat, query.lng)

        # (query 2) Priced, fare-filtered, top-25 fallback pool. Drop the matched
        # demo company so its jobs are priced exactly below, never estimated.
        candidates = await select_fallback_candidates(db, user_point, query.max_fare)
        candidates = [
            c for c in candidates if c.company_id != demo_origin.company_id
        ]

        # Best-effort time estimation for the "other companies" pool. A
        # TimeEstimationError here is NON-fatal in exact mode: we omit the
        # estimated records and fall through to return the exact demo jobs only
        # (Property 4; Requirements 2.4, 2.9). Never surfaces a 502.
        fare_by_company: dict[int, float] = {}
        time_by_company: dict[int, int] = {}
        if candidates:
            origin = (query.lat, query.lng)
            destinations = [(c.latitude, c.longitude) for c in candidates]
            try:
                commute_mins = await self._time_client.estimate_durations(
                    origin, destinations
                )
            except TimeEstimationError:
                # Omit all best-effort fallback records; keep the exact jobs.
                candidates = []
            else:
                fare_by_company = {c.company_id: c.fare_thb for c in candidates}
                time_by_company = {
                    c.company_id: commute_mins[i]
                    for i, c in enumerate(candidates)
                }

        # (query 3) ONE combined set-based fetch covering the demo company AND
        # the surviving fallback candidates. The demo company id is listed first
        # for clarity; ordering here does not affect correctness.
        company_ids = [demo_origin.company_id] + [
            c.company_id for c in candidates
        ]
        jobs = await fetch_jobs_for_companies(db, company_ids)

        # Split the combined fetch: demo-company jobs priced exactly
        # (is_estimate=False), all others priced from the estimated fare/time
        # (is_estimate=True) with the post-estimation max_time filter applied.
        priced: list[PricedJob] = []
        for row in jobs:
            if row.job.company_id == demo_origin.company_id:
                # (1) Exact pricing for the matched demo company (Property 3).
                priced.append(
                    PricedJob(
                        job=row.job,
                        fare_thb=demo_origin.exact_fare_thb,
                        commute_time_mins=demo_origin.exact_time_mins,
                        is_estimate=False,
                        company_name=row.company_name,
                        company_lat=row.company_lat,
                        company_lng=row.company_lng,
                    )
                )
                continue

            # (2) Estimated pricing for every other company.
            company_id = row.job.company_id
            if company_id not in time_by_company:
                # Company was excluded from the timed pool (fare filter,
                # top-25 cap, or a caught time-service failure): not estimable.
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
                )
            )

        return priced
