// Feature: urbanfit-jobs-frontend
// Pure logic: job ordering for the Job_List (Req 4.1, 4.2).
//
// orderJobs returns a NEW array that is a permutation of the input, ordered by
// urbanFitScore descending, with company name A→Z as a deterministic tiebreak.
// The function is framework-free, deterministic, and does not mutate its input.

import type { Job } from "./types";

/**
 * Order jobs for display in the Job_List.
 *
 * Ordering rules (Property 2):
 *  - Primary: `urbanFitScore` descending (highest first) — Req 4.1.
 *  - Tiebreak: company name ascending (A→Z) — Req 4.2.
 *
 * The comparison is a total order, so the result is a stable, fully determined
 * permutation of the input. The input array is not mutated; a new array is
 * returned.
 *
 * Company names are compared with a locale-independent lexicographic
 * comparison (`<` / `>`) so ordering is deterministic across environments.
 *
 * @param jobs - the jobs to order (not mutated)
 * @returns a new array containing every input job exactly once, ordered by
 *          score descending then company A→Z
 */
export function orderJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    // Primary: urbanFitScore descending.
    if (a.urbanFitScore !== b.urbanFitScore) {
      return b.urbanFitScore - a.urbanFitScore;
    }
    // Tiebreak: company name ascending (A→Z), locale-independent.
    if (a.company < b.company) return -1;
    if (a.company > b.company) return 1;
    return 0;
  });
}
