# Requirements Document

## Introduction

This feature enriches the existing commute-priced job search so that the Candidate Job Discovery screen (Screen 1 of BKK UrbanTalent Match) can render fully. The already-completed `hybrid-routing-search` feature exposes `GET /search`, a FastAPI endpoint backed by a PostGIS-enabled PostgreSQL database that returns job postings priced by commute cost. That endpoint returns `job_id`, `company_id`, `job_title`, `salary`, `required_skills`, `employment_type`, `fare_thb` (per-trip, 2 decimal places), `commute_time_mins`, `is_estimate`, and pagination metadata (`total_records`, `limit`, `offset`). It is MISSING several values the discovery view model (frontend `Job` in `frontend/src/domain/types.ts` and `TransitSegment` in `frontend/src/domain/transit.ts`) needs.

This feature closes those gaps on the backend by additively extending the existing `GET /search` response and input, so the change is backward compatible. The gaps closed are:

- A commute fit score and a skill fit score, each in the range 0 to 100, nullable, with the ability to order results by fit.
- The company name and company coordinates (for job cards and map pins).
- An ordered transit route breakdown (transit segments).
- A whole-baht per-trip commute cost and a monthly commute cost derived from it.
- A new optional desired-skills query parameter (skill fit needs candidate skill input) with validation.
- A work model value mapped from the source employment type.

The scope of this feature is limited to the backend: the SQLAlchemy data models and loaded data, and the FastAPI request/response layer for `GET /search`. Frontend rendering is out of scope. The AI Roleplay Assessment, Market-Benchmarked Radar, and Zero-Filter HR Dashboard screens (Screens 2 to 4) are out of scope.

Three source-data facts are captured as explicit decision points, because they constrain what the backend can populate:

- The company source CSV (`company_locations_cleaned_ready.csv`) contains a company-name column (`ชื่อนิติบุคคล`), but the current `Company` model maps only `id`, `latitude`, and `longitude`. The company name must be sourced and surfaced, and treated as null when unavailable.
- The source `employment_type` values (for example `Full-time`) do not map one-to-one onto the frontend work model set (`On-site`, `Hybrid`, `Remote`). An explicit mapping is defined in the requirements.
- The Time_Estimation_Service (Google Distance Matrix) returns a single duration per destination and no per-leg breakdown, so transit segments cannot be derived from it directly; transit segments are null when no leg-level source (such as explicit definition in `demo_routes.csv`) is available.

Per the workspace no-testing policy, this specification does not include testing tasks, and the acceptance criteria below are documented for correctness reasoning rather than for automated test generation.

## Glossary

