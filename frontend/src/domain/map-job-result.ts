// Feature: job-discovery-live-search
// The Field_Mapper: transforms backend Job_Result records (domain/job-result.ts)
// into the frontend Job_View_Model (domain/types.ts).

import { K } from "../i18n/keys";
import { strings } from "../i18n/strings";
import type { Job, WorkModel } from "./types";
import type { JobResult, SearchResponse } from "./job-result";
import { resolveText } from "./resolve-text";

/**
 * Case-sensitive lookup of recognized `work_model` strings to themselves.
 * Any string not present here (including a case-varied match) is
 * unrecognized (Requirement 4.6).
 */
export const WORK_MODEL_LOOKUP: Record<string, WorkModel> = {
  "On-site": "On-site",
  Hybrid: "Hybrid",
  Remote: "Remote",
};

/**
 * Case-sensitive lookup; `null` or any unrecognized string (including a
 * case-varied match like `"on-site"`) maps to `null` (Requirement 4.6).
 */
export function mapWorkModel(workModel: string | null): WorkModel | null {
  if (workModel === null) {
    return null;
  }
  return WORK_MODEL_LOOKUP[workModel] ?? null;
}

/**
 * Transform one JobResult into one Job view model (Requirements 4.1-4.8).
 *
 * Deprecated Job fields with no live-data source (`urbanFitScore`,
 * `lifestyleFitScore`, `routeDescription`, `monthlyTravelCostBaht`) are set
 * to deterministic defaults (0 / ""); the Map-First Job_Discovery_Screen
 * never reads them, and no requirement governs their live value.
 */
export function mapJobResult(result: JobResult): Job {
  return {
    id: result.job_id ?? "",
    title: result.job_title ?? resolveText(K.jobTitleUnavailable, strings),
    company: result.company_name ?? resolveText(K.companyNameUnavailable, strings),
    urbanFitScore: 0,
    lifestyleFitScore: 0,
    commutingMinutes: result.commute_time_mins,
    routeDescription: "",
    monthlyTravelCostBaht: 0,
    perTripCostBaht: result.per_trip_cost_baht,
    salaryBaht: result.salary ?? 0,
    monthlyCommuteCostBaht: result.monthly_commute_cost_baht,
    transitSegments: result.transit_segments,
    commuteFitScore: result.commute_fit_score,
    skillFitScore: result.skill_fit_score,
    workModel: mapWorkModel(result.work_model),
    location: result.company_location,
  };
}

/** Maps every JobResult in `response.data`, preserving order (Requirement 4.1). */
export function mapSearchResponse(response: SearchResponse): Job[] {
  return response.data.map(mapJobResult);
}
