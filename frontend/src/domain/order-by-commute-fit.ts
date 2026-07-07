// Feature: job-discovery-map-first
// Pure logic: job ordering for the viewport-filtered Job_List (Req 9.5).
//
// orderByCommuteFit returns a NEW array that is a permutation of the input,
// ordered by commuteFitScore descending, with company name A→Z as a
// deterministic tiebreak.

import type { Job } from "./types";

/**
 * Order jobs for display in the Job_List after viewport filtering.
 *
 * Ordering rules (Property 14, Req 9.5):
 *  - Primary: `commuteFitScore` descending (highest first).
 *  - Tiebreak: company name ascending (A→Z).
 *  - A `null` `commuteFitScore` is treated as unavailable and sorts after
 *    every job with a numeric score, consistent with the fit-unavailable
 *    treatment used elsewhere (see `formatFitBadge`). Jobs that both have a
 *    `null` `commuteFitScore` fall back to the company A→Z tiebreak.
 *
 * The comparison is a total order, so the result is a stable, fully
 * determined permutation of the input. The input array is not mutated; a
 * new array is returned.
 *
 * Company names are compared with a locale-independent lexicographic
 * comparison (`<` / `>`) so ordering is deterministic across environments.
 *
 * @param jobs - the jobs to order (not mutated)
 * @returns a new array containing every input job exactly once, ordered by
 *          commuteFitScore descending (nulls last) then company A→Z
 */
export function orderByCommuteFit(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    // Primary: commuteFitScore descending, with null treated as unavailable
    // and sorted after any numeric score.
    if (a.commuteFitScore !== b.commuteFitScore) {
      if (a.commuteFitScore === null) return 1;
      if (b.commuteFitScore === null) return -1;
      return b.commuteFitScore - a.commuteFitScore;
    }
    // Tiebreak: company name ascending (A→Z), locale-independent.
    if (a.company < b.company) return -1;
    if (a.company > b.company) return 1;
    return 0;
  });
}
