// Feature: job-discovery-map-first
// Pure logic: the single, shared "does this job qualify" gate used by BOTH
// the Transit_Map pins and the Job_List, so the two views never disagree
// about which jobs are showable for a given home/tolerance.
//
// A job qualifies only when BOTH hold:
//   1. Its `commutingMinutes` is known and <= `toleranceMinutes`
//      (`filterByTolerance`).
//   2. Its `location` is a valid, plottable coordinate that falls inside
//      the (hand-tuned, transit-corridor-biased) isochrone boundary built by
//      `buildIsochrone` for the current `home`/`toleranceMinutes`.
//
// Condition 2 is a hard UI-level constraint: a job is never shown as a pin
// (or, via this shared gate, as a list card) if its coordinate falls outside
// the drawn boundary, even when its `commutingMinutes` alone would qualify
// it. The isochrone's constants in `geo.ts` are tuned against the sample
// dataset so, in practice, every job whose commute time is within tolerance
// also falls inside the boundary — but this function enforces the
// geometric check regardless, so the map and list can never contradict
// what's visually drawn.

import type { Coordinate, Job } from "./types";
import { buildIsochrone, isInsideIsochrone, isValidCoordinate } from "./geo";
import { filterByTolerance } from "./filter-by-tolerance";

/**
 * Retain only jobs that qualify for both the tolerance and the isochrone
 * boundary, given `home` and `toleranceMinutes`.
 *
 * Returns an empty array when `home` is invalid/unset, since there is no
 * boundary to test against (mirrors `buildIsochrone`'s "invalid home -> []"
 * contract).
 *
 * @param jobs             Jobs to filter.
 * @param home             Candidate home/residence coordinate, or
 *                          null/undefined when unset.
 * @param toleranceMinutes Current maximum commuting tolerance in minutes.
 * @returns A new array of the retained jobs in their original relative order.
 */
export function filterJobsByCommuteBoundary(
  jobs: Job[],
  home: Coordinate | null | undefined,
  toleranceMinutes: number,
): Job[] {
  if (!isValidCoordinate(home)) {
    return [];
  }

  const boundary = buildIsochrone(home, toleranceMinutes);

  return filterByTolerance(jobs, toleranceMinutes).filter(
    (job) =>
      isValidCoordinate(job.location) &&
      isInsideIsochrone(job.location, boundary),
  );
}