- **Search_Endpoint**: The existing `GET /search` FastAPI HTTP endpoint that accepts user coordinates and filter parameters and returns commute-priced Job_Posting records. This feature extends its input and output additively.
- **Job_Posting**: A job record identified by `job_id` and associated with a `company_id`, as defined by the `hybrid-routing-search` feature.
- **Company**: A business entity identified by `id`, with `latitude` and `longitude`, sourced from `company_locations_cleaned_ready.csv`.
- **Job_Result**: A single Job_Posting record in the response `data` array, extended by this feature with the fit, company, transit, cost, and work-model fields.
- **Desired_Skills**: The optional query parameter supplying a candidate's desired skills as a comma-separated list of Skill_Token values, used to compute the Skill_Fit_Score.
- **Skill_Token**: A single skill name obtained by splitting Desired_Skills or `required_skills` on commas and trimming surrounding whitespace, compared case-insensitively.
- **Required_Skills_Set**: The set of Skill_Token values obtained from a Job_Posting's `required_skills` field.
- **Skill_Fit_Score**: An integer in the range 0 to 100 (nullable) expressing how well a Job_Posting's Required_Skills_Set covers the Desired_Skills.
- **Commute_Tolerance**: The effective maximum commute time in whole minutes used as the reference for the Commute_Fit_Score, taken from the existing optional `max_time` query parameter.
- **Commute_Fit_Score**: An integer in the range 0 to 100 (nullable) expressing how favorable a Job_Posting's `commute_time_mins` is relative to the Commute_Tolerance, higher for a shorter commute.
- **Overall_Fit_Score**: A derived fit value used only for fit ordering, computed from the available fit scores of a Job_Result.
- **Fit_Sort**: The ordering mode, selected by the optional `sort` query parameter, that orders Job_Result records by Overall_Fit_Score in descending order.
- **Company_Name**: The human-readable name of a Company, sourced from the `ชื่อนิติบุคคล` column of `company_locations_cleaned_ready.csv`, exposed as `company_name` in each Job_Result and nullable when unavailable.
- **Company_Location**: The Company coordinate exposed in each Job_Result as an object with `lat` and `lng` numeric fields, nullable when unavailable.
- **Transit_Segment**: One leg of a Job_Posting's transit chain, expressed as an object with a `mode` string and a non-negative whole-minute `minutes` value.
- **Transit_Mode**: The transport-mode string of a Transit_Segment; recognized values include `Walk`, `BTS`, `MRT`, `BRT`, and `Win`, and any other string is tolerated.
- **Per_Trip_Cost_Baht**: The commute cost for a single trip, expressed as a non-negative whole number of Thai Baht, derived from the existing `fare_thb` value.
- **Monthly_Commute_Cost_Baht**: The monthly commute cost, computed as Per_Trip_Cost_Baht multiplied by Trips_Per_Day multiplied by Working_Days_Per_Month.
- **Trips_Per_Day**: The fixed constant 2, representing one outbound and one return trip per working day.
- **Working_Days_Per_Month**: The fixed constant 22, representing working days in a month.
- **Work_Model**: A value in the set `On-site`, `Hybrid`, `Remote` (nullable) derived from a Job_Posting's `employment_type`.
- **Estimate_Flag**: The existing boolean `is_estimate` field indicating whether commute values are estimated (`true`) or exact (`false`).

## Requirements

### Requirement 1: Accept and validate the desired-skills input

**User Story:** As an API client rendering the discovery screen, I want to submit the candidate's desired skills, so that the backend can compute a skill fit score for each job.

#### Acceptance Criteria

1. WHEN a search request is received, THE Search_Endpoint SHALL accept an optional Desired_Skills query parameter expressed as a comma-separated list of Skill_Token values.
2. WHERE the Desired_Skills parameter is omitted, THE Search_Endpoint SHALL perform the search with no desired skills and SHALL produce the same behavior as the `hybrid-routing-search` feature for all pre-existing fields.
3. WHEN the Desired_Skills parameter is provided, THE Search_Endpoint SHALL derive the desired Skill_Token set by splitting the value on commas, trimming leading and trailing whitespace from each token, discarding empty tokens, and comparing tokens case-insensitively.
4. IF the Desired_Skills parameter is provided AND its raw string length is greater than 500 characters, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the Desired_Skills value is too long, and SHALL NOT perform a search.
5. IF the Desired_Skills parameter is provided AND yields more than 50 non-empty Skill_Token values after normalization, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating too many desired skills were supplied, and SHALL NOT perform a search.
6. WHERE the Desired_Skills parameter is provided AND yields zero non-empty Skill_Token values after normalization, THE Search_Endpoint SHALL treat the request as having no desired skills.

### Requirement 2: Compute the skill fit score

**User Story:** As a candidate, I want each job scored by how well it matches my desired skills, so that I can prioritize jobs that fit my expertise.

#### Acceptance Criteria

