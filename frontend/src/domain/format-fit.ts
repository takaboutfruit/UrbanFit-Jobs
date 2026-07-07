// Feature: job-discovery-map-first
// Pure logic: format a Fit_Badge's display text for the Commute_Fit_Badge
// and Skill_Fit_Badge (Req 6.3, 6.4, 6.6, 6.7).

import { K } from "../i18n/keys";
import { strings } from "../i18n/strings";
import { clampPercent } from "./clamp-percent";
import { resolveText } from "./resolve-text";

/**
 * Format a Fit_Badge's value text for a commute-fit or skill-fit score.
 *
 * Behavior (Property 10, Req 6.3, 6.4, 6.6, 6.7):
 * - When `score` is a number, the result is `clampPercent(score)` (a whole
 *   number clamped to the inclusive range 0-100) followed by a `%` sign,
 *   e.g. `formatFitBadge(87.6)` -> `"88%"`.
 * - When `score` is `null` or `undefined`, the corresponding badge has no
 *   value to show, so the result is the resolved fit-unavailable indicator
 *   (Thai-first via `resolveText(K.fitUnavailable, strings)`) instead of any
 *   percentage text.
 *
 * @param score a commute-fit or skill-fit score, or null/undefined when unavailable
 * @returns the formatted Fit_Badge value text
 */
export function formatFitBadge(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return resolveText(K.fitUnavailable, strings);
  }

  return `${clampPercent(score)}%`;
}
