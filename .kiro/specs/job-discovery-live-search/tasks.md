# Implementation Plan: Job Discovery Live Search

## Overview

This plan wires the existing `JobDiscoveryScreen` to the live `GET /search` backend
endpoint, replacing the hardcoded `sampleJobs`/`sampleHome` data source with a real
network round trip. Work proceeds bottom-up: build the pure domain layer (request
params, response contract, response parsing, field mapping) first, then the I/O
service, then the orchestration hook, then the presentational states, and finally
wire everything into `JobDiscoveryScreen` and `TransitMap`.

Per the workspace no-testing policy, this plan contains **no test-writing or
test-running tasks**. Verification is by build/type-check and code review against
the design's Correctness Properties, as recorded in the design's Testing Strategy.

## Tasks

- [x] 1. Widen the `Job` view model for the Unspecified_Work_Model state
  - In `frontend/src/domain/types.ts`, change `Job.workModel` from `WorkModel` to
    `WorkModel | null`, updating its doc comment to describe the null
    Unspecified_Work_Model state
  - _Requirements: 4.6_

- [x] 2. Add the backend response contract types
  - Create `frontend/src/domain/job-result.ts` with `CompanyLocationResult`,
    `TransitSegmentResult`, `JobResult`, `SearchMeta`, and `SearchResponse`
    interfaces, mirroring `backend/app/schemas/response.py` field-for-field
  - _Requirements: 4.1, 4.2_

- [x] 3. Add search-parameter construction and input validation
  - Create `frontend/src/domain/build-search-params.ts` with the constants
    `SEARCH_LIMIT` (100), `SEARCH_OFFSET` (0), `SEARCH_SORT` (`"fit"`), and
    `SEARCH_DEBOUNCE_MS` (400)
  - Implement `SearchParams` and `isValidSearchInput(home, toleranceMinutes)`,
    reusing `isValidCoordinate` from `domain/geo.ts` to check `home` and
    `Number.isFinite` to check `toleranceMinutes`
  - Implement `buildSearchParams(home, toleranceMinutes)` returning a `SearchParams`
    object with `lat`/`lng` from `home`, `max_time` from `toleranceMinutes`, and
    `sort`/`limit`/`offset` fixed to `SEARCH_SORT`/`SEARCH_LIMIT`/`SEARCH_OFFSET`
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4. Add response envelope parsing
  - Create `frontend/src/domain/parse-search-response.ts` with a
    `MalformedResponseError` class extending `Error`
  - Implement `parseSearchResponse(json: unknown): SearchResponse`, throwing
    `MalformedResponseError` when `json` is not an object, when `data` is not an
    array, or when `meta` is missing/not an object or its `total_records`/`limit`/
    `offset` are not numbers; otherwise return the typed `SearchResponse`
  - _Requirements: 5.2_

- [x] 5. Add the Field_Mapper
  - Create `frontend/src/domain/map-job-result.ts` with a `WORK_MODEL_LOOKUP`
    record mapping the exact strings `"On-site"`, `"Hybrid"`, `"Remote"` to
    themselves
  - Implement `mapWorkModel(workModel: string | null): WorkModel | null` using a
    case-sensitive lookup in `WORK_MODEL_LOOKUP`, returning `null` for `null` or
    any unrecognized string (Requirement 4.6)
  - Implement `mapJobResult(result: JobResult): Job` mapping every field per the
    design's strict relationships table: `job_id` -> `id`, `commute_time_mins` ->
    `commutingMinutes`, `per_trip_cost_baht` -> `perTripCostBaht`,
    `monthly_commute_cost_baht` -> `monthlyCommuteCostBaht`, `skill_fit_score` ->
    `skillFitScore`, `commute_fit_score` -> `commuteFitScore`, `transit_segments` ->
    `transitSegments`, `company_location` -> `location`; `job_title` falls back to
    a fixed non-empty placeholder when null (Requirement 4.3), `company_name`
    falls back to a fixed non-empty placeholder when null (Requirement 4.4),
    `salary` falls back to exactly `0` when null (Requirement 4.5); set the
    deprecated `urbanFitScore`, `lifestyleFitScore`, `routeDescription`,
    `monthlyTravelCostBaht` fields to their deterministic defaults (`0`/`""`)
  - Implement `mapSearchResponse(response: SearchResponse): Job[]` mapping every
    entry in `response.data` via `mapJobResult`, preserving order
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6. Add the placeholder and status i18n keys
  - In `frontend/src/i18n/keys.ts`, add `jobTitleUnavailable`,
    `companyNameUnavailable`, `discoveryLoading`, `discoveryErrorMessage`, and
    `discoveryRetryAction` keys under the Screen 1 section
  - In `frontend/src/i18n/strings.ts`, add a Thai (`th`) and non-empty `default`
    entry for each new key
  - Wire `mapJobResult`'s placeholder fallbacks (task 5) to
    `resolveText(K.jobTitleUnavailable, strings)` and
    `resolveText(K.companyNameUnavailable, strings)`
  - _Requirements: 4.3, 4.4_

