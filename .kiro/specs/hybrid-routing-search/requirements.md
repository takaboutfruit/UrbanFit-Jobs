# Requirements Document

## Introduction

This feature delivers a FastAPI search endpoint backed by a PostGIS-enabled PostgreSQL database that returns job postings ranked and priced by commute cost using a Hybrid Routing Strategy. The endpoint accepts a user's geographic coordinates and returns matching jobs with either exact commute data (when the user starts near a predefined demo origin) or spatially estimated commute data (as a fallback). Results are filtered by maximum fare and maximum commute time before being returned.

The scope of this feature is limited to the SQLAlchemy data models and the FastAPI routing logic. Data is sourced from four CSV files in the `datasets` directory:

- `mock_job_postings.csv` — job postings keyed by `company_id`.
- `company_locations_cleaned_ready.csv` — company coordinates keyed by `id`.
- `coordinate_station.csv` — transit station coordinates.
- `demo_routes.csv` — predefined origins with exact fares and exact commute times to specific companies.

Per the workspace no-testing policy, this specification does not include testing tasks, and the acceptance criteria below are documented for correctness reasoning rather than for automated test generation.

## Glossary

- **Search_Endpoint**: The FastAPI HTTP endpoint that accepts user coordinates and filter parameters and returns matching job postings with commute pricing.
- **Hybrid_Router**: The component within the Search_Endpoint that selects between the Exact_Match strategy and the Fallback_Estimation strategy based on the user's proximity to demo origins.
- **Exact_Match**: The strategy that returns exact fare and commute time from `demo_routes.csv` when the user is within the Hero_Radius of a demo origin.
- **Fallback_Estimation**: The strategy that computes estimated fare and commute time using PostGIS distance calculations and an external time API when no exact match applies.
- **Demo_Origin**: A predefined origin point from `demo_routes.csv`, defined by `origin_lat` and `origin_lng`, associated with a `company_id`, `exact_fare_thb`, and `exact_time_mins`.
- **Hero_Radius**: A fixed radius of 500 meters used to determine whether a user's coordinates match a Demo_Origin.
- **Last_Mile_Threshold**: A fixed distance of 800 meters; when a company is farther than this distance from its nearest station, a last-mile cost is added.
- **Company**: A business entity from `company_locations_cleaned_ready.csv`, identified by `id`, with `latitude` and `longitude`.
- **Job_Posting**: A job record from `mock_job_postings.csv`, identified by `job_id` and associated with a `company_id`.
- **Station**: A transit station from `coordinate_station.csv`, with `Latitude` and `Longitude`.
- **Time_Estimation_Service**: The Google Distance Matrix API used to estimate commute time in the Fallback_Estimation strategy.
- **PostGIS**: The PostgreSQL spatial extension used for geographic distance and radius calculations.
- **Spatial_Bounding_Radius**: A fixed straight-line radius of 20 kilometers from the user's coordinates used to limit candidate Companies before Fallback_Estimation fare and time computation.
- **Candidate_Company_Limit**: The maximum number of candidate companies, fixed at 25, whose commute times are requested from the Time_Estimation_Service in a single Fallback_Estimation request.
- **User's Nearest Station**: The Station with the smallest PostGIS geographic distance to the user coordinates, used as the boarding point in the Fallback_Estimation train fare calculation.
- **Company's Nearest Station**: The Station with the smallest PostGIS geographic distance to a Company's coordinates, used as the alighting point in the Fallback_Estimation train fare and last-mile calculations.
- **Fare_THB**: A commute fare value expressed in Thai Baht.
- **Commute_Time_Mins**: A commute duration value expressed in whole minutes.
- **Estimate_Flag**: The boolean `is_estimate` field in the response payload indicating whether commute values are estimated (`true`) or exact (`false`).
- **Pagination_Limit**: The optional `limit` query parameter specifying the maximum number of Job_Posting records returned in a single response across all matched companies, defaulting to 50 when omitted.
- **Pagination_Offset**: The optional `offset` query parameter specifying the number of ordered Job_Posting records to skip before the Pagination_Limit slice is applied, defaulting to 0 when omitted.

## Requirements

### Requirement 1: Accept and validate search input

