// Feature: job-discovery-live-search
// Search-parameter construction and input validation for the live
// GET /search backend endpoint.

import type { Coordinate } from "./types";
import { isValidCoordinate } from "./geo";

/** Fixed page size sent on every Search_Request (no "load more"). */
export const SEARCH_LIMIT = 100;

/** Fixed page offset sent on every Search_Request (single page only). */
export const SEARCH_OFFSET = 0;

/** Server-side fit sort, always requested. */
export const SEARCH_SORT = "fit" as const;

/** Debounce window (ms) applied to home/toleranceMinutes changes. */
export const SEARCH_DEBOUNCE_MS = 400;

/** Query parameters for one Search_Request (`GET /search`). */
export interface SearchParams {
  lat: number;
  lng: number;
  max_time: number;
  sort: "fit";
  limit: number;
  offset: number;
}

/**
 * True when `home` is a valid, finite coordinate and `toleranceMinutes` is a
 * finite number (Requirement 1.5). Reuses `isValidCoordinate` (geo.ts) so the
 * "finite lat/lng" rule stays defined in exactly one place.
 */
export function isValidSearchInput(
  home: Coordinate | null | undefined,
  toleranceMinutes: number,
): home is Coordinate {
  return isValidCoordinate(home) && Number.isFinite(toleranceMinutes);
}

/**
 * Build the Search_Request query parameters. Callers MUST check
 * `isValidSearchInput` first; this function assumes valid input and performs
 * no clamping/validation of its own (Requirement 1.3, 1.4).
 */
export function buildSearchParams(
  home: Coordinate,
  toleranceMinutes: number,
): SearchParams {
  return {
    lat: home.lat,
    lng: home.lng,
    max_time: toleranceMinutes,
    sort: SEARCH_SORT,
    limit: SEARCH_LIMIT,
    offset: SEARCH_OFFSET,
  };
}
