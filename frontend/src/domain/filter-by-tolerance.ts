// Feature: urbanfit-jobs-frontend
// Pure logic: commuting-tolerance filtering for the Job Discovery list.

import type { Job } from "./types";

/**
 * Retain only jobs whose commuting time is within the given tolerance.
 *
 * Behavior (Req 6.5):
 *   - Returns a NEW array; the input array and its elements are never mutated.
 *   - Keeps a job only when its `commutingMinutes` is a known value that is
 *     less than or equal to `maxMinutes`.
 *   - EXCLUDES jobs with `commutingMinutes === null`. A null commuting time is
 *     unknown, so the job cannot be guaranteed to fall within the tolerance and
 *     is therefore filtered out.
 *   - Preserves the relative order of the retained jobs. Because the Job List is
 *     ordered by descending Urban-Fit-Score before filtering (via `orderJobs`),
 *     preserving relative order keeps the retained jobs in descending
 *     Urban-Fit-Score order. This function does not re-sort.
 *
 * @param jobs       Jobs to filter (assumed already ordered by caller).
 * @param maxMinutes Maximum acceptable commuting time, in whole minutes.
 * @returns A new array of the retained jobs in their original relative order.
 */
export function filterByTolerance(jobs: Job[], maxMinutes: number): Job[] {
  return jobs.filter(
    (job) => job.commutingMinutes !== null && job.commutingMinutes <= maxMinutes,
  );
}
