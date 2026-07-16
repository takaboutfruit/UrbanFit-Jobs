"""Data-access layer for the hybrid-routing-search feature.

Encapsulates the three parameterized queries described in design.md
"Components and Interfaces > Data-access layer" and the request-lifecycle
query-budget table. Every function issues exactly one database round trip so the
whole request stays within the 4-query bound of Requirement 6 (Property 15):

- :func:`find_nearest_demo_origin` -- the demo-origin proximity check that
  drives strategy selection (Property 2).
- :func:`select_fallback_candidates` -- the single CTE/LATERAL statement that
  builds the fallback candidate pool, prices each candidate, applies the
  ``max_fare`` filter, and caps the pool at the closest 25 companies
  (Properties 5, 6, 7, 8).
- :func:`fetch_jobs_for_companies` -- the single set-based INNER JOIN that
  retrieves job postings for every matched company while excluding dangling
  foreign keys (Properties 15, 16).

All spatial predicates operate on PostGIS ``geography(Point, 4326)`` columns so
distances are true geodesic meters. Callers build the user's geography point via
:func:`make_user_point` and pass it into the query functions, so the SQL never
hard-codes coordinates.
"""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy import ColumnElement, Numeric, Text, cast, case, func, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Company, DemoOrigin, JobPosting, Station
from app.strategies.types import CandidateCompany, JobWithCompany

# Fare-formula constants (design.md "FallbackEstimationStrategy", Requirement
# 3.3 / 3.4). Kept local to the pricing SQL; the spatial radii and the
# candidate cap live in ``app.config.settings``.
_TRAIN_BASE_FARE_THB = 15.0
_TRAIN_PER_KM_THB = 2.5
_LAST_MILE_BASE_FARE_THB = 15.0
_LAST_MILE_PER_KM_THB = 10.0
_METERS_PER_KM = 1000.0
_FARE_DECIMAL_PLACES = 2


def make_user_point(latitude: float, longitude: float) -> ColumnElement:
    """Build a PostGIS ``geography(Point, 4326)`` from a coordinate pair.

    Callers pass simple ``(latitude, longitude)`` coordinates and receive a SQL
    expression suitable for the spatial predicates in this module. The point is
    constructed with ``ST_MakePoint(longitude, latitude)`` (PostGIS takes X/Y =
    longitude/latitude order), tagged with SRID 4326, and cast to ``geography``
    so it type-matches the models' ``geog`` columns and yields geodesic meters
    from ``ST_Distance`` / ``ST_DWithin``.

    Args:
        latitude: User latitude in decimal degrees.
        longitude: User longitude in decimal degrees.

    Returns:
        A SQLAlchemy column expression evaluating to the user's geography point.
    """
    return cast(
        func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
        Geography(geometry_type="POINT", srid=4326),
    )


