// Feature: job-discovery-map-first
// Pure logic: format a Job_Card's Primary_Row text (commute time + per-trip
// cost), the top row that leads a Map-First job card (Req 4.1-4.5).

import { K } from "../i18n/keys";
import { strings } from "../i18n/strings";
import { resolveText } from "./resolve-text";

/** The Thai minutes unit used by the Primary_Row (Req 4.2). */
const MINUTES_UNIT = "นาที";

/** The Thai per-trip unit used by the Primary_Row (Req 4.2). */
const PER_TRIP_UNIT = "เที่ยว";

/**
 * Format a Job_Card's Primary_Row text: commuting time + per-trip cost.
 *
 * Behavior (Property 4 / Property 5, Req 4.1, 4.2, 4.4, 4.5):
 * - When `commuteMinutes` is a number, the result is exactly
 *   "{minutes} นาที • ฿{cost} / เที่ยว" (a padded bullet " • " separates the
 *   two halves), e.g. `formatPrimaryRow(15, 45)` -> "15 นาที • ฿45 / เที่ยว".
 * - A zero per-trip cost renders as "฿0 / เที่ยว" (Req 4.4), e.g.
 *   `formatPrimaryRow(10, 0)` -> "10 นาที • ฿0 / เที่ยว".
 * - When `commuteMinutes` is null, the commuting time is unavailable, so the
 *   entire row renders the resolved commute-unavailable indicator text
 *   (Thai-first via `resolveText(K.commuteUnavailable, strings)`) instead of
 *   any numeric minute value (Req 4.5).
 * - Numeric inputs are truncated to whole numbers so fractional minutes/baht
 *   never leak into the formatted text.
 *
 * @param commuteMinutes whole minutes (0..999), or null when unavailable
 * @param perTripCostBaht whole baht per trip (0..999,999)
 * @returns the formatted Primary_Row text
 */
export function formatPrimaryRow(
  commuteMinutes: number | null,
  perTripCostBaht: number
): string {
  if (commuteMinutes === null) {
    return resolveText(K.commuteUnavailable, strings);
  }

  const minutes = Math.trunc(commuteMinutes);
  const cost = Math.trunc(perTripCostBaht);

  return `${minutes} ${MINUTES_UNIT} • ฿${cost} / ${PER_TRIP_UNIT}`;
}
