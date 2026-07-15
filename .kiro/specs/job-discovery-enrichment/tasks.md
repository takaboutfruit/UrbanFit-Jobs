# Implementation Plan: Job Discovery Enrichment

## Overview

This plan additively extends the existing `GET /search` endpoint so the Candidate
Job Discovery screen can be hydrated from a single call. The work proceeds from the
data layer outward: extend the `Company` model and loader to carry a name, carry
company data through the in-memory types and pricing strategies, build a pure
enrichment layer for the derived fields, extend the request/response schemas, and
finally wire enrichment plus fit-ordering into the orchestrator's assembly pipeline.

Per the workspace no-testing policy, this plan contains **no test-writing or
test-running tasks**. Verification is by build/type-check and code review against
the design's Correctness Properties, as recorded in the design's Testing Strategy.

## Tasks

- [x] 1. Extend company data to carry a name
  - [x] 1.1 Add a nullable `name` column to the `Company` model
    - In `backend/app/models/company.py`, add `name: Mapped[str | None] = mapped_column(nullable=True)` alongside the existing `id`, `latitude`, `longitude`, and `geog` columns
    - Keep all existing columns and their nullability unchanged (additive only)
    - _Requirements: 5.2_

  - [x] 1.2 Map the `ชื่อนิติบุคคล` column into `Company.name` in the loader
    - In `backend/app/db/loader.py`, update `load_companies` to read `row.get("ชื่อนิติบุคคล")` and pass it through `_clean_str` into the `Company.name` field
    - Ensure empty/whitespace values resolve to `None`; leave all other loader routines unchanged
    - _Requirements: 5.2, 5.3_

- [x] 2. Carry company info through in-memory types
  - [x] 2.1 Add `JobWithCompany` and extend `PricedJob`
    - In `backend/app/strategies/types.py`, add a frozen `JobWithCompany` dataclass with fields `job`, `company_name: str | None`, `company_lat: float | None`, `company_lng: float | None`
    - Extend `PricedJob` with optional `company_name`, `company_lat`, `company_lng` fields defaulting to `None` so existing constructors remain valid
    - _Requirements: 5.1, 5.4_

- [x] 3. Extend the data-access query
  - [x] 3.1 Select company name and coordinates in `fetch_jobs_for_companies`
    - In `backend/app/db/repository.py`, extend the existing `select(...)` to also select `Company.name`, `Company.latitude`, and `Company.longitude` on the current INNER JOIN
    - Map each row into a `JobWithCompany` (job + company_name + company_lat + company_lng), preserving the INNER JOIN referential-integrity behavior
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 4. Build the pure enrichment layer
  - [x] 4.1 Create `enrichment.py` with constants, token normalization, and fit scores
    - Create `backend/app/services/enrichment.py`
    - Add constants `WORK_MODEL_MAP`, `TRIPS_PER_DAY = 2`, `WORKING_DAYS_PER_MONTH = 22`, `DESIRED_SKILLS_MAX_TOKENS = 50`
    - Implement `normalize_skill_tokens(raw)`: split on commas, strip, drop empties, case-fold for comparison, de-duplicate preserving first-seen order; return `[]` for `None`/blank
    - Implement `compute_skill_fit(desired, required_skills)`: `None` when desired is empty or `required_skills` is null/blank; else `round(100 * matched / len(desired))` clamped to `0..100`, matching tokens case-insensitively after trimming
    - Implement `compute_commute_fit(commute_time_mins, max_time)`: `None` when `max_time` is `None`; else `clamp(round(100 * (max_time - t) / max_time), 0, 100)`; `100` when `t == 0`; `0` when `t >= max_time`
    - _Requirements: 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Add work-model, cost, overall-fit, and transit derivations to `enrichment.py`
    - Implement `derive_work_model(employment_type)`: case-insensitive lookup in `WORK_MODEL_MAP`; `None` when null/blank/unmapped (no fallback default)
    - Implement `per_trip_cost_baht(fare_thb)`: round to nearest whole baht, floored at 0 (non-negative whole number)
    - Implement `monthly_commute_cost_baht(per_trip)`: `per_trip * TRIPS_PER_DAY * WORKING_DAYS_PER_MONTH`
    - Implement `overall_fit_score(commute_fit, skill_fit)`: arithmetic mean of the non-null values; `None` when both are `None`
    - Implement `parse_transit_segments(source)`: ordered segments for a well-formed leg-level source; `None` when source is absent or parsing fails (never `[]` for these cases); pass unrecognized mode strings through unchanged; ensure each `minutes` is a whole number `>= 0`
    - _Requirements: 4.4, 4.5, 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_