1. WHERE the request supplies one or more desired Skill_Token values AND a Job_Posting has a non-null `required_skills` value, THE Search_Endpoint SHALL compute the Skill_Fit_Score as 100 multiplied by the count of desired Skill_Token values that appear in the Required_Skills_Set, divided by the count of desired Skill_Token values, rounded to the nearest whole number.
2. WHEN the Search_Endpoint compares a desired Skill_Token against the Required_Skills_Set, THE Search_Endpoint SHALL match tokens case-insensitively after trimming surrounding whitespace.
3. WHEN the Skill_Fit_Score is computed, THE Search_Endpoint SHALL constrain the resulting value to the range 0 to 100 inclusive as a whole number.
4. WHERE every desired Skill_Token appears in the Required_Skills_Set, THE Search_Endpoint SHALL set the Skill_Fit_Score to 100.
5. WHERE the request supplies one or more desired Skill_Token values AND no desired Skill_Token appears in the Required_Skills_Set, THE Search_Endpoint SHALL set the Skill_Fit_Score to 0.
6. IF the request supplies no desired Skill_Token values, THEN THE Search_Endpoint SHALL set the Skill_Fit_Score to null for every Job_Result, distinct from the value 0 used when desired Skill_Token values are supplied but none appear in the Required_Skills_Set.
7. IF a Job_Posting has a null or empty `required_skills` value, THEN THE Search_Endpoint SHALL set the Skill_Fit_Score to null for that Job_Result.
8. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include the Skill_Fit_Score field as either a non-null whole number in the range 0 to 100 inclusive or a null value, present in the record rather than omitted, and SHALL NOT emit a non-whole or otherwise out-of-range value.

### Requirement 3: Compute the commute fit score

**User Story:** As a candidate, I want each job scored by how favorable its commute is against my tolerance, so that I can prioritize jobs I can reasonably reach.

#### Acceptance Criteria

1. WHERE the maximum commute time value (`max_time`) is provided in the request, THE Search_Endpoint SHALL treat that value as the Commute_Tolerance and compute the Commute_Fit_Score for each Job_Result.
2. WHEN the Search_Endpoint computes the Commute_Fit_Score, THE Search_Endpoint SHALL set it to 100 multiplied by the quantity (Commute_Tolerance minus `commute_time_mins`) divided by the Commute_Tolerance, rounded to the nearest whole number and constrained to the range 0 to 100 inclusive.
3. WHERE the maximum commute time value (`max_time`) is provided in the request AND a Job_Posting has a `commute_time_mins` of 0, THE Search_Endpoint SHALL set the Commute_Fit_Score to 100; WHERE `max_time` is not provided, THE Search_Endpoint SHALL set the Commute_Fit_Score to null regardless of the `commute_time_mins` value.
4. WHERE a Job_Posting has a `commute_time_mins` greater than or equal to the Commute_Tolerance, THE Search_Endpoint SHALL set the Commute_Fit_Score to 0.
5. IF the maximum commute time value (`max_time`) is not provided in the request, THEN THE Search_Endpoint SHALL set the Commute_Fit_Score to null for every Job_Result.
6. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include the Commute_Fit_Score field with either a whole number in the range 0 to 100 or a null value, present in the record rather than omitted.

### Requirement 4: Order results by fit

**User Story:** As a candidate, I want the job list ordered by fit with the best jobs first, so that the discovery screen surfaces the most relevant jobs at the top.

#### Acceptance Criteria

