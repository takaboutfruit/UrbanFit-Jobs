# Requirements Document

## Introduction

The Candidate Job Discovery screen (`frontend/src/screens/JobDiscoveryScreen.tsx`) currently renders a hardcoded 23-entry sample job list and a hardcoded home coordinate. The backend `GET /search` endpoint (completed by `hybrid-routing-search` and extended by `job-discovery-enrichment`) already returns real, commute-priced, fit-scored job data in a shape that closely matches the frontend `Job` view model. This feature wires the screen to that live endpoint, replacing the sample dataset end to end: issuing the request, mapping the response into `Job` records, and covering the loading/empty/error states that a real network call introduces but a static array never needed[cite: 6].

This feature is frontend-only. It does not modify the backend, and it does not touch Screens 2-4 (Assessment, Radar, HR Dashboard) or any deployment/infrastructure concern[cite: 6].

Per the workspace no-testing policy, this specification does not include testing tasks, and the acceptance criteria below are documented for correctness reasoning rather than for automated test generation[cite: 6].

### Key decisions made while drafting these requirements

The following decisions resolve gaps between the existing sample-data design and the live endpoint's contract. Each is written into the acceptance criteria below and can be revisited in review:

1. **Tolerance drives `max_time`, not a client-side geometric gate.** Today, a job only qualifies (as a pin or a list card) when it is both within `toleranceMinutes` AND inside a hand-tuned, hardcoded isochrone polygon (`filterJobsByCommuteBoundary`) tuned specifically for the sample dataset's coordinates[cite: 6]. That polygon has no relationship to real Bangkok geography or the backend's actual commute-time calculation, so applying it to live data would incorrectly hide genuinely qualifying jobs[cite: 6]. This feature sends `toleranceMinutes` to the backend as the `max_time` query parameter (the backend already filters by it and computes `commute_fit_score` against it) and stops using the geometric isochrone polygon to exclude live jobs[cite: 6]. The polygon/boundary visual overlay may continue to render on the map as a decorative element, but it MUST NOT remove a job from the pins or the list[cite: 6].
2. **Desired-skills input is deferred.** The screen has no UI for collecting desired skills today[cite: 6]. This feature does not add one; it does not send `desired_skills`, so `skill_fit_score` will be `null` for every job (a value the `Job` view model already supports)[cite: 6]. Adding a desired-skills input is left to a future feature[cite: 6].
3. **Fit-based server sorting is required.** To prevent the pagination-sorting paradox where the top-performing jobs are truncated before the client can sort them, the screen MUST request `sort=fit` from the server. The client-side sorting remains as a secondary viewport tie-breaker.
4. **Pagination beyond the first page is deferred.** The screen requests a single page large enough to cover the realistic result set for a demo dataset and does not implement "load more"/infinite scroll[cite: 6]. `total_records` beyond that page is not surfaced in this feature[cite: 6].
5. **The candidate home coordinate keeps its current source.** The screen already accepts `home` as a prop with a default coordinate (today `sampleHome`); this feature reuses that same coordinate as the source of the `lat`/`lng` query parameters rather than introducing a new home-selection mechanism (out of scope; a future onboarding feature owns that)[cite: 6].
6. **Backend nulls are mapped to explicit fallback presentation, not dropped.** `job_title`, `company_name`, `salary`, and `work_model` are nullable in the backend response but non-nullable (except `work_model`, addressed below) in today's `Job` view model[cite: 6]. Rather than silently excluding jobs with missing fields (which would hide real results), this feature defines an explicit fallback/placeholder value for each nullable text/number field, and extends `workModel` to accept `null` (rendered as an "unspecified" state) so a job is never dropped from the list solely because one enrichment field is missing[cite: 6].

## Glossary

- **Job_Discovery_Screen**: The existing `JobDiscoveryScreen` React component (Screen 1) that this feature wires to live data[cite: 6].
- **Search_Endpoint**: The existing backend `GET /search` HTTP endpoint (see `backend/app/api/search.py`) that returns commute-priced, fit-scored job postings[cite: 6].
- **Job_Search_Client**: The frontend module introduced by this feature that issues a request to the Search_Endpoint and returns the parsed response (or an error) to the Job_Discovery_Screen[cite: 6].
- **Job_Result**: A single job record as returned by the Search_Endpoint's `data` array, per `backend/app/schemas/response.py`[cite: 6].
- **Job_View_Model**: The existing frontend `Job` type (`frontend/src/domain/types.ts`) that the Job_Discovery_Screen renders[cite: 6].
- **Field_Mapper**: The frontend function introduced by this feature that transforms a Job_Result into a Job_View_Model[cite: 6].
- **Candidate_Home**: The candidate's home/residence coordinate, sourced from the Job_Discovery_Screen's existing `home` prop, used as the `lat`/`lng` query parameters[cite: 6].
- **Commute_Tolerance**: The existing `toleranceMinutes` state owned by the Job_Discovery_Screen, sent to the Search_Endpoint as the `max_time` query parameter[cite: 6].
- **Search_Request**: One outbound HTTP request from the Job_Search_Client to the Search_Endpoint, parameterized by Candidate_Home, Commute_Tolerance, and `sort=fit`.
- **Debounce_Window**: The fixed 400-millisecond delay the Job_Discovery_Screen waits after the most recent Commute_Tolerance change before issuing a new Search_Request, so rapid slider movement does not issue one Search_Request per intermediate value[cite: 6].
- **Stale_Response**: A Search_Endpoint response that arrives after a newer Search_Request (for a different Candidate_Home/Commute_Tolerance combination) has already been issued or aborted[cite: 6].
- **Loading_State**: The Job_Discovery_Screen's rendered state while a Search_Request is in flight and no Stale_Response condition applies to it[cite: 6].
- **Error_State**: The Job_Discovery_Screen's rendered state after a Search_Request fails (network failure, non-2xx HTTP status, or malformed response body)[cite: 6].
- **Retry_Action**: A user-triggerable control shown in the Error_State that re-issues the most recent Search_Request[cite: 6].
- **Unspecified_Work_Model**: The rendered state for a job whose `work_model` field is `null` (representing an unspecified/unmapped state)[cite: 6].