- [x] 5. Extend the request and response schemas
  - [x] 5.1 Add `desired_skills` and `sort` to the request schema
    - In `backend/app/schemas/request.py`, add `desired_skills: str | None` with `max_length=500` and `sort: SortMode | None` where `SortMode = Literal["fit", "default"]`
    - Add a `field_validator` on `desired_skills` that calls `normalize_skill_tokens` and raises `ValueError` when the token count exceeds `DESIRED_SKILLS_MAX_TOKENS` (surfaced by FastAPI as HTTP 422)
    - Keep all pre-existing fields and constraints unchanged so omitted params behave exactly as before
    - _Requirements: 1.1, 1.4, 1.5, 4.1, 4.3_

  - [x] 5.2 Add the enriched fields and nested models to the response schema
    - In `backend/app/schemas/response.py`, add `CompanyLocation(lat, lng)` and `TransitSegment(mode: str, minutes: int = Field(ge=0))` models
    - Extend `JobResult` with the eight added fields: `skill_fit_score`, `commute_fit_score`, `company_name`, `company_location`, `transit_segments`, `per_trip_cost_baht`, `monthly_commute_cost_baht`, `work_model`
    - Keep every pre-existing `JobResult`, `SearchMeta`, and `SearchResponse` field unchanged; do not serialize with `exclude_none=True` so nulls are emitted rather than dropped
    - _Requirements: 5.1, 6.1, 7.1, 8.1, 9.1, 9.2, 9.3, 9.4_

- [x] 6. Attach company info in the pricing strategies
  - [x] 6.1 Populate company fields in `ExactMatchStrategy`
    - In `backend/app/strategies/exact.py`, pass the `company_name`, `company_lat`, and `company_lng` from each `JobWithCompany` row into the constructed `PricedJob`
    - Leave all pricing and selection logic unchanged
    - _Requirements: 5.1, 5.4_

  - [x] 6.2 Populate company fields in `FallbackEstimationStrategy`
    - In `backend/app/strategies/fallback.py`, pass the `company_name`, `company_lat`, and `company_lng` from each `JobWithCompany` row into the constructed `PricedJob`
    - Leave all pricing and estimation logic unchanged
    - _Requirements: 5.1, 5.4_

- [x] 7. Wire enrichment and fit-ordering into the orchestrator
  - [x] 7.1 Extend `HybridRouter._assemble_response` with enrichment, ordering, and serialization
    - In `backend/app/strategies/router.py`, after `_apply_filters`, enrich each `PricedJob` using the enrichment layer plus request context (`desired_skills`, `max_time`) to build the derived fields
    - Exclude jobs whose `job_id` is missing/null before counting `total_records`
    - Add a fit-ordering branch: when `sort == "fit"`, order by `overall_fit_score` descending with unavailable (both-null) scores last, ties broken by `company_name` ascending (NULLS LAST) then `job_id` ascending; when `sort` is omitted or `"default"`, apply the existing `_order` unchanged
    - Resolve `company_location` to `CompanyLocation(lat, lng)` only when coordinates are present and in range (lat ∈ [-90, 90], lng ∈ [-180, 180]); otherwise `null`
    - Apply pagination (`offset`/`limit`) after ordering using existing semantics, then serialize enriched `JobResult` records (nulls preserved)
    - _Requirements: 2.8, 3.6, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.3, 5.4, 5.5, 6.1, 6.6, 7.1, 8.1, 9.3, 9.4, 9.5, 9.6_

- [x] 8. Checkpoint - verify build and review against properties
  - Run the backend build/type-check to confirm the extended models, schemas, and function signatures are internally consistent
  - Review each pure enrichment function against its Correctness Property (formula, bounds, nullability) and confirm the default-sort path leaves ordering and pre-existing field values untouched
  - Ask the user if questions arise. (No tests are written or run, per the workspace no-testing policy.)

## Notes

- Per the workspace no-testing policy, this plan contains no test-writing or
  test-running tasks; verification is by build/type-check and code review only.
- Each task references specific requirements for traceability.
- All changes are additive: no pre-existing field, ordering, or `meta` structure is
  removed or renamed, preserving backward compatibility (Requirement 9).
- The enrichment layer is pure and framework-agnostic, which keeps the derivation
  logic reviewable by inspection against the design's Correctness Properties.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1", "5.2"] },
    { "id": 1, "tasks": ["1.2", "3.1", "4.2", "5.1", "6.1", "6.2"] },
    { "id": 2, "tasks": ["7.1"] }
  ]
}
```
