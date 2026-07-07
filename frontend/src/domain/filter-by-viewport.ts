// Feature: job-discovery-map-first
// Pure logic: viewport-bounds filtering for the Job_List (Req 9.1-9.3).
//
// filterJobsByViewport returns a NEW array; the input array and its elements
// are never mutated, and the relative order of the retained jobs is preserved
// (ordering is applied afterward by orderByCommuteFit).

import type { Job } from "./types";
import type { MapBounds } from "./transit";
import { isValidCoordinate, isWithinBounds } from "./geo";

/**
 * Retain only jobs whose company coordinate is within the current map
 * viewport bounds.
 *
 * Behavior (Property 13, Req 9.1, 9.2, 9.3):
 *   - Returns a NEW array; the input array and its elements are never
 *     mutated.
 *   - Keeps a job only when its `location` is a valid, finite coordinate
 *     AND that coordinate lies within `bounds`, inclusive of the boundary
 *     edges (delegated to `isWithinBounds`).
 *   - EXCLUDES jobs with a `null` `location` or a non-finite lat/lng; an
 *     unplottable job can never be counted as "inside" the viewport.
 *   - Preserves the relative order of the retained jobs.
 *
 * `bounds` may be `null`/`undefined` when the map has not yet reported a
 * settled viewport (e.g. before the first `moveend`/`zoomend`). In that case
 * there is no viewport to filter against yet, so every job with a valid,
 * finite coordinate passes through unfiltered; jobs with invalid
 * coordinates are still excluded per Req 9.3.
 *
 * @param jobs   Jobs to filter.
 * @param bounds Current settled map viewport bounds, or `null`/`undefined`
 *               if none has been reported yet.
 * @returns A new array of the retained jobs in their original relative order.
 */
export function filterJobsByViewport(
  jobs: Job[],
  bounds: MapBounds | null | undefined,
): Job[] {
  if (bounds === null || bounds === undefined) {
    return jobs.filter((job) => isValidCoordinate(job.location));
  }

  return jobs.filter(
    (job) => isValidCoordinate(job.location) && isWithinBounds(job.location, bounds),
  );
}