**User Story:** As an API client, I want to submit user coordinates and filter limits, so that I can retrieve commute-priced job postings relevant to the user's location.

#### Acceptance Criteria

1. WHEN a search request is received, THE Search_Endpoint SHALL accept a required user latitude value in decimal degrees, a required user longitude value in decimal degrees, an optional maximum fare value in Thai Baht, an optional maximum commute time value in whole minutes, an optional Pagination_Limit value defaulting to 50 when omitted, and an optional Pagination_Offset value defaulting to 0 when omitted.
2. IF the request omits the user latitude or the user longitude, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error identifying each missing required field, and SHALL NOT perform a search.
3. IF the user latitude is non-numeric or outside the range -90 to 90 inclusive, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the user latitude is out of range, and SHALL NOT perform a search.
4. IF the user longitude is non-numeric or outside the range -180 to 180 inclusive, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the user longitude is out of range, and SHALL NOT perform a search.
5. IF the maximum fare value is provided AND is non-numeric or outside the range 0.01 to 999,999.99 Thai Baht inclusive, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the maximum fare is out of range, and SHALL NOT perform a search.
6. IF the maximum commute time value is provided AND is non-numeric, non-integer, or outside the range 1 to 1440 minutes inclusive, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the maximum commute time is out of range, and SHALL NOT perform a search.
7. IF the Pagination_Limit value is provided AND is non-numeric, non-integer, or outside the range 1 to 200 inclusive, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the Pagination_Limit is out of range, and SHALL NOT perform a search.
8. IF the Pagination_Offset value is provided AND is non-numeric, non-integer, or less than 0, THEN THE Search_Endpoint SHALL return an HTTP 422 response with a validation error indicating the Pagination_Offset is out of range, and SHALL NOT perform a search.
9. WHEN the user latitude and user longitude pass validation AND any provided maximum fare value, maximum commute time value, Pagination_Limit value, and Pagination_Offset value pass validation, THE Search_Endpoint SHALL proceed to perform the job search using the submitted user latitude, user longitude, any provided maximum fare value and maximum commute time value, and the effective Pagination_Limit and Pagination_Offset values.

### Requirement 2: Exact match strategy for hero paths

**User Story:** As a demo presenter, I want users starting near a known origin to receive exact fares and times, so that the live pitch shows precise, credible commute data.

#### Acceptance Criteria

1. WHEN a search request is received, THE Hybrid_Router SHALL use PostGIS to determine whether the user coordinates fall at or within the Hero_Radius of 500 meters geographic distance of any Demo_Origin.
2. WHERE the user coordinates fall at or within the Hero_Radius of at least one Demo_Origin, THE Hybrid_Router SHALL select the Exact_Match strategy.
3. WHEN the Exact_Match strategy is selected, THE Exact_Match SHALL apply the `exact_fare_thb` and `exact_time_mins` of the matched Demo_Origin, with the Estimate_Flag set to `false`, ONLY to Job_Posting records whose `company_id` matches the `company_id` of the matched Demo_Origin.
4. WHEN the Exact_Match strategy is selected, THE Exact_Match SHALL compute the Fare_THB and Commute_Time_Mins for Job_Posting records belonging to every other Company that passes the global filters on a best-effort basis using the Fallback_Estimation strategy, strictly bound to the same Spatial_Bounding_Radius of 20 kilometers and the same Candidate_Company_Limit of 25 defined in Requirement 3, with the Estimate_Flag set to `true`, and SHALL return those records in the same unified response list as the exact-match Job_Posting records; IF the Time_Estimation_Service times out or returns an error while computing these best-effort results, THEN THE Exact_Match SHALL omit those Fallback_Estimation records without failing the exact-match response.
5. WHEN the Exact_Match strategy returns a Job_Posting whose Fare_THB and Commute_Time_Mins were set from the matched Demo_Origin, THE Exact_Match SHALL set the Estimate_Flag to `false` in the response payload for that record.
6. WHERE the user coordinates fall at or within the Hero_Radius of more than one Demo_Origin, THE Hybrid_Router SHALL select the single Demo_Origin with the smallest PostGIS distance to the user coordinates.
7. WHERE two or more Demo_Origins tie for the smallest PostGIS distance to the user coordinates, THE Hybrid_Router SHALL select the tied Demo_Origin with the lowest `company_id`.
8. WHERE the matched Demo_Origin has no associated Job_Posting records, THE Exact_Match SHALL still return the Fallback_Estimation results for all other companies that pass the global filters with an HTTP 200 response.
9. WHERE the Exact_Match strategy is selected AND the Time_Estimation_Service times out or returns an error while computing the best-effort Fallback_Estimation results for the other Companies, THE Search_Endpoint SHALL drop the Fallback_Estimation results for those other Companies but SHALL still return the exact-match demo Job_Posting records for the matched `company_id` with an HTTP 200 response, and SHALL NOT return an HTTP 502 response.