1. WHEN a search request is received, THE Search_Endpoint SHALL accept an optional `sort` query parameter whose accepted values are `fit` and the pre-existing default ordering.
2. WHERE the `sort` parameter is omitted, THE Search_Endpoint SHALL order Job_Result records using the pre-existing ordering defined by the `hybrid-routing-search` feature, preserving backward compatibility.
3. IF the `sort` parameter is provided with a value other than an accepted value, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the `sort` value is invalid, and SHALL NOT perform a search.
4. WHERE the `sort` parameter equals `fit`, THE Search_Endpoint SHALL compute the Overall_Fit_Score for each Job_Result as the arithmetic mean of the non-null values among the Commute_Fit_Score and the Skill_Fit_Score.
5. WHERE the `sort` parameter equals `fit` AND both the Commute_Fit_Score and the Skill_Fit_Score are null for a Job_Result, THE Search_Endpoint SHALL treat that Job_Result's Overall_Fit_Score as unavailable.
6. WHERE the `sort` parameter equals `fit`, THE Search_Endpoint SHALL order Job_Result records by Overall_Fit_Score in descending order, placing records with an unavailable Overall_Fit_Score after all records with an available Overall_Fit_Score.
7. WHERE two or more Job_Result records tie on Overall_Fit_Score availability and value under Fit_Sort, THE Search_Endpoint SHALL break the tie by Company_Name in ascending A-to-Z order treating nulls as last (`NULLS LAST`), and SHALL break any remaining tie by `job_id` in ascending order, so that the ordering is deterministic across identical requests.
8. WHEN the Search_Endpoint applies pagination under Fit_Sort, THE Search_Endpoint SHALL apply the existing Pagination_Offset and Pagination_Limit to the fit-ordered records after ordering.
9. WHERE the effective Pagination_Offset is 0 or the Pagination_Limit is 0 under Fit_Sort, THE Search_Endpoint SHALL apply the pagination semantics defined by the `hybrid-routing-search` feature for those values rather than introducing new slicing behavior, such that a Pagination_Offset of 0 skips no records and a Pagination_Limit of 0 is treated per the existing pagination contract.

### Requirement 5: Expose company name and coordinates

**User Story:** As an API client, I want each job to carry its company name and coordinates, so that I can render job cards and plot company pins on the map.

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include a Company_Name field and a Company_Location field, each present in the record rather than omitted.
2. THE Search_Endpoint SHALL source the Company_Name from the `ชื่อนิติบุคคล` column of `company_locations_cleaned_ready.csv` and make that value available through the Company data model.
3. IF the Company_Name for a Job_Result's associated Company is unavailable, empty, or not loaded, THEN THE Search_Endpoint SHALL set the Company_Name field to null for that Job_Result.
4. WHEN the Search_Endpoint returns the Company_Location for a Job_Result whose associated Company has valid coordinates, THE Search_Endpoint SHALL set the Company_Location to an object containing a `lat` field equal to the Company latitude and a `lng` field equal to the Company longitude.
5. IF the associated Company is unavailable or its latitude or longitude is missing or out of range, THEN THE Search_Endpoint SHALL set the Company_Location field to null for that Job_Result.

### Requirement 6: Expose the transit route breakdown

**User Story:** As an API client, I want an ordered breakdown of a job's transit legs, so that I can render a route chain such as "45 นาที ผ่าน BTS + BRT".

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include a transit-segments field that is either an ordered list of Transit_Segment objects or null, present in the record rather than omitted.
2. WHEN the Search_Endpoint returns a Transit_Segment, THE Search_Endpoint SHALL include a `mode` string field and a `minutes` field whose value is a non-negative whole number.
3. WHERE a leg-level transit source is explicitly defined and available for a Job_Posting (e.g., via Exact_Match origin data in `demo_routes.csv`), THE Search_Endpoint SHALL populate the transit-segments field with the legs in travel order.
4. WHERE recognized Transit_Mode values apply, THE Search_Endpoint SHALL use the mode strings `Walk`, `BTS`, `MRT`, `BRT`, or `Win`.
5. WHEN the Search_Endpoint emits a Transit_Segment whose mode is not a recognized Transit_Mode value, THE Search_Endpoint SHALL pass the mode string through unchanged rather than rejecting or dropping the segment.
6. IF no leg-level transit source is available for a Job_Posting (e.g., during Fallback_Estimation using Time_Estimation_Service), THEN THE Search_Endpoint SHALL set the transit-segments field to null for that Job_Result.
7. WHERE the transit-segments field is a non-null list, THE Search_Endpoint SHALL ensure every Transit_Segment `minutes` value is a whole number greater than or equal to 0.
8. IF a leg-level transit source exists for a Job_Posting BUT parsing or interpreting that source fails, THEN THE Search_Endpoint SHALL set the transit-segments field to null for that Job_Result, treated identically to unavailable transit data rather than as an empty list.