- [x] 7. Checkpoint - verify domain layer build
  - Run the frontend build/type-check to confirm the new domain modules, the
    widened `Job.workModel` type, and their imports/exports are internally
    consistent
  - Review `buildSearchParams`, `isValidSearchInput`, `parseSearchResponse`,
    `mapWorkModel`, and `mapJobResult` against Properties 1, 2, 5, 6, 7, 8 in the
    design by inspection
  - Ask the user if questions arise. (No tests are written or run, per the
    workspace no-testing policy.)

- [x] 8. Add the Job_Search_Client I/O layer
  - Create `frontend/src/services/job-search-client.ts` with `API_BASE_URL` read
    from `import.meta.env.VITE_API_BASE_URL`, defaulting to
    `"http://localhost:8000"`
  - Add `SearchRequestError`, `NetworkError`, and `HttpStatusError` (carrying the
    HTTP `status`) error classes
  - Implement `fetchJobSearch(params: SearchParams, signal: AbortSignal):
    Promise<SearchResponse>`: build the `/search` URL with `lat`, `lng`,
    `max_time`, `sort`, `limit`, `offset` query parameters; call `fetch` with the
    given `signal`; re-throw `AbortError` unchanged; wrap other fetch failures as
    `NetworkError`; throw `HttpStatusError` on a non-2xx response; parse the JSON
    body (wrapping a JSON-parse failure as `MalformedResponseError`) and return
    `parseSearchResponse(json)`
  - Add a `VITE_API_BASE_URL` entry to `frontend/.env.example`
  - _Requirements: 1.3, 1.4, 5.2_

- [x] 9. Add the `useJobSearch` orchestration hook
  - Create `frontend/src/screens/discovery/useJobSearch.ts` exporting
    `SearchStatus` (`"loading" | "error" | "success"`), `UseJobSearchResult`
    (`{ jobs, status, retry }`), and `useJobSearch(home, toleranceMinutes)`
  - Implement the debounce: combine `home`/`toleranceMinutes` into one dependency
    and reset a single `SEARCH_DEBOUNCE_MS` (400ms) timer on every change to
    either value, so a change to both within the window collapses into one
    scheduled evaluation of the latest pair
  - Implement the validation gate: when the debounce timer fires, check
    `isValidSearchInput`; if it fails, issue no request and leave `jobs`/`status`
    unchanged
  - Implement generation tracking and abort: a `useRef` generation counter
    incremented on every issued request; issuing generation N calls `.abort()` on
    generation N-1's still-pending `AbortController` before starting the new
    `fetchJobSearch` call; set `status` to `"loading"` synchronously when a
    request is issued
  - Implement apply-on-resolve: when a request settles, compare its generation to
    the current generation; discard the outcome (including an `AbortError`) if
    it is not current; otherwise set `status`/`jobs` from a success via
    `mapSearchResponse`, or set `status = "error"` (leaving `jobs` unchanged) on a
    non-abort failure
  - Run the debounce/validate/issue pipeline once on mount with the initial
    `home`/`toleranceMinutes`
  - Implement `retry()` to immediately re-run the validate/issue steps with the
    current `home`/`toleranceMinutes`, bypassing the debounce wait
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.3, 5.4_