### Requirement 3: Fallback spatial estimation strategy

**User Story:** As an API client, I want users outside known origins to still receive estimated fares and times, so that every user location produces usable job results.

#### Acceptance Criteria

1. WHERE the user coordinates fall outside the Hero_Radius of every Demo_Origin, THE Hybrid_Router SHALL select the Fallback_Estimation strategy.
2. WHEN the Fallback_Estimation strategy begins, THE Search_Endpoint SHALL perform an initial spatial bounding check using PostGIS ST_DWithin to limit candidate Companies to a maximum straight-line radius of 20 kilometers from the user's coordinates.
3. WHEN the Fallback_Estimation strategy computes a train fare, THE Fallback_Estimation SHALL use PostGIS ST_Distance to compute the non-negative distance in kilometers between the User's Nearest Station and the Company's Nearest Station and SHALL set the train Fare_THB to 15 plus 2.5 multiplied by that distance in kilometers, rounded to 2 decimal places.
4. WHEN a Company is located more than the Last_Mile_Threshold from the Company's Nearest Station, THE Fallback_Estimation SHALL add a last-mile Fare_THB of 15 plus 10 multiplied by the non-negative last-mile distance in kilometers, rounded to 2 decimal places, to the train Fare_THB; the last-mile cost from the user's exact coordinates to the User's Nearest Station is explicitly excluded from this backend calculation and assumed to be zero.
5. WHERE a Company is located at or within the Last_Mile_Threshold of the nearest Station, THE Fallback_Estimation SHALL add zero last-mile Fare_THB.
6. WHEN the Fallback_Estimation strategy has computed the train Fare_THB and any last-mile Fare_THB for each candidate Company within the Spatial_Bounding_Radius AND a maximum fare value is provided, THE Fallback_Estimation SHALL exclude any candidate Company whose total Fare_THB is strictly greater than the maximum fare value before selecting the top 25 nearest candidate companies.
7. WHEN the Fallback_Estimation strategy prepares to call the Time_Estimation_Service, THE Fallback_Estimation strategy SHALL limit the final candidate pool to the top 25 nearest companies based on the PostGIS geographic distance between the User's Nearest Station and the Company's Nearest Station (station-to-station distance) before executing calls to the Time_Estimation_Service; IF the candidate pool exceeds 25 after the fare filter, THEN THE Search_Endpoint SHALL prioritize the closest 25 companies by that station-to-station distance. NOTE: This station-to-station sorting distance is the same distance metric (User's Nearest Station to Company's Nearest Station) used for the train Fare_THB calculation in acceptance criterion 3, so the top-25 selection and the train-fare pricing share a single consistent distance metric.
8. WHEN the Fallback_Estimation strategy computes a commute time, THE Fallback_Estimation SHALL obtain the Commute_Time_Mins from the Time_Estimation_Service and set it to the returned duration rounded to the nearest whole minute.
9. WHEN the Fallback_Estimation strategy calls the Time_Estimation_Service, THE Fallback_Estimation SHALL apply a timeout of 1.5 seconds to the call so that the call remains within the 3-second global response SLA.
10. WHEN the Fallback_Estimation strategy has obtained the Commute_Time_Mins for the top 25 candidate companies from the Time_Estimation_Service AND a maximum commute time value is provided, THE Fallback_Estimation SHALL exclude any Job_Posting whose Commute_Time_Mins is strictly greater than the maximum commute time value after the time estimation completes.
11. WHEN the Fallback_Estimation strategy returns a Job_Posting, THE Fallback_Estimation SHALL set the Estimate_Flag to `true` in the response payload.
12. IF the Fallback_Estimation strategy is the selected strategy AND the Time_Estimation_Service returns an error or does not respond within the 1.5-second timeout, THEN THE Fallback_Estimation SHALL return an HTTP 502 response indicating that commute time estimation is unavailable, and SHALL NOT return any Job_Posting records for that request.

