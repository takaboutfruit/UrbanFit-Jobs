# Implementation Plan: Hybrid Routing Search

## Overview

This plan builds a FastAPI `GET /search` endpoint backed by PostGIS via SQLAlchemy + GeoAlchemy2. Implementation proceeds bottom-up: project scaffolding and database session, then SQLAlchemy spatial models, a one-time CSV loader, Pydantic request/response contracts, the parameterized data-access repository, the external time-estimation client, the two pricing strategies, the orchestrating router with shared filter/order/paginate assembly, and finally the transport route wired into the app.

Per the workspace no-testing policy (`.kiro/steering/no-testing.md`), no automated test tasks are included. Each implementation task is verified by build/type-check and by manual reasoning against the design's Correctness Properties. Property references in the tasks below (e.g. "Property 5") point to the design invariants that a reviewer must confirm the code upholds — they are review checklists, not test specifications.

## Tasks

- [x] 1. Set up backend project structure and configuration
  - Create the `backend/` package layout: `app/` (with `models/`, `schemas/`, `strategies/`, `services/`, `db/`), `app/main.py`, and `app/config.py`
  - Add dependencies (FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.x async, GeoAlchemy2, asyncpg, httpx) to `backend/pyproject.toml` or `requirements.txt` with pinned versions
  - Define `app/config.py` settings (database URL, Google Distance Matrix API key/URL, constants: Hero_Radius=500, Spatial_Bounding_Radius=20000, Last_Mile_Threshold=800, Candidate_Company_Limit=25, time-service timeout=1.5s)
  - _Requirements: 6.5_

- [x] 2. Implement the async database session and PostGIS engine setup
  - Create `app/db/session.py` with the async SQLAlchemy engine, `async_sessionmaker`, and a `get_session` dependency
  - Create `app/db/base.py` with the declarative `Base`
  - _Requirements: 6.3, 6.5_

- [x] 3. Implement SQLAlchemy spatial data models
  - [x] 3.1 Implement the Company model
    - Define `app/models/company.py` with `id` (int PK), `latitude`, `longitude`, and a GeoAlchemy2 `geog: Geography(Point, 4326)` column with a GiST index
    - _Requirements: 7.1_

  - [x] 3.2 Implement the Job_Posting model
    - Define `app/models/job_posting.py` with `job_id` (PK), `company_id` (FK → companies.id), `job_title`, `salary`, `required_skills`, `employment_type`
    - _Requirements: 7.2_

  - [x] 3.3 Implement the Station model
    - Define `app/models/station.py` with `station_code`, `station_name`, `latitude`, `longitude`, and a GiST-indexed `geog: Geography(Point, 4326)` column
    - _Requirements: 7.3_

  - [x] 3.4 Implement the Demo_Origin model
    - Define `app/models/demo_origin.py` with `origin_station`, `origin_lat`, `origin_lng`, `company_id` (FK → companies.id), `exact_fare_thb`, `exact_time_mins`, and a GiST-indexed `geog` column derived from `(origin_lng, origin_lat)`
    - Export all models from `app/models/__init__.py`
    - _Requirements: 7.4_

- [x] 4. Implement the CSV data loader
  - [x] 4.1 Implement coordinate normalization and validation helpers
    - In `app/db/loader.py`, add helpers to cast float company ids (e.g. `7.0`) to int and to validate that latitude ∈ [-90, 90] and longitude ∈ [-180, 180], returning invalid/empty coordinates as skip signals
    - Manual review target: **Property 16** (load-time data validity)
    - _Requirements: 7.5, 7.6_

  - [x] 4.2 Implement per-table load routines with integrity enforcement
    - Load `company_locations_cleaned_ready.csv` → companies (mapping `id`, `latitude`, `longitude`; building `geog`), skipping coordinate-invalid rows
    - Load `coordinate_station.csv` → stations (mapping `Station_Code`, `Station_Name_EN`, `Latitude`, `Longitude`), excluding empty/out-of-range coordinate rows (e.g. station `A10`)
    - Load `mock_job_postings.csv` → job_postings and `demo_routes.csv` → demo_origins, skipping rows whose `company_id` has no matching Company (dangling FK)
    - Manual review target: **Property 16**
    - _Requirements: 7.5, 7.6, 7.7_

