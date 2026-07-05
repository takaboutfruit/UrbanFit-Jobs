// Feature: urbanfit-jobs-frontend
// Pure skill-gap analysis for the radar AdviceAlert (Req 11.1, 11.5).

/**
 * Find the dimension with the largest positive shortfall between a candidate's
 * scores and a benchmark.
 *
 * Behavior (Property 13 / Req 11.1, 11.5):
 * - Iterates over the dimensions present in the `benchmark` map.
 * - For each dimension, shortfall = benchmark[dim] - candidate[dim]. A missing
 *   candidate value is treated as 0, so the full benchmark counts as shortfall.
 * - Returns the dimension whose shortfall is MAXIMAL and strictly positive,
 *   along with that shortfall value.
 * - If no dimension has the candidate strictly below its benchmark (every
 *   shortfall is <= 0), returns null (signals the no-gap confirmation message).
 *
 * Tie-break: when multiple dimensions share the same maximal positive
 * shortfall, the FIRST one encountered while iterating the benchmark keys in
 * insertion order is chosen. This makes the result deterministic.
 *
 * @param candidate map of dimension -> candidate score
 * @param benchmark map of dimension -> benchmark score
 * @returns the dimension and its shortfall, or null when there is no gap
 */
export function largestShortfall(
  candidate: Record<string, number>,
  benchmark: Record<string, number>
): { dimension: string; shortfall: number } | null {
  let best: { dimension: string; shortfall: number } | null = null;

  for (const dimension of Object.keys(benchmark)) {
    const candidateValue = candidate[dimension] ?? 0;
    const shortfall = benchmark[dimension] - candidateValue;

    // Only positive shortfalls count as a gap; strict `>` on the running max
    // preserves the first-encountered tie-break.
    if (shortfall > 0 && (best === null || shortfall > best.shortfall)) {
      best = { dimension, shortfall };
    }
  }

  return best;
}
