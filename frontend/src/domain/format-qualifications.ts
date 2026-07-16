// Feature: job-card-qualifications
// Pure logic: format a Job_Card's Work_Flexibility badge text and
// qualifications subtitle line (years of experience required + career
// growth index).

import { K } from "../i18n/keys";
import { strings } from "../i18n/strings";
import { resolveText } from "./resolve-text";
import type { CareerGrowthIndex, WorkModel } from "./types";

/** Work-from-home days/week shown in the Hybrid work-flexibility badge. */
export const HYBRID_WFH_DAYS_PER_WEEK = 3;

/**
 * Format the Work_Flexibility badge text for a job's resolved work model,
 * e.g. `formatWorkFlexibility("Hybrid")` -> `"ไฮบริด (WFH 3 วัน)"` (or the
 * English default `"Hybrid (WFH 3 days)"`).
 *
 * Returns the qualifications-unavailable indicator when `workModel` is
 * `null` (Unspecified_Work_Model).
 *
 * @param workModel the job's resolved work model, or null when unavailable
 * @returns the formatted badge text
 */
export function formatWorkFlexibility(workModel: WorkModel | null): string {
  if (workModel === null) {
    return resolveText(K.qualificationsUnavailable, strings);
  }
  if (workModel === "Hybrid") {
    return resolveText(K.workFlexibilityHybridTemplate, strings).replace(
      "{days}",
      String(HYBRID_WFH_DAYS_PER_WEEK),
    );
  }
  if (workModel === "Remote") {
    return resolveText(K.workFlexibilityRemote, strings);
  }
  return resolveText(K.workFlexibilityOnsite, strings);
}

/**
 * Case-sensitive lookup from a `CareerGrowthIndex` to its resolved display
 * label translation key.
 */
const CAREER_GROWTH_LABEL_KEY: Record<CareerGrowthIndex, string> = {
  High: K.careerGrowthHigh,
  Medium: K.careerGrowthMedium,
  Stable: K.careerGrowthStable,
};

/**
 * Format the qualifications subtitle line: required years of experience +
 * career growth index, e.g.
 * `formatQualificationsSubtitle(3, "High")` ->
 * `"ประสบการณ์ที่ต้องการ: 3 ปี • โอกาสเติบโต: สูง"`.
 *
 * Either value may be `null` (unavailable); the qualifications-unavailable
 * indicator is substituted in its place so the line always renders with both
 * halves present.
 *
 * @param yearsExperienceRequired whole years of required experience, or null
 * @param careerGrowthIndex the career growth bucket, or null
 * @returns the formatted subtitle text
 */
export function formatQualificationsSubtitle(
  yearsExperienceRequired: number | null,
  careerGrowthIndex: CareerGrowthIndex | null,
): string {
  const unavailable = resolveText(K.qualificationsUnavailable, strings);
  const years =
    yearsExperienceRequired === null
      ? unavailable
      : String(Math.trunc(yearsExperienceRequired));
  const growth =
    careerGrowthIndex === null
      ? unavailable
      : resolveText(CAREER_GROWTH_LABEL_KEY[careerGrowthIndex], strings);

  return resolveText(K.qualificationsSubtitleTemplate, strings)
    .replace("{years}", years)
    .replace("{growth}", growth);
}
