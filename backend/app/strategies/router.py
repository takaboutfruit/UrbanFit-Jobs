"""Hybrid_Router orchestrator and shared response assembly.

Implements :class:`HybridRouter`, the orchestrator that ties the two pricing
strategies together (see design.md "Orchestrator - HybridRouter"). It selects a
strategy from the user's proximity to demo origins, delegates pricing to the
chosen strategy, and then runs a single shared assembly pipeline -- combined
fare/time filtering, deterministic ordering, pagination, and ``meta``
construction -- to produce the final :class:`SearchResponse`.

Both strategies converge on the same downstream pipeline, so the pricing logic
(which record gets which fare/time) stays cleanly separated from the shared
assembly logic (how the merged records are filtered, ordered, sliced, and
serialized).

Strategy selection (Property 2; Requirements 2.1, 2.2, 2.6, 2.7, 3.1)
---------------------------------------------------------------------
:meth:`HybridRouter.select_strategy` builds the user's geography point and runs
the single ``find_nearest_demo_origin`` proximity query. A returned demo origin
means the user is at or within the Hero_Radius (500 m) of at least one demo
origin, so Exact_Match is selected; otherwise Fallback_Estimation is selected.
The proximity query already orders by distance ascending then ``company_id``
ascending, so the nearest origin wins with the lowest ``company_id`` breaking
ties.

Time-service failure divergence (Property 11; Requirement 3.12)
---------------------------------------------------------------
When Fallback_Estimation is the *selected* strategy, a
:class:`~app.services.time_client.TimeEstimationError` raised by
:meth:`FallbackEstimationStrategy.price` is intentionally NOT caught here: it
propagates out of :meth:`search_jobs` so the transport route (task 13) maps it
to HTTP 502. When Exact_Match is selected the error is handled inside
:class:`~app.strategies.exact.ExactMatchStrategy` on a best-effort basis, so it
never reaches this orchestrator and the exact demo jobs are still returned with
HTTP 200 (Property 4; Requirements 2.4, 2.9).

Shared client
-------------
A single :class:`~app.services.time_client.TimeEstimationClient` is constructed
once and shared with both strategies, so one HTTP client configuration (API key,
base URL, 1.5 s timeout) drives every time-estimation call.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.db.repository import find_nearest_demo_origin, make_user_point
from app.models import DemoOrigin
from app.schemas.request import SearchQuery
from app.schemas.response import (
    CompanyLocation,
    JobResult,
    SearchMeta,
    SearchResponse,
    TransitSegment,
)
from app.services.enrichment import (
    compute_commute_fit,
    compute_skill_fit,
    monthly_commute_cost_baht,
    normalize_skill_tokens,
    overall_fit_score,
    per_trip_cost_baht,
    resolve_career_growth_index,
    resolve_work_model,
)
from app.services.time_client import TimeEstimationClient
from app.strategies.exact import ExactMatchStrategy
from app.strategies.fallback import FallbackEstimationStrategy
from app.strategies.types import PricedJob
from sqlalchemy.ext.asyncio import AsyncSession

_FARE_DECIMAL_PLACES = 2

# Latitude/longitude in-range bounds for building a CompanyLocation. Coordinates
# outside these bounds are treated as unavailable (company_location -> None).
_LAT_MIN, _LAT_MAX = -90.0, 90.0
_LNG_MIN, _LNG_MAX = -180.0, 180.0


@dataclass(frozen=True, slots=True)
class _EnrichedJob:
    """A :class:`PricedJob` paired with its derived enrichment fields.

    Pairing the priced job with its computed fields lets the fit ordering and
    the final serialization share one derivation pass -- ``overall`` and the
    per-record derived values are computed once here and reused downstream
    without recomputation.
    """

    priced: PricedJob
    skill_fit_score: int | None
    commute_fit_score: int | None
    per_trip: int
    monthly: int
    work_model: str | None
    years_experience_required: int | None
    career_growth_index: str | None
    transit_segments: list[TransitSegment] | None
    company_name: str | None
    company_location: CompanyLocation | None
    overall: float | None


class HybridRouter:
    """Selects a pricing strategy, delegates, then assembles the response.

    A single :class:`TimeEstimationClient` is shared across both strategies so
    the whole request uses one client configuration. The client may be injected
    (for substitution) or defaulted.
    """

    def __init__(self, time_client: TimeEstimationClient | None = None) -> None:
        self._time_client = (
            time_client if time_client is not None else TimeEstimationClient()
        )
        self._exact = ExactMatchStrategy(self._time_client)
        self._fallback = FallbackEstimationStrategy(self._time_client)

    async def select_strategy(
        self, query: SearchQuery, db: AsyncSession
    ) -> tuple[str, DemoOrigin | None]:
        """Choose Exact_Match or Fallback_Estimation from user proximity.

        Builds the user's geography point and runs the single demo-origin
        proximity query. When a demo origin is returned the user is at or within
        the Hero_Radius of at least one origin, so ``("exact", demo_origin)`` is
        returned; otherwise ``("fallback", None)`` (Property 2; Requirements
        2.1, 2.2, 2.6, 2.7, 3.1).

        Args:
            query: The validated search input; ``lat``/``lng`` locate the user.
            db: The active async session.

        Returns:
            ``("exact", demo_origin)`` when a demo origin is within the
            Hero_Radius, else ``("fallback", None)``.
        """
        user_point = make_user_point(query.lat, query.lng)
        demo_origin = await find_nearest_demo_origin(db, user_point)
        if demo_origin is not None:
            return ("exact", demo_origin)
        return ("fallback", None)

    async def search_jobs(
        self, query: SearchQuery, db: AsyncSession
    ) -> SearchResponse:
        """Run the full hybrid search and return the assembled response.

        Selects a strategy, delegates pricing to produce the merged
        :class:`PricedJob` list, then runs the shared assembly (filter, order,
        paginate, build ``meta``) to produce the :class:`SearchResponse`.

        When Fallback_Estimation is the selected strategy, a
        :class:`~app.services.time_client.TimeEstimationError` from the fallback
        pricing propagates out of this method uncaught so the transport route
        maps it to HTTP 502 (Property 11; Requirement 3.12). In exact mode the
        error is handled inside the strategy, so a valid HTTP 200 response is
        always produced here.

        Args:
            query: The validated search input.
            db: The active async session.

        Returns:
            The assembled :class:`SearchResponse` (always HTTP 200 at this
            layer; time-service failures under fallback propagate instead).
        """
        strategy, demo_origin = await self.select_strategy(query, db)

        if strategy == "exact":
            # ExactMatchStrategy handles TimeEstimationError internally
            # (best-effort), so no 502 escapes here.
            assert demo_origin is not None
            priced = await self._exact.price(db, query, demo_origin)
        else:
            # Fallback selected: let TimeEstimationError propagate so the route
            # maps it to HTTP 502 (Property 11; Requirement 3.12).
            priced = await self._fallback.price(db, query)

        return self._assemble_response(query, priced)

    # -- Shared assembly (task 12.2) -------------------------------------

    def _assemble_response(
        self, query: SearchQuery, priced: list[PricedJob]
    ) -> SearchResponse:
        """Filter, order, paginate, and serialize the merged priced jobs.

        This is the shared assembly both strategies converge on:

        1. Combined fare/time retention (Property 10).
        2. Enrichment of each retained job with derived fit/cost/work-model
           fields plus its overall fit score (Requirements 2.8, 3.6, 4.4-4.9,
           5.1, 5.3-5.5, 6.1, 6.6, 7.1, 8.1).
        3. Exclusion of jobs missing a ``job_id`` before counting
           ``total_records`` (Requirement 9.6).
        4. Deterministic total ordering -- the existing default order, or the
           fit order when ``sort == "fit"`` (Requirements 4.2, 9.3-9.5).
        5. Pagination with ``total_records`` counted before slicing
           (Property 13).
        6. Serialization into enriched :class:`JobResult` records preserving
           nulls (Property 14; Requirement 9.4).
        """
        retained = self._apply_filters(query, priced)

        # Exclude jobs whose job_id is missing/null before counting or ordering
        # (Requirement 9.6).
        identified = [pj for pj in retained if pj.job.job_id is not None]

        # Normalize the desired-skill tokens once for the whole page rather than
        # per job.
        desired_tokens = normalize_skill_tokens(query.desired_skills)
        enriched = [
            self._enrich(pj, desired_tokens, query.max_time) for pj in identified
        ]

        if query.sort == "fit":
            ordered = self._order_by_fit(enriched)
        else:
            ordered = self._order_enriched_default(enriched)

        total_records = len(ordered)
        page = ordered[query.offset : query.offset + query.limit]

        data = [self._to_result(ej) for ej in page]
        meta = SearchMeta(
            total_records=total_records,
            limit=query.limit,
            offset=query.offset,
        )
        return SearchResponse(data=data, meta=meta)

    @staticmethod
    def _enrich(
        pj: PricedJob, desired_tokens: list[str], max_time: int | None
    ) -> _EnrichedJob:
        """Derive the enrichment fields for a single priced job.

        Combines the pure enrichment layer with the request context
        (``desired_skills`` -- already normalized to ``desired_tokens`` -- and
        ``max_time``) to build the eight added response fields plus the
        ``overall`` fit score used for ordering. ``company_location`` is built
        only when both coordinates are present and in range; otherwise it is
        ``None``. There is no leg-level transit source today, so
        ``transit_segments`` is resolved from ``None`` (Requirement 6.6).
        """
        skill_fit_score = compute_skill_fit(desired_tokens, pj.job.required_skills)
        commute_fit_score = compute_commute_fit(pj.commute_time_mins, max_time)
        per_trip = per_trip_cost_baht(pj.fare_thb)
        # The explicit work_model column (schema expansion) wins when set to a
        # recognized value; otherwise falls back to the employment_type
        # derivation so pre-existing rows keep their prior behavior.
        work_model = resolve_work_model(pj.job.work_model, pj.job.employment_type)
        # monthly_commute_cost_baht applies the Hybrid (*0.4) / Remote (->0)
        # adjustment based on the resolved work_model.
        monthly = monthly_commute_cost_baht(per_trip, work_model)
        years_experience_required = pj.job.years_experience_required
        career_growth_index = resolve_career_growth_index(
            pj.job.career_growth_index
        )
        # No leg-level transit source exists on the live Google Distance
        # Matrix path (pj.transit_segments is None there, same as before).
        # In Booth Demo Mode the Static Route Cache can supply real ordered
        # legs, which flow straight through from PricedJob.
        transit_segments = pj.transit_segments
        overall = overall_fit_score(commute_fit_score, skill_fit_score)

        company_location = HybridRouter._build_company_location(
            pj.company_lat, pj.company_lng
        )

        return _EnrichedJob(
            priced=pj,
            skill_fit_score=skill_fit_score,
            commute_fit_score=commute_fit_score,
            per_trip=per_trip,
            monthly=monthly,
            work_model=work_model,
            years_experience_required=years_experience_required,
            career_growth_index=career_growth_index,
            transit_segments=transit_segments,
            company_name=pj.company_name,
            company_location=company_location,
            overall=overall,
        )

    @staticmethod
    def _build_company_location(
        lat: float | None, lng: float | None
    ) -> CompanyLocation | None:
        """Build a :class:`CompanyLocation` only from a valid coordinate pair.

        Returns a :class:`CompanyLocation` iff both ``lat`` and ``lng`` are
        present and in range (lat in ``[-90, 90]``, lng in ``[-180, 180]``);
        otherwise ``None`` (Requirement 5.4).
        """
        if lat is None or lng is None:
            return None
        if not (_LAT_MIN <= lat <= _LAT_MAX):
            return None
        if not (_LNG_MIN <= lng <= _LNG_MAX):
            return None
        return CompanyLocation(lat=lat, lng=lng)

    @staticmethod
    def _order_enriched_default(enriched: list[_EnrichedJob]) -> list[_EnrichedJob]:
        """Order enriched jobs by the pre-existing deterministic order.

        Delegates to the same key as :meth:`_order` applied to each wrapped
        :class:`PricedJob`, so the ordering (and every pre-existing field value)
        is byte-for-byte identical to the pre-enrichment behavior when ``sort``
        is omitted or ``"default"`` (Requirements 4.2, 9.5).
        """
        return sorted(
            enriched, key=lambda ej: HybridRouter._default_sort_key(ej.priced)
        )

    @staticmethod
    def _order_by_fit(enriched: list[_EnrichedJob]) -> list[_EnrichedJob]:
        """Order enriched jobs by overall fit (Requirements 4.4-4.7).

        Ascending Python sort over the key
        ``(overall is None, -(overall or 0), company_name is None,
        company_name or "", job_id or "")`` yields: records with an available
        overall score first ordered by overall DESCENDING (unavailable overall
        last), ties broken by ``company_name`` ASCENDING with ``None`` last, then
        by ``job_id`` ASCENDING -- a deterministic total order. ``job_id`` is
        never ``None`` here because such rows were already excluded.
        """

        def key(ej: _EnrichedJob) -> tuple:
            overall = ej.overall
            company_name = ej.company_name
            job_id = ej.priced.job.job_id
            return (
                overall is None,
                -(overall or 0),
                company_name is None,
                company_name or "",
                job_id or "",
            )

        return sorted(enriched, key=key)

    @staticmethod
    def _apply_filters(
        query: SearchQuery, priced: list[PricedJob]
    ) -> list[PricedJob]:
        """Retain jobs satisfying every provided limit (Property 10).

        A job is retained iff ``(max_fare is None or fare_thb <= max_fare)`` AND
        ``(max_time is None or commute_time_mins <= max_time)``. The strategies
        already apply fare (in SQL, before the top-25) and time (after
        estimation) filters; this defensive combined retention guarantees the
        invariant holds regardless of the path taken (Requirements 4.5, 4.6,
        4.9, 4.10).
        """
        max_fare = query.max_fare
        max_time = query.max_time
        return [
            pj
            for pj in priced
            if (max_fare is None or pj.fare_thb <= max_fare)
            and (max_time is None or pj.commute_time_mins <= max_time)
        ]

    @staticmethod
    def _order(priced: list[PricedJob]) -> list[PricedJob]:
        """Sort into the deterministic total order (Property 12).

        Ordering key, all ascending: ``is_estimate`` (``False`` before
        ``True``), ``fare_thb``, ``commute_time_mins``, ``company_id``,
        ``job_id`` (Requirement 5.6). ``company_id`` and ``job_id`` may be
        ``None`` on incomplete source rows; both are coerced so the sort remains
        a stable total order with missing values sorted last.
        """

        return sorted(priced, key=HybridRouter._default_sort_key)

    @staticmethod
    def _default_sort_key(pj: PricedJob) -> tuple:
        """The pre-existing deterministic ordering key (Requirement 5.6).

        Ascending on ``is_estimate`` (``False`` before ``True``), ``fare_thb``,
        ``commute_time_mins``, ``company_id``, ``job_id``. ``company_id`` and
        ``job_id`` may be ``None`` on incomplete source rows; both are coerced
        via a ``(missing-flag, value)`` pair so present values sort first and
        missing values last, keeping a stable total order.
        """
        company_id = pj.job.company_id
        job_id = pj.job.job_id
        company_key = (0, company_id) if company_id is not None else (1, 0)
        job_key = (0, job_id) if job_id is not None else (1, "")
        return (
            pj.is_estimate,
            pj.fare_thb,
            pj.commute_time_mins,
            company_key,
            job_key,
        )

    @staticmethod
    def _to_result(ej: _EnrichedJob) -> JobResult:
        """Map an :class:`_EnrichedJob` to a :class:`JobResult` (Property 14).

        Source fields are read straight off the job and preserved as-is
        (``None`` values are kept, never omitted). ``fare_thb`` is rounded to
        two decimal places and ``commute_time_mins`` is coerced to an integer.
        The eight enrichment fields are populated from the values already
        computed in :meth:`_enrich`, with nulls preserved (never omitted;
        Requirement 9.4). Callers must not serialize with ``exclude_none=True``.
        """
        pj = ej.priced
        job = pj.job
        return JobResult(
            job_id=job.job_id,
            company_id=job.company_id,
            job_title=job.job_title,
            salary=job.salary,
            required_skills=job.required_skills,
            employment_type=job.employment_type,
            fare_thb=round(pj.fare_thb, _FARE_DECIMAL_PLACES),
            commute_time_mins=int(pj.commute_time_mins),
            is_estimate=pj.is_estimate,
            skill_fit_score=ej.skill_fit_score,
            commute_fit_score=ej.commute_fit_score,
            company_name=ej.company_name,
            company_location=ej.company_location,
            transit_segments=ej.transit_segments,
            per_trip_cost_baht=ej.per_trip,
            monthly_commute_cost_baht=ej.monthly,
            work_model=ej.work_model,
            years_experience_required=ej.years_experience_required,
            career_growth_index=ej.career_growth_index,
        )