async def find_nearest_demo_origin(
    db: AsyncSession, user_point: ColumnElement
) -> DemoOrigin | None:
    """Return the nearest Demo_Origin within the Hero_Radius, or ``None``.

    Runs a single ``ST_DWithin`` proximity search against ``demo_origins``,
    ordered by geodesic distance ascending then ``company_id`` ascending, taking
    the first row. This makes strategy selection proximity-determined and
    deterministic: a row is returned iff the user is at or within
    ``settings.hero_radius_m`` (500 m) of at least one demo origin, and when
    several qualify the closest wins with ties broken by the lowest
    ``company_id`` (Property 2; Requirements 2.1, 2.6, 2.7).

    Args:
        db: The active async session.
        user_point: The user's geography point (see :func:`make_user_point`).

    Returns:
        The matched :class:`DemoOrigin`, or ``None`` when no demo origin falls
        within the Hero_Radius (the caller then selects Fallback_Estimation).
    """
    stmt = (
        select(DemoOrigin)
        .where(
            func.ST_DWithin(DemoOrigin.geog, user_point, settings.hero_radius_m)
        )
        .order_by(
            func.ST_Distance(DemoOrigin.geog, user_point).asc(),
            DemoOrigin.company_id.asc(),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def select_fallback_candidates(
    db: AsyncSession,
    user_point: ColumnElement,
    max_fare: float | None,
) -> list[CandidateCompany]:
    """Select and price the fallback candidate companies in one statement.

    Builds a single CTE/LATERAL query that, per design.md
    "FallbackEstimationStrategy":

    1. Finds the User's Nearest Station to ``user_point`` (a one-row CTE).
    2. Limits companies to those within ``settings.spatial_bounding_radius_m``
       (20 km) of ``user_point`` via ``ST_DWithin`` (Requirement 3.2).
    3. Finds each company's nearest station via a ``LATERAL`` join (the
       Company's Nearest Station).
    4. Prices each candidate:
       - train fare ``15 + 2.5 * d_km`` where ``d_km`` is the non-negative
         station-to-station geodesic distance in km (Property 5, Requirement
         3.3);
       - a last-mile surcharge ``15 + 10 * last_mile_km`` added only when the
         company is strictly farther than ``settings.last_mile_threshold_m``
         (800 m) from its nearest station, otherwise 0 (Property 6, Requirements
         3.4, 3.5);
       - the total rounded to 2 decimal places.
    5. Applies the ``max_fare`` filter (drop total fare strictly greater than
       ``max_fare``) BEFORE the stratified selection, and only when
       ``max_fare`` is provided (Property 7; Requirements 3.6, 4.1, 4.3, 4.7).
    6. Selects the final candidate pool via **stratified sampling** rather
       than a strict nearest-N cut: the ``settings.stratified_nearest_count``
       (10) closest-by-distance companies are always included (so genuinely
       nearby matches are never lost), and the remaining
       ``settings.candidate_company_limit - settings.stratified_nearest_count``
       (15) slots are filled from the rest of the 20 km-bounded, fare-filtered
       pool ordered by a **deterministic per-company hash**
       (``md5(company_id)``) rather than true ``ORDER BY RANDOM()``. This
       spreads the pool across the full 20 km radius instead of collapsing
       onto whichever companies happen to be geographically closest to the
       user, while guaranteeing that -- for the same user location and
       ``max_fare`` -- the exact same 25 company ids are returned on every
       call. ``max_time`` never enters this query at all, so a
       Commute_Tolerance-only change (e.g. the tolerance slider) can only
       add/remove pins via the post-estimation ``max_time`` filter applied
       downstream in the strategies; it can never change which company a
       still-qualifying pin points at or where that pin is drawn. (A true
       ``ORDER BY RANDOM()`` here previously re-shuffled the "other 15" on
       every request -- including requests that only changed
       Commute_Tolerance, which never touches this query -- silently
       swapping which companies were selected and making already-plotted
       pins appear to jump to new coordinates.)

    Distances feeding the fare formulas are clamped to be non-negative with
    ``GREATEST(distance, 0)`` so numeric noise can never reduce a fare.

    Args:
        db: The active async session.
        user_point: The user's geography point (see :func:`make_user_point`).
        max_fare: The optional maximum total fare (THB). When ``None``, no
            candidate is dropped for fare before the stratified selection.

    Returns:
        Up to ``settings.candidate_company_limit`` (25) :class:`CandidateCompany`
        rows: the nearest ``settings.stratified_nearest_count`` (10) plus a
        random sample of the remainder, in no particular combined order.
    """
    # (1) User's Nearest Station -- a single-row CTE holding its geography.
    user_station = (
        select(Station.geog.label("geog"))
        .order_by(func.ST_Distance(Station.geog, user_point).asc())
        .limit(1)
        .cte("user_nearest_station")
    )

    # (3) Company's Nearest Station -- a LATERAL subquery evaluated per company,
    # exposing the station geography and the company-to-station distance used by
    # the last-mile rule.
    company_station = (
        select(
            Station.geog.label("station_geog"),
            func.ST_Distance(Station.geog, Company.geog).label(
                "company_to_station_m"
            ),
        )
        .order_by(func.ST_Distance(Station.geog, Company.geog).asc())
        .limit(1)
        .lateral("company_nearest_station")
    )

    # Station-to-station geodesic distance (meters): the ordering key and the
    # basis for the train fare. Clamped non-negative before conversion to km.
    station_to_station_m = func.ST_Distance(
        user_station.c.geog, company_station.c.station_geog
    )
    d_km = func.greatest(station_to_station_m, 0.0) / _METERS_PER_KM
    train_fare = _TRAIN_BASE_FARE_THB + _TRAIN_PER_KM_THB * d_km

    # (4) Last-mile surcharge: only when the company is strictly beyond the
    # threshold from its nearest station; the last-mile distance is clamped
    # non-negative before conversion to km.
    last_mile_km = (
        func.greatest(company_station.c.company_to_station_m, 0.0) / _METERS_PER_KM
    )
    last_mile_surcharge = case(
        (
            company_station.c.company_to_station_m > settings.last_mile_threshold_m,
            _LAST_MILE_BASE_FARE_THB + _LAST_MILE_PER_KM_THB * last_mile_km,
        ),
        else_=0.0,
    )

    # Total fare rounded to 2 dp. Cast to NUMERIC so PostgreSQL's two-argument
    # round(numeric, int) applies (round(double precision, int) does not exist).
    total_fare = func.round(
        cast(train_fare + last_mile_surcharge, Numeric), _FARE_DECIMAL_PLACES
    )

    # (2) Priced candidates within the 20 km bounding radius. The LATERAL join
    # is ON TRUE; the single-row user-station CTE is cross-joined ON TRUE.
    priced = (
        select(
            Company.id.label("company_id"),
            Company.latitude.label("latitude"),
            Company.longitude.label("longitude"),
            total_fare.label("fare_thb"),
            station_to_station_m.label("station_to_station_m"),
        )
        .select_from(Company)
        .join(user_station, true())
        .join(company_station, true())
        .where(
            func.ST_DWithin(
                Company.geog, user_point, settings.spatial_bounding_radius_m
            )
        )
        .subquery("priced_candidates")
    )

    # (5) Fare filter, applied to the priced pool before the stratified
    # selection below.
    fare_filtered = select(
        priced.c.company_id,
        priced.c.latitude,
        priced.c.longitude,
        priced.c.fare_thb,
        priced.c.station_to_station_m,
    )
    if max_fare is not None:
        fare_filtered = fare_filtered.where(priced.c.fare_thb <= max_fare)
    fare_filtered = fare_filtered.subquery("fare_filtered_candidates")

    nearest_count = settings.stratified_nearest_count
    random_count = settings.candidate_company_limit - nearest_count

    # (6a) The strict nearest `nearest_count` companies by station-to-station
    # distance -- always included so genuinely close matches are never lost.
    nearest_stmt = (
        select(
            fare_filtered.c.company_id,
            fare_filtered.c.latitude,
            fare_filtered.c.longitude,
            fare_filtered.c.fare_thb,
            fare_filtered.c.station_to_station_m,
        )
        .order_by(fare_filtered.c.station_to_station_m.asc())
        .limit(nearest_count)
    )
    nearest_cte = nearest_stmt.cte("stratified_nearest")

    # (6b) A deterministic pseudo-random sample of `random_count` companies
    # from the remainder of the fare-filtered, 20km-bounded pool (excluding
    # the nearest set above), spreading the candidate pool across the full
    # spatial radius instead of only the closest companies. Ordered by
    # `md5(company_id::text)` rather than `random()` so the SAME company_id
    # set is returned on every call for a given user location/max_fare --
    # `random()` re-evaluates per row per call and would otherwise reshuffle
    # this "other 15" set on every request (including ones that only change
    # Commute_Tolerance, which this query never sees), making map pins for
    # unrelated companies appear to swap/move between requests.
    random_stmt = (
        select(
            fare_filtered.c.company_id,
            fare_filtered.c.latitude,
            fare_filtered.c.longitude,
            fare_filtered.c.fare_thb,
            fare_filtered.c.station_to_station_m,
        )
        .where(
            fare_filtered.c.company_id.not_in(select(nearest_cte.c.company_id))
        )
        .order_by(func.md5(cast(fare_filtered.c.company_id, Text)))
        .limit(random_count)
    )

    stmt = select(nearest_cte).union_all(random_stmt)

    result = await db.execute(stmt)
    return [
        CandidateCompany(
            company_id=row.company_id,
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            fare_thb=float(row.fare_thb),
            station_to_station_km=float(row.station_to_station_m) / _METERS_PER_KM,
        )
        for row in result.all()
    ]


async def fetch_jobs_for_companies(
    db: AsyncSession, company_ids: list[int]
) -> list[JobWithCompany]:
    """Fetch job postings and owning-company context in one set-based query.

    Issues a single ``SELECT`` with an ``INNER JOIN`` to ``companies`` filtered
    by ``company_id IN (:ids)``, selecting each job alongside its company's
    name and coordinates so the enrichment layer needs no second round trip
    (Requirements 5.1, 5.2, 5.4). Using one set-based query (rather than one per
    company) keeps the request within the query budget (Property 15;
    Requirements 6.1, 6.2, 6.3). The INNER JOIN enforces referential integrity:
    a Job_Posting whose ``company_id`` has no matching Company row is excluded
    from the results (Property 16; Requirement 7.7).

    Args:
        db: The active async session.
        company_ids: The matched company ids (exact-match company plus the
            fallback top-25). May be empty.

    Returns:
        The matching :class:`JobWithCompany` rows, each pairing a job posting
        with its company name and coordinates. An empty list is returned when
        ``company_ids`` is empty, avoiding an invalid ``IN ()`` clause.
    """
    if not company_ids:
        return []

    stmt = (
        select(
            JobPosting,
            Company.name,
            Company.latitude,
            Company.longitude,
        )
        .join(Company, JobPosting.company_id == Company.id)
        .where(JobPosting.company_id.in_(company_ids))
    )
    result = await db.execute(stmt)
    return [
        JobWithCompany(
            job=row[0],
            company_name=row[1],
            company_lat=float(row[2]) if row[2] is not None else None,
            company_lng=float(row[3]) if row[3] is not None else None,
        )
        for row in result.all()
    ]