### Requirement 4: Filtering results by fare and commute time

**User Story:** As an API client, I want results limited by maximum fare and maximum commute time, so that users only see jobs within their commute budget and tolerance.

#### Acceptance Criteria

1. WHERE the Fallback_Estimation strategy is selected AND a maximum fare value is provided, THE Search_Endpoint SHALL apply the maximum fare value to the candidate Companies bounded by the Spatial_Bounding_Radius before the top 25 nearest candidate companies are selected for the Time_Estimation_Service call, rather than to the entire Company database pool.
2. WHERE the Fallback_Estimation strategy is selected AND a maximum commute time value is provided, THE Search_Endpoint SHALL apply the maximum commute time value to the top 25 candidate companies after the Commute_Time_Mins have been obtained from the Time_Estimation_Service.
3. WHEN the Fallback_Estimation strategy has computed the train Fare_THB and any last-mile Fare_THB for candidate Companies within the Spatial_Bounding_Radius AND a maximum fare value is provided, THE Search_Endpoint SHALL exclude any candidate Company (and its associated Job_Postings) whose computed Fare_THB is strictly greater than the maximum fare value BEFORE the top 25 selection is executed.
4. WHEN the top 25 candidate companies have been assigned Commute_Time_Mins AND a maximum commute time value is provided, THE Search_Endpoint SHALL exclude any Job_Posting whose Commute_Time_Mins is strictly greater than the maximum commute time value after the time estimation.
5. WHEN a maximum fare value is provided, THE Search_Endpoint SHALL retain any candidate Job_Posting whose Fare_THB is less than or equal to the maximum fare value.
6. WHEN a maximum commute time value is provided, THE Search_Endpoint SHALL retain any candidate Job_Posting whose Commute_Time_Mins is less than or equal to the maximum commute time value.
7. WHERE the maximum fare value is not provided in the request, THE Search_Endpoint SHALL retain all candidate Companies within the Spatial_Bounding_Radius regardless of Fare_THB when selecting the top 25 nearest candidate companies.
8. WHERE the maximum commute time value is not provided in the request, THE Search_Endpoint SHALL retain all top 25 candidate Job_Posting records regardless of Commute_Time_Mins.
9. WHEN both the maximum fare value and the maximum commute time value are provided, THE Search_Endpoint SHALL retain only Job_Posting records that satisfy both the fare limit applied before the top 25 selection and the commute time limit applied after the Time_Estimation_Service call.
10. WHEN no candidate Job_Posting satisfies the filter limits, THE Search_Endpoint SHALL return an empty result list with an HTTP 200 response.

### Requirement 5: Response payload structure

**User Story:** As an API client, I want a consistent JSON response, so that I can render job results and commute pricing reliably.

#### Acceptance Criteria

1. WHEN the Search_Endpoint returns results, THE Search_Endpoint SHALL return an HTTP 200 response with a JSON object containing two top-level keys: `data` containing the paginated array of Job_Posting records, and `meta` containing the pagination metadata.
2. WHEN the Search_Endpoint returns the `meta` object, it SHALL include the `total_records` as an integer representing the count of all matched jobs before pagination limits, the `limit` applied, and the `offset` applied.
3. WHEN the Search_Endpoint returns a Job_Posting record, THE Search_Endpoint SHALL include the `job_id`, `company_id`, `job_title`, `salary`, `required_skills`, and `employment_type` fields, with each of these fields present in the record.
4. WHEN the Search_Endpoint returns a Job_Posting record, THE Search_Endpoint SHALL include the Fare_THB rounded to 2 decimal places, the Commute_Time_Mins as a whole-minute integer, and the Estimate_Flag as a boolean value for that record.
5. IF the `job_id`, `company_id`, `job_title`, `salary`, `required_skills`, or `employment_type` value is unavailable in the source data for a returned Job_Posting record, THEN THE Search_Endpoint SHALL include that field with a null value rather than omitting the field.
6. WHEN the Search_Endpoint has assembled the filtered Job_Posting records across all matched companies, THE Search_Endpoint SHALL order those records deterministically in ascending `Estimate_Flag` (where `false` exact matches strictly precede `true` fallback records), then ascending `Fare_THB`, then ascending `Commute_Time_Mins`, then ascending `company_id`, then ascending `job_id`, so that exact matches are prioritized and the pagination slice is stable across identical requests.
7. WHEN the Search_Endpoint applies pagination to the ordered Job_Posting records, THE Search_Endpoint SHALL skip the first Pagination_Offset records and then return at most Pagination_Limit Job_Posting records in total across all matched companies within the `data` array.
8. IF the Pagination_Offset is greater than or equal to the total number of filtered Job_Posting records, THEN THE Search_Endpoint SHALL return an empty array in the `data` key and the corresponding `meta` object with an HTTP 200 response.
9. WHEN fewer than Pagination_Limit Job_Posting records remain after skipping Pagination_Offset records, THE Search_Endpoint SHALL return all remaining ordered Job_Posting records in the `data` array with an HTTP 200 response.