## Requirements

### Requirement 1: Fetch live jobs instead of the sample dataset

**User Story:** As a candidate, I want the Job Discovery screen to show real job postings from the backend, so that the jobs I see reflect actual data instead of a fixed demo list[cite: 6].

#### Acceptance Criteria

1. THE Job_Discovery_Screen SHALL render jobs sourced from the Search_Endpoint via the Job_Search_Client rather than from an in-file sample dataset[cite: 6].
2. WHEN the Job_Discovery_Screen mounts with a valid Candidate_Home, THE Job_Search_Client SHALL issue a Search_Request using that Candidate_Home and the current Commute_Tolerance[cite: 6].
3. WHEN the Job_Search_Client issues a Search_Request, THE Job_Search_Client SHALL include the Candidate_Home latitude and longitude as the `lat` and `lng` query parameters, the current Commute_Tolerance as the `max_time` query parameter, and the `sort` query parameter set strictly to `"fit"`.
4. WHEN the Job_Search_Client issues a Search_Request, THE Job_Search_Client SHALL include a `limit` query parameter of 100 and an `offset` query parameter of 0[cite: 6].
5. BEFORE issuing a Search_Request, THE Job_Discovery_Screen SHALL validate that a Candidate_Home with finite `lat` and `lng` values and a Commute_Tolerance are both available, and SHALL issue the Search_Request only when that validation passes[cite: 6].
6. IF the Candidate_Home is null or invalid, THEN THE Job_Discovery_Screen SHALL NOT issue a Search_Request and SHALL render the existing home-not-set map state[cite: 6].
7. WHILE the Job_Discovery_Screen is rendering the home-not-set map state, THE Job_Discovery_Screen SHALL NOT issue any Search_Request, including on Commute_Tolerance changes, until a valid Candidate_Home becomes available[cite: 6].

### Requirement 2: Refetch when commute tolerance changes

**User Story:** As a candidate, I want the job list to update when I adjust my commute tolerance, so that the results reflect my current preference[cite: 6].

#### Acceptance Criteria

1. WHEN the candidate changes the Commute_Tolerance, THE Job_Discovery_Screen SHALL issue a new Search_Request reflecting the new Commute_Tolerance after the Debounce_Window has elapsed with no further Commute_Tolerance change[cite: 6].
2. WHILE the candidate is actively changing the Commute_Tolerance within the Debounce_Window, THE Job_Discovery_Screen SHALL NOT issue an additional Search_Request for each intermediate value[cite: 6].
3. WHEN the Candidate_Home changes, THE Job_Discovery_Screen SHALL issue a new Search_Request reflecting the new Candidate_Home[cite: 6].
4. WHERE the Candidate_Home and the Commute_Tolerance both change before the Debounce_Window elapses, THE Job_Discovery_Screen SHALL issue exactly one combined Search_Request reflecting the latest Candidate_Home and the latest Commute_Tolerance, rather than one Search_Request per changed value[cite: 6].

### Requirement 3: Discard stale responses and abort active requests

**User Story:** As a candidate, I want the displayed jobs to always match my current tolerance setting, so that slow, outdated responses do not overwrite recent settings or waste my network data.

#### Acceptance Criteria

1. WHILE a Search_Request is in flight AND a newer Search_Request is triggered, THE Job_Search_Client SHALL immediately abort the older active fetch request using an `AbortController` signal, and SHALL treat any lingering response to that older request as a Stale_Response.
2. IF a Stale_Response occurs or arrives, THEN THE Job_Discovery_Screen SHALL NOT update the displayed jobs, Loading_State, or Error_State from that Stale_Response[cite: 6].
3. WHEN the most recently issued Search_Request resolves successfully, THE Job_Discovery_Screen SHALL update the displayed jobs from that response regardless of the order in which earlier requests resolve[cite: 6].

### Requirement 4: Map backend job results to the job view model

**User Story:** As a candidate, I want each backend job result rendered correctly on a job card, so that the commute, cost, fit, and identity information I see is accurate[cite: 6].

