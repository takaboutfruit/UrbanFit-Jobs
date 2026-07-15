"""In-memory value types shared by the pricing strategies and data-access layer.

This module holds the lightweight, framework-agnostic data structures that flow
between the repository (``app.db.repository``) and the pricing strategies
(``app.strategies``). Keeping them here avoids a circular import between the
data-access layer and the strategy modules.

This defines :class:`CandidateCompany`, the row shape returned by the fallback
candidate-selection query, and :class:`PricedJob`, the unit that flows from the
pricing strategies through the shared filtering, ordering, and pagination
assembly.

See design.md "Derived / in-memory types".
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models import JobPosting


@dataclass(frozen=True, slots=True)
class CandidateCompany:
    """A fallback candidate company with its computed commute price.

    Produced by ``select_fallback_candidates`` (see ``app.db.repository``). One
    instance represents a single company that survived the 20 km spatial
    bounding check and the optional ``max_fare`` filter, carrying the values
    needed for downstream time-estimation and pricing.

    Attributes:
        company_id: The company's integer primary key (``companies.id``).
        latitude: The company's latitude in decimal degrees, used as a
            destination coordinate for the Time_Estimation_Service call.
        longitude: The company's longitude in decimal degrees, used as a
            destination coordinate for the Time_Estimation_Service call.
        fare_thb: The total commute fare in Thai Baht (train fare plus any
            last-mile surcharge), rounded to 2 decimal places.
        station_to_station_km: The geodesic distance in kilometers between the
            User's Nearest Station and the Company's Nearest Station. This is
            the ordering key used to select the closest 25 candidates and is the
            same distance metric that drives the train-fare calculation.
    """

    company_id: int
    latitude: float
    longitude: float
    fare_thb: float
    station_to_station_km: float


@dataclass(frozen=True, slots=True)
class JobWithCompany:
    """A job posting paired with its owning company's name and coordinates.

    Produced by ``fetch_jobs_for_companies`` (see ``app.db.repository``), which
    selects the company name and coordinates in the same round trip that already
    joins ``companies``. One instance carries a single job together with the
    additive company context the enrichment layer needs downstream, without the
    pricing strategies having to issue a second query.

    Attributes:
        job: The job posting ORM row.
        company_name: The owning company's name, or ``None`` when it is missing,
            empty, or not loaded (Requirement 5.3).
        company_lat: The company's latitude in decimal degrees, or ``None`` when
            unavailable.
        company_lng: The company's longitude in decimal degrees, or ``None`` when
            unavailable.
    """

    job: JobPosting
    company_name: str | None
    company_lat: float | None
    company_lng: float | None


@dataclass(frozen=True, slots=True)
class PricedJob:
    """A single job posting paired with its resolved commute pricing.

    ``PricedJob`` is the common currency of the pricing layer: both
    :class:`~app.strategies.exact.ExactMatchStrategy` and
    :class:`~app.strategies.fallback.FallbackEstimationStrategy` emit flat lists
    of these, which the orchestrator then filters, orders, paginates, and
    serializes (see design.md "Derived / in-memory types").

    The underlying :class:`~app.models.JobPosting` ORM row is held by reference
    rather than copied, so downstream assembly (task 12.2) can read every source
    field it needs -- ``job_id``, ``company_id``, ``job_title``, ``salary``,
    ``required_skills``, ``employment_type`` -- straight off ``job`` for
    ordering and response serialization, alongside the three pricing fields
    carried here.

    Attributes:
        job: The priced job posting. Access its ``job_id``, ``company_id``,
            ``job_title``, ``salary``, ``required_skills``, and
            ``employment_type`` for ordering and serialization.
        fare_thb: The total commute fare in Thai Baht, rounded to 2 decimal
            places. Exact for demo-company jobs, estimated otherwise.
        commute_time_mins: The commute duration in whole minutes.
        is_estimate: ``False`` when the pricing came from a matched Demo_Origin
            (exact), ``True`` when it was spatially estimated (Requirement
            3.11 / 2.5).
        company_name: The owning company's name, or ``None`` when missing, empty,
            or not loaded. Defaults to ``None`` so pre-existing constructors that
            omit the company fields remain valid (Requirements 5.1, 5.4).
        company_lat: The company's latitude in decimal degrees, or ``None`` when
            unavailable. Defaults to ``None``.
        company_lng: The company's longitude in decimal degrees, or ``None`` when
            unavailable. Defaults to ``None``.
    """

    job: JobPosting
    fare_thb: float
    commute_time_mins: int
    is_estimate: bool
    company_name: str | None = None
    company_lat: float | None = None
    company_lng: float | None = None
