/**
 * TypeScript types mirroring the backend `GET /search` response contract
 * (`backend/app/schemas/response.py`), field-for-field.
 *
 * This intentionally duplicates rather than imports across the
 * frontend/backend boundary (no shared package exists in this repo).
 */

export interface CompanyLocationResult {
  lat: number;
  lng: number;
}

export interface TransitSegmentResult {
  mode: string;
  minutes: number;
}

export interface JobResult {
  job_id: string | null;
  company_id: number | null;
  job_title: string | null;
  salary: number | null;
  required_skills: string | null;
  employment_type: string | null;
  fare_thb: number;
  commute_time_mins: number;
  is_estimate: boolean;
  skill_fit_score: number | null;
  commute_fit_score: number | null;
  company_name: string | null;
  company_location: CompanyLocationResult | null;
  transit_segments: TransitSegmentResult[] | null;
  per_trip_cost_baht: number;
  monthly_commute_cost_baht: number;
  work_model: string | null;
  years_experience_required: number | null;
  career_growth_index: string | null;
}

export interface SearchMeta {
  total_records: number;
  limit: number;
  offset: number;
}

export interface SearchResponse {
  data: JobResult[];
  meta: SearchMeta;
}