- [x] 10. Checkpoint - verify hook build and review stateful properties
  - Run the frontend build/type-check to confirm `useJobSearch` compiles against
    its declared interface and every call site type-checks
  - Trace `useJobSearch`'s debounce, generation-counter, and abort wiring by hand
    against Properties 3 and 4 (simultaneous home+tolerance changes; out-of-order
    response arrival)
  - Ask the user if questions arise. (No tests are written or run, per the
    workspace no-testing policy.)

- [x] 11. Add the Loading_State and Error_State presentational components
  - Create `frontend/src/screens/discovery/LoadingState.tsx` exporting
    `LoadingState()`, rendering `role="status"` with the `K.discoveryLoading` text
  - Create `frontend/src/screens/discovery/ErrorState.tsx` exporting
    `ErrorStateProps` (`{ onRetry: () => void }`) and `ErrorState({ onRetry })`,
    rendering `role="alert"` with the `K.discoveryErrorMessage` text and a
    `<button>` labeled with `K.discoveryRetryAction` that calls `onRetry`
  - Export both from `frontend/src/screens/discovery/index.ts`
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 12. Remove the commute-boundary pin gate in `TransitMap`
  - In `frontend/src/screens/discovery/TransitMap.tsx`, remove the
    `filterJobsByCommuteBoundary(plottable, home, toleranceMinutes)` call and use
    `plottable` directly as the map-pins source, so every job with a valid
    `location` gets a pin regardless of `toleranceMinutes`
  - Leave `IsochroneOverlay`, the home marker, the legend, and the
    unplottable/no-locations messages unchanged
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 13. Wire `useJobSearch` into `JobDiscoveryScreen`
  - In `frontend/src/screens/JobDiscoveryScreen.tsx`, remove the in-file
    `sampleJobs` array and `sampleHome` constant
  - Replace the `commuteBoundaryJobs` derivation (the
    `filterJobsByCommuteBoundary` call) with `useJobSearch(home, toleranceMinutes)`
    when the screen is rendered without an explicit `jobs` prop; keep
    `JobDiscoveryScreenProps`'s existing `jobs?`/`home?`/`initialToleranceMinutes?`
    shape for backward compatibility
  - Derive `isochronePins` directly from the live `jobs` (no boundary gate) and
    derive `visibleJobs` as
    `orderByCommuteFit(filterJobsByViewport(jobs, viewportBounds))`
  - In the job-list region, render `LoadingState` when `status === "loading"`,
    `ErrorState` (wired to the hook's `retry`) when `status === "error"`, and the
    existing `JobList` (with its own empty-state) when `status === "success"`;
    leave the map region driven by `jobs` regardless of `status`
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 5.1, 5.5, 5.6, 6.1, 6.2, 6.3_

- [x] 14. Checkpoint - verify full build and final property review
  - Run the frontend build/type-check (`npm run build`) to confirm every new and
    modified module (domain layer, service, hook, presentational components,
    `JobDiscoveryScreen`, `TransitMap`) compiles together with no type errors
  - Review the `JobDiscoveryScreen` list-region branch against Property 9 and the
    `TransitMap` pin derivation against Property 10 by inspection
  - Manually compare `domain/job-result.ts` field-by-field against
    `backend/app/schemas/response.py` to confirm the mirrored contract is accurate
  - Ask the user if questions arise. (No tests are written or run, per the
    workspace no-testing policy.)

## Notes

- Per the workspace no-testing policy, this plan contains no test-writing or
  test-running tasks; verification is by build/type-check and code review only.
- Each task references specific requirements for traceability.
- This feature is frontend-only: no backend file is modified.
- The domain layer (tasks 1-6) is pure and framework-agnostic, which keeps the
  request-building, parsing, and mapping logic reviewable by inspection against
  the design's Correctness Properties.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4"] },
    { "id": 1, "tasks": ["5"] },
    { "id": 2, "tasks": ["6", "7"] },
    { "id": 3, "tasks": ["8"] },
    { "id": 4, "tasks": ["9", "12"] },
    { "id": 5, "tasks": ["10", "11"] },
    { "id": 6, "tasks": ["13"] },
    { "id": 7, "tasks": ["14"] }
  ]
}
```