### Requirement 6: Database query efficiency

**User Story:** As a system operator, I want efficient database access, so that the endpoint responds quickly during the live demo without redundant queries.

#### Acceptance Criteria

1. WHEN the Search_Endpoint retrieves Job_Posting records for one or more companies, THE Search_Endpoint SHALL retrieve the associated Company data for all of those companies using a single set-based query rather than one query per Job_Posting.
2. WHEN the Search_Endpoint retrieves candidate Job_Posting records for all matched companies, THE Search_Endpoint SHALL retrieve those records using a single database query.
3. WHEN a search request is processed, THE Search_Endpoint SHALL retrieve all Job_Posting and associated Company data using no more than 4 database queries in total, regardless of the number of matched companies or Job_Posting records.
4. WHEN an operation combines the Exact_Match strategy and the Fallback_Estimation strategy, THE Search_Endpoint SHALL apply the Spatial_Bounding_Radius bounding check and the Candidate_Company_Limit cap so that the number of Companies passed to the Time_Estimation_Service does not exceed 25 and the sequential Demo_Origin, Station, Company, and Job_Posting lookups remain within the 4-query bound defined in acceptance criterion 3.
5. WHEN a search request is received, THE Search_Endpoint SHALL return the HTTP response within 3 seconds.

### Requirement 7: Data models

**User Story:** As a developer, I want SQLAlchemy models mapping the CSV data to spatial tables, so that PostGIS operations and job lookups are supported.

#### Acceptance Criteria

1. THE Search_Endpoint SHALL define a Company model with fields for `id`, `latitude` in the range -90.0 to 90.0 inclusive, and `longitude` in the range -180.0 to 180.0 inclusive, mapped to a PostGIS geographic column.
2. THE Search_Endpoint SHALL define a Job_Posting model with fields for `job_id`, `company_id`, `job_title`, `salary`, `required_skills`, and `employment_type`, with `company_id` defined as a foreign key referencing the `id` field of the Company model.
3. THE Search_Endpoint SHALL define a Station model with fields for station code, station name, `Latitude`, and `Longitude`, including a PostGIS geographic column for the station location.
4. THE Search_Endpoint SHALL define a Demo_Origin model with fields for `origin_station`, `origin_lat` in the range -90.0 to 90.0 inclusive, `origin_lng` in the range -180.0 to 180.0 inclusive, `company_id` defined as a foreign key referencing the `id` field of the Company model, `exact_fare_thb`, and `exact_time_mins`, with a PostGIS geographic column for the origin location.
5. WHEN loading a Station record, IF the Station record has an empty or out-of-range latitude or longitude value in `coordinate_station.csv`, THEN THE Search_Endpoint SHALL exclude that Station from spatial nearest-station calculations while retaining all valid Station records.
6. WHEN loading a Company or Demo_Origin record, IF the record has an empty or out-of-range latitude or longitude value, THEN THE Search_Endpoint SHALL exclude that record from spatial calculations while retaining all valid records.
7. IF a Job_Posting or Demo_Origin references a `company_id` that has no matching Company record, THEN THE Search_Endpoint SHALL exclude that record from search results.