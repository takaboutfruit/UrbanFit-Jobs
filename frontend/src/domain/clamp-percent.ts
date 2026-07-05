// Feature: urbanfit-jobs-frontend
// Pure domain logic: percentage clamping.
//
// Used by progress indicators (ProgressBar/ProgressRing), Job/Candidate cards,
// and radar series so every displayed percentage is a whole number in [0, 100].
// Requirements: 4.4, 10.2, 13.1, 13.2, 13.8. Validates Property 1.

/**
 * Clamp any real number to a whole-number percentage in the range [0, 100].
 *
 * Behavior:
 *   - Rounds to the nearest integer using {@link Math.round}. Ties (a fractional
 *     part of exactly .5) round toward +Infinity, so `49.5 -> 50` and
 *     `-0.5 -> 0` (which then clamps to 0 anyway).
 *   - Values below 0 are bounded to 0; values above 100 are bounded to 100.
 *   - Non-finite input (`NaN`, `Infinity`, `-Infinity`) is handled gracefully:
 *     `NaN` returns 0, `Infinity` returns 100, `-Infinity` returns 0.
 *
 * The result is always an integer between 0 and 100 inclusive.
 *
 * @param value - Any real number (e.g. a raw score or percentage).
 * @returns An integer in [0, 100].
 */
export function clampPercent(value: number): number {
  // Guard against NaN (comparisons with NaN are always false, so handle first).
  if (Number.isNaN(value)) {
    return 0;
  }

  // Round toward nearest first, then bound. Rounding +/-Infinity leaves it
  // unchanged, and the bounds below map it into range.
  const rounded = Math.round(value);

  if (rounded < 0) {
    return 0;
  }
  if (rounded > 100) {
    return 100;
  }
  return rounded;
}
