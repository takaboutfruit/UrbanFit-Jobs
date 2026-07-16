"""Pydantic response schemas for the search endpoint.

Defines the response payload structure returned by ``GET /search``
(Requirement 5). The payload is a JSON object with two top-level keys:
``data`` (the paginated array of job records) and ``meta`` (the pagination
metadata).

Each :class:`JobResult` always serializes every field, including the six
source fields that may be missing in the underlying data. Missing source
values are serialized as ``null`` rather than omitted (Requirement 5.5), so
callers MUST NOT pass ``exclude_none=True`` when serializing these models.

See design.md "Response models" (Requirements 5.1-5.5).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CompanyLocation(BaseModel):
    """Geographic coordinates of a job's associated company (Requirement 5.4).

    Present on a :class:`JobResult` only when the associated company is loaded
    with both coordinates valid and in range; otherwise ``company_location`` is
    serialized as ``null`` (Requirement 5.5).

    Attributes:
        lat: Company latitude.
        lng: Company longitude.
    """

    lat: float
    lng: float


class TransitSegment(BaseModel):
    """A single leg of a multi-modal commute in travel order (Requirement 6.2).

    Attributes:
        mode: Transit mode label; recognized and unrecognized values alike are
            passed through unchanged (Requirement 6.5).
        minutes: Whole-minute duration of the segment, never negative
            (Requirement 6.7).
    """

    mode: str
    minutes: int = Field(ge=0)


class JobResult(BaseModel):
    """A single job posting priced with commute cost.

    The first six fields come directly from the source data and default to
    ``None`` when unavailable. They are always present in the serialized
    output as ``null`` rather than omitted (Requirement 5.5); do not serialize
    with ``exclude_none=True``.

    The commute pricing fields are always populated: ``fare_thb`` is rounded to
    two decimal places, ``commute_time_mins`` is a whole-minute integer, and
    ``is_estimate`` flags whether the commute values are estimated (``True``)
    or exact (``False``) (Requirement 5.4).

    The eight enrichment fields added by ``job-discovery-enrichment`` are always
    present in the serialized record (never omitted); each takes a ``null`` value
    when the input needed to populate it is unavailable (Requirement 9.4).
    ``per_trip_cost_baht`` and ``monthly_commute_cost_baht`` are always populated
    non-negative whole baht (Requirement 7). Do not serialize with
    ``exclude_none=True``.

    Attributes:
        job_id: Job posting identifier, or ``None`` when unavailable.
        company_id: Associated company identifier, or ``None`` when unavailable.
        job_title: Job title, or ``None`` when unavailable.
        salary: Salary value, or ``None`` when unavailable.
        required_skills: Required skills text, or ``None`` when unavailable.
        employment_type: Employment type, or ``None`` when unavailable.
        fare_thb: Commute fare in Thai Baht, rounded to two decimal places.
        commute_time_mins: Commute duration in whole minutes.
        is_estimate: ``True`` for fallback estimates, ``False`` for exact matches.
        skill_fit_score: Whole-number skill match in ``[0, 100]``, or ``None``
            when no desired skills or the job's required skills are null/blank.
        commute_fit_score: Whole-number commute fit in ``[0, 100]``, or ``None``
            when no ``max_time`` tolerance was supplied.
        company_name: Loaded company name, or ``None`` when missing/unavailable.
        company_location: Company coordinates, or ``None`` when unavailable.
        transit_segments: Ordered commute legs, or ``None`` when no leg-level
            transit source is available or parsing fails.
        per_trip_cost_baht: Single-trip commute cost in whole baht (non-negative).
        monthly_commute_cost_baht: Monthly commute cost in whole baht, derived
            from ``per_trip_cost_baht * 2 * 22`` and then adjusted by
            ``work_model`` (``* 0.4`` for ``"Hybrid"``, forced to ``0`` for
            ``"Remote"``), always non-negative.
        work_model: One of ``"On-site"``, ``"Hybrid"``, ``"Remote"``, or ``None``
            when unavailable/unmapped.
        years_experience_required: Whole years of required experience, or
            ``None`` when unavailable.
        career_growth_index: One of ``"High"``, ``"Medium"``, ``"Stable"``, or
            ``None`` when unavailable.
    """

    job_id: str | None = None
    company_id: int | None = None
    job_title: str | None = None
    salary: int | None = None
    required_skills: str | None = None
    employment_type: str | None = None
    fare_thb: float
    commute_time_mins: int
    is_estimate: bool
    # Added by job-discovery-enrichment (always present; null when unavailable).
    skill_fit_score: int | None = None
    commute_fit_score: int | None = None
    company_name: str | None = None
    company_location: CompanyLocation | None = None
    transit_segments: list[TransitSegment] | None = None
    per_trip_cost_baht: int
    monthly_commute_cost_baht: int
    work_model: str | None = None
    years_experience_required: int | None = None
    career_growth_index: str | None = None


class SearchMeta(BaseModel):
    """Pagination metadata for a search response (Requirement 5.2).

    Attributes:
        total_records: Count of all matched jobs before pagination limits.
        limit: The Pagination_Limit applied to this response.
        offset: The Pagination_Offset applied to this response.
    """

    total_records: int = Field(ge=0)
    limit: int
    offset: int


class SearchResponse(BaseModel):
    """Top-level search response payload (Requirement 5.1).

    Attributes:
        data: The paginated array of job records.
        meta: The pagination metadata.
    """

    data: list[JobResult]
    meta: SearchMeta