#### Acceptance Criteria

1. WHEN the Job_Search_Client receives a successful Search_Endpoint response, THE Field_Mapper SHALL transform every Job_Result in the response `data` array into one Job_View_Model, preserving the response order[cite: 6].
2. THE Field_Mapper SHALL map a Job_Result's fields to the Job_View_Model according to the following strict relationships:
   - `job_id` maps to `id`
   - `commute_time_mins` maps to `commutingMinutes`
   - `salary` maps to `salaryBaht`
   - `per_trip_cost_baht` maps to `perTripCostBaht`
   - `monthly_commute_cost_baht` maps to `monthlyCommuteCostBaht`
   - `skill_fit_score` maps to `skillFitScore`
   - `commute_fit_score` maps to `commuteFitScore`
   - `transit_segments` maps to `transitSegments`
   - `company_location` maps to `location`
3. IF a Job_Result's `job_title` is null, THEN THE Field_Mapper SHALL set the Job_View_Model's `title` to a fixed, non-empty placeholder text indicating the title is unavailable[cite: 6].
4. IF a Job_Result's `company_name` is null, THEN THE Field_Mapper SHALL set the Job_View_Model's `company` to a fixed, non-empty placeholder text indicating the company name is unavailable[cite: 6].
5. IF a Job_Result's `salary` is null, THEN THE Field_Mapper SHALL set the Job_View_Model's `salaryBaht` to exactly 0, and THE Field_Mapper SHALL guarantee this outcome for every null-salary Job_Result regardless of the state of any other field on that Job_Result[cite: 6].
6. WHEN the Field_Mapper maps a Job_Result's `work_model` field, THE Field_Mapper SHALL map the string values `"On-site"`, `"Hybrid"`, and `"Remote"` case-sensitively to the corresponding Job_View_Model `workModel` value, and SHALL map a null `work_model` or any unrecognized string value to a Javascript/Typescript `null` value (representing the Unspecified_Work_Model state).
7. WHERE a Job_Result's `company_location` is null, THE Field_Mapper SHALL set the Job_View_Model's `location` to null, consistent with the Job_View_Model's existing handling of unplottable jobs[cite: 6].
8. WHERE a Job_Result's `transit_segments` is null, THE Field_Mapper SHALL set the Job_View_Model's `transitSegments` to null, consistent with the Job_View_Model's existing handling of unavailable transit data[cite: 6].

### Requirement 5: Present live-data loading, error, and empty states

**User Story:** As a candidate, I want clear feedback while jobs are loading or when something goes wrong, so that I understand the current state of the screen instead of seeing a blank or frozen list[cite: 6].

#### Acceptance Criteria

1. WHILE the current (non-stale) Search_Request is in flight, THE Job_Discovery_Screen SHALL render a Loading_State in the job list region[cite: 6].
2. IF a Search_Request fails due to a network failure, a non-2xx HTTP response status, or a response body that cannot be parsed into the expected shape, THEN THE Job_Discovery_Screen SHALL render an Error_State in place of the job list, including a Retry_Action[cite: 6].
3. WHEN the Retry_Action is activated, THE Job_Discovery_Screen SHALL issue a new Search_Request using the current Candidate_Home and Commute_Tolerance[cite: 6].
4. WHEN a new Search_Request is issued after a Search_Request has failed, THE Job_Discovery_Screen SHALL clear the Error_State for the duration of that new Search_Request, so the Error_State is shown only while its originating failed request is the most recent outcome[cite: 6].
5. WHEN the current (non-stale) Search_Request resolves successfully with zero Job_Result entries, THE Job_Discovery_Screen SHALL render the existing empty-state message used by the job list[cite: 6].
6. WHEN the current (non-stale) Search_Request resolves successfully with one or more Job_Result entries, THE Job_Discovery_Screen SHALL replace the Loading_State or Error_State with the mapped job list[cite: 6].

### Requirement 6: Preserve existing viewport filtering and ordering on live data

**User Story:** As a candidate, I want the map and list to stay in sync and show the best-fitting jobs first, so that browsing live results feels the same as it did with sample data[cite: 6].

#### Acceptance Criteria

1. THE Job_Discovery_Screen SHALL pass every job mapped from the current (non-stale) Search_Endpoint response to the map pins pipeline and the list pipeline, without applying the pre-existing geometric isochrone-boundary exclusion (`filterJobsByCommuteBoundary`) to live data[cite: 6].
2. THE Job_Discovery_Screen SHALL render a map pin for every mapped job with a non-null `location`, regardless of the current map viewport bounds, and SHALL restrict only the list (not the map pins) to jobs within the current map viewport bounds, using the existing viewport-filtering behavior[cite: 6].
3. THE Job_Discovery_Screen SHALL continue to order the viewport-filtered list by descending `commuteFitScore` with the existing company-name tiebreak, using the existing ordering behavior as a secondary client-side layer over the server's fit sorting[cite: 6].
4. WHERE the pre-existing isochrone-boundary visual overlay continues to render on the map, THE Job_Discovery_Screen SHALL NOT use that overlay to exclude any live job from the map pins or the list[cite: 6].