- [x] 5. Implement Pydantic request and response schemas
  - [x] 5.1 Implement the SearchQuery request model
    - Define `app/schemas/request.py` `SearchQuery` with `lat` (−90..90, required), `lng` (−180..180, required), `max_fare` (0.01..999999.99, optional), `max_time` (int 1..1440, optional), `limit` (int 1..200, default 50), `offset` (int ≥0, default 0) so FastAPI returns HTTP 422 with per-field detail on invalid input
    - Manual review target: **Property 1** (input validation gates all searches)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 5.2 Implement the response models
    - Define `app/schemas/response.py` with `JobResult` (all six source fields as nullable, plus `fare_thb` 2 dp, `commute_time_mins` int, `is_estimate` bool), `SearchMeta` (`total_records`, `limit`, `offset`), and `SearchResponse` (`data`, `meta`); ensure missing source values serialize as `null` not omitted
    - Manual review target: **Property 14** (record shape and null-preservation)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Checkpoint - verify models and schemas compile
  - Run the project's type-check/build and import the models and schemas to confirm ORM mapping and Pydantic contracts construct without error. Ensure the build passes; ask the user if questions arise.

- [x] 7. Implement the data-access repository
  - [x] 7.1 Implement the demo-origin proximity query
    - In `app/db/repository.py`, implement `find_nearest_demo_origin(user_point)` using `ST_DWithin(geog, user_point, 500)` ordered by `ST_Distance` asc then `company_id` asc, `LIMIT 1`
    - Manual review target: **Property 2** (proximity-determined, deterministic tie-break)
    - _Requirements: 2.1, 2.6, 2.7_

  - [x] 7.2 Implement the fallback candidate-selection query
    - Implement `select_fallback_candidates(user_point, max_fare)` as a single CTE/LATERAL statement: user's nearest station, per-company nearest station, train fare `15 + 2.5*d_km`, last-mile surcharge when company >800 m from its station, `max_fare` filter, then top-25 by station-to-station distance; return company id, coordinates, `fare_thb`, and `station_to_station_km`
    - Clamp distances feeding fare formulas to be non-negative
    - Manual review targets: **Property 5, 6, 7, 8** (fare formulas, fare-filter-before-top-25, ≤25 closest)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.3, 4.7, 6.4_

  - [x] 7.3 Implement the set-based job-fetch query
    - Implement `fetch_jobs_for_companies(company_ids)` as one `SELECT ... INNER JOIN companies WHERE company_id IN (:ids)`, enforcing referential integrity and staying within the query budget
    - Manual review targets: **Property 15** (query budget), **Property 16** (dangling FK exclusion via INNER JOIN)
    - _Requirements: 6.1, 6.2, 6.3, 7.7_

- [x] 8. Implement the Time_Estimation_Service client
  - In `app/services/time_client.py`, implement `TimeEstimationClient` wrapping the Google Distance Matrix API: single origin, up to 25 destinations, `httpx.AsyncClient` with `timeout=1.5`; raise `TimeEstimationError` on non-200, malformed payload, per-element error status, or timeout
  - Provide a helper that maps returned durations to whole-minute `commute_time_mins`
  - Manual review targets: **Property 9** (whole-minute rounding), **Property 11** (timeout containment source)
  - _Requirements: 3.8, 3.9_

- [x] 9. Implement the Fallback_Estimation strategy
  - In `app/strategies/fallback.py`, implement `FallbackEstimationStrategy` that: calls `select_fallback_candidates`, invokes the time client for the ≤25 pool, applies the `max_time` filter after estimation, sets `is_estimate = true`, and returns a flat list of `PricedJob`
  - Define the `CandidateCompany` and `PricedJob` in-memory types (e.g. `app/strategies/types.py`)
  - When fallback is the *selected* strategy, propagate `TimeEstimationError` so the caller can return HTTP 502 with no records
  - Manual review targets: **Property 8, 9, 11**
  - _Requirements: 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 4.2, 4.4, 4.8_

