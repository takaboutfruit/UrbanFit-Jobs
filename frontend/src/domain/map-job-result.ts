// Feature: job-discovery-live-search
// The Field_Mapper: transforms backend Job_Result records (domain/job-result.ts)
// into the frontend Job_View_Model (domain/types.ts).

import { K } from "../i18n/keys";
import { strings } from "../i18n/strings";
import type { CareerGrowthIndex, Job, WorkModel } from "./types";
import type { JobResult, SearchResponse, TransitSegmentResult } from "./job-result";
import { resolveText } from "./resolve-text";

/**
 * Case-sensitive lookup of recognized `career_growth_index` strings to
 * themselves. Any string not present here (including a case-varied match)
 * is unrecognized and maps to `null`.
 */
export const CAREER_GROWTH_LOOKUP: Record<string, CareerGrowthIndex> = {
  High: "High",
  Medium: "Medium",
  Stable: "Stable",
};

/**
 * Case-sensitive lookup; `null` or any unrecognized string maps to `null`.
 */
export function mapCareerGrowthIndex(
  careerGrowthIndex: string | null,
): CareerGrowthIndex | null {
  if (careerGrowthIndex === null) {
    return null;
  }
  return CAREER_GROWTH_LOOKUP[careerGrowthIndex] ?? null;
}

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
 * Whether every transit segment in `segments` is a walking leg (case-
 * insensitive match on `"walk"`). An empty/null list is not walk-only — there
 * is nothing to base the zero-cost override on, so callers must guard for
 * that separately.
 */
function isWalkOnly(segments: TransitSegmentResult[]): boolean {
  return (
    segments.length > 0 &&
    segments.every((segment) => segment.mode.toLowerCase() === "walk")
  );
}

/**
 * Derive the total commute minutes shown on a Job_Card / pin popup.
 *
 * When `transit_segments` is a non-empty array, the total MUST equal the
 * exact sum of every segment's `minutes` — the header total is never allowed
 * to disagree with the segment breakdown rendered below it. Only when there
 * are no segments (null or empty) does the backend's own
 * `commute_time_mins` stand in as the total.
 */
function deriveCommutingMinutes(result: JobResult): number | null {
  const segments = result.transit_segments;
  if (segments !== null && segments.length > 0) {
    return segments.reduce((total, segment) => total + segment.minutes, 0);
  }
  return result.commute_time_mins;
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
  const segments = result.transit_segments;
  // A walk-only commute (every segment is "Walk") has no fare, regardless of
  // whatever a generic distance-based formula produced upstream.
  const walkOnly = segments !== null && isWalkOnly(segments);

  return {
    id: result.job_id ?? "",
    title: result.job_title ?? resolveText(K.jobTitleUnavailable, strings),
    company: result.company_name ?? resolveText(K.companyNameUnavailable, strings),
    urbanFitScore: 0,
    lifestyleFitScore: 0,
    commutingMinutes: deriveCommutingMinutes(result),
    routeDescription: "",
    monthlyTravelCostBaht: 0,
    perTripCostBaht: walkOnly ? 0 : result.per_trip_cost_baht,
    salaryBaht: result.salary ?? 0,
    monthlyCommuteCostBaht: walkOnly ? 0 : result.monthly_commute_cost_baht,
    transitSegments: segments,
    commuteFitScore: result.commute_fit_score,
    skillFitScore: result.skill_fit_score,
    workModel: mapWorkModel(result.work_model),
    location: result.company_location,
    yearsExperienceRequired: result.years_experience_required,
    careerGrowthIndex: mapCareerGrowthIndex(result.career_growth_index),
  };
}

/** Maps every JobResult in `response.data`, preserving order (Requirement 4.1). */
export function mapSearchResponse(response: SearchResponse): Job[] {
  return response.data.map(mapJobResult);
}
