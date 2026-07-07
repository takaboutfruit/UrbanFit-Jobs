// Feature: job-discovery-map-first
// Pure logic: isochrone-based filtering of jobs for Company_Pin rendering.

import type { Job } from "./types";
import type { Polygon } from "./transit";
import { isValidCoordinate, pointInPolygon } from "./geo";

/**
 * Retain only jobs whose company coordinate is a valid, finite pair lying
 * inside or on the edge of `isochrone` (Req 8.1-8.4).
 *
 * Behavior:
 *   - Returns a NEW array; the input array and its elements are never mutated.
 *   - Excludes jobs with a null `location` or a `location` containing a
 *     non-finite `lat`/`lng` (Req 8.3).
 *   - Excludes jobs whose valid coordinate lies strictly outside the
 *     isochrone polygon; a coordinate exactly on the boundary edge counts as
 *     inside (Req 8.1, 8.2), matching `pointInPolygon`'s on-edge behavior.
 *   - Preserves the relative order of the retained jobs. Does not re-sort.
 *
 * @param jobs      Jobs to filter.
 * @param isochrone The isochrone boundary polygon (e.g. from `buildIsochrone`).
 * @returns A new array of the retained jobs in their original relative order.
 */
export function filterJobsByIsochrone(jobs: Job[], isochrone: Polygon): Job[] {
  return jobs.filter(
    (job) =>
      isValidCoordinate(job.location) &&
      pointInPolygon(job.location, isochrone),
  );
}