- [x] 10. Implement the Exact_Match strategy
  - In `app/strategies/exact.py`, implement `ExactMatchStrategy` that prices the matched demo company's jobs from `exact_fare_thb`/`exact_time_mins` with `is_estimate = false` (only for the matched `company_id`), and runs the fallback strategy best-effort for other companies with `is_estimate = true`
  - Catch `TimeEstimationError` from the best-effort fallback: omit those records, keep the exact demo jobs, and never surface a 502; if the matched company has no jobs, return only fallback results — all HTTP 200
  - Manual review targets: **Property 3** (exact pricing/flag), **Property 4** (best-effort never fails exact response)
  - _Requirements: 2.3, 2.4, 2.5, 2.8, 2.9_

- [x] 11. Checkpoint - verify data-access and strategy layers
  - Type-check/build the repository, time client, and strategy modules; review the generated SQL for the CTE candidate query against the fare/top-25 invariants. Ensure the build passes; ask the user if questions arise.

- [x] 12. Implement the HybridRouter orchestrator with shared assembly
  - [x] 12.1 Implement strategy selection and delegation
    - In `app/strategies/router.py`, implement `select_strategy(query, db)` returning `("exact", demo_origin)` or `("fallback", None)`, then `search_jobs(query, db)` delegating to the chosen strategy to produce the merged `PricedJob` list
    - Manual review target: **Property 2**
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1_

  - [x] 12.2 Implement shared filter, ordering, pagination, and meta assembly
    - Apply combined fare/time retention, deterministic ordering (`is_estimate` asc, `fare_thb` asc, `commute_time_mins` asc, `company_id` asc, `job_id` asc), then offset/limit slicing with `total_records` = pre-pagination count; return empty `data` with valid `meta` when nothing matches or `offset >= total`
    - Manual review targets: **Property 10** (combined filter retention), **Property 12** (deterministic total order), **Property 13** (pagination slice correctness)
    - _Requirements: 4.5, 4.6, 4.9, 4.10, 5.6, 5.7, 5.8, 5.9_

- [x] 13. Implement the transport route and wire the application together
  - In `app/api/search.py`, define `search_router` exposing `GET /search` binding `SearchQuery` (auto-422), injecting the DB session, invoking `HybridRouter.search_jobs`, and returning `SearchResponse`
  - Map `TimeEstimationError` from a fallback-selected request to HTTP 502; register the router and startup wiring in `app/main.py`
  - Manual review targets: **Property 1**, **Property 11**, **Property 15**
  - _Requirements: 1.9, 3.12, 5.1, 6.3_

- [x] 14. Final checkpoint - full build/type-check and property review
  - Run the full build/type-check, import the app to confirm route registration and schema construction, and walk each Correctness Property (1–16) against the implementation. Ensure the build passes; ask the user if questions arise.

## Notes

- No automated test tasks are included per the workspace no-testing policy; verification is by build/type-check and manual reasoning against the design's Correctness Properties.
- "Manual review target" annotations map each task to the design invariants a reviewer must confirm — they are review checklists, not tests.
- Each task references specific requirements (granular sub-requirements) for traceability.
- Checkpoints ensure incremental validation via build/type-check at reasonable breaks.
- Constants (Hero_Radius, Spatial_Bounding_Radius, Last_Mile_Threshold, Candidate_Company_Limit, timeout) are centralized in config for single-source consistency.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["4.1", "5.1", "5.2", "8"] },
    { "id": 3, "tasks": ["4.2", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["9"] },
    { "id": 5, "tasks": ["10"] },
    { "id": 6, "tasks": ["12.1", "12.2"] },
    { "id": 7, "tasks": ["13"] }
  ]
}
```