### Requirement 7: Expose per-trip and monthly commute cost

**User Story:** As an API client, I want whole-baht per-trip and monthly commute costs, so that I can show commute overhead in the financial comparison row.

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include a Per_Trip_Cost_Baht field and a Monthly_Commute_Cost_Baht field, each present in the record rather than omitted.
2. WHEN the Search_Endpoint sets the Per_Trip_Cost_Baht, THE Search_Endpoint SHALL set it to the existing `fare_thb` value rounded to the nearest whole number of Thai Baht.
3. WHEN the Search_Endpoint sets the Monthly_Commute_Cost_Baht, THE Search_Endpoint SHALL set it to the Per_Trip_Cost_Baht multiplied by Trips_Per_Day of 2 multiplied by Working_Days_Per_Month of 22.
4. THE Search_Endpoint SHALL express the Per_Trip_Cost_Baht and the Monthly_Commute_Cost_Baht as non-negative whole numbers.

### Requirement 8: Derive the work model from employment type

**User Story:** As an API client, I want each job to carry exactly one work model, so that I can render the correct work-model tag.

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL include a Work_Model field that is either one of `On-site`, `Hybrid`, or `Remote`, or null, present in the record rather than omitted.
2. WHEN the Search_Endpoint derives the Work_Model, THE Search_Endpoint SHALL strictly map a Job_Posting's `employment_type` value case-insensitively using the following mapping dictionary:
    - `"Remote"` maps to `Remote`
    - `"Hybrid"` maps to `Hybrid`
    - `"Full-time"`, `"Part-time"`, `"Contract"`, `"Internship"`, and `"Freelance"` map to `On-site`
3. IF a Job_Posting's `employment_type` value is not present in the defined dictionary above, THEN THE Search_Endpoint SHALL set the Work_Model field to null for that Job_Result, and SHALL NOT apply any fallback default.
4. IF a Job_Posting has a null or empty `employment_type` value, THEN THE Search_Endpoint SHALL set the Work_Model field to null for that Job_Result.

### Requirement 9: Preserve a backward-compatible response shape

**User Story:** As an existing API client, I want the enriched response to remain backward compatible, so that current integrations continue to work while new fields become available.

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns results, THE Search_Endpoint SHALL retain the existing top-level `data` and `meta` structure and the existing `meta` fields `total_records`, `limit`, and `offset` unchanged.
2. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL retain the existing fields `job_id`, `company_id`, `job_title`, `salary`, `required_skills`, `employment_type`, `fare_thb`, `commute_time_mins`, and `is_estimate` with their existing meanings and value formats.
3. WHEN the Search_Endpoint returns a Job_Result, THE Search_Endpoint SHALL add the Skill_Fit_Score, Commute_Fit_Score, Company_Name, Company_Location, transit-segments, Per_Trip_Cost_Baht, Monthly_Commute_Cost_Baht, and Work_Model fields as additional fields without removing or renaming any existing field.
4. WHERE the input value needed to populate an added field is unavailable, THE Search_Endpoint SHALL include that added field with a null value rather than omitting the field.
5. WHERE the `sort` parameter is omitted, THE Search_Endpoint SHALL STRICTLY return the same Job_Result ordering and the same values for all pre-existing fields as the `hybrid-routing-search` default sorting, regardless of whether the Desired_Skills parameter is provided or not.
6. WHERE a Job_Result's `job_id` is missing or null, THE Search_Endpoint SHALL entirely exclude that Job_Posting from the response list, as returning entities without a primary identifier breaks client reconciliation and routing.