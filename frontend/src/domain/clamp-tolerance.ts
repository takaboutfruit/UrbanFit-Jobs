// Feature: job-discovery-map-first
// Pure domain logic: commute-tolerance clamping and step-snapping.
//
// Used by the Tolerance_Slider to keep the selected maximum commuting time
// within the valid range and on a valid 5-minute step, including when
// restoring a previously persisted value.
// Requirements: 2.2, 2.4, 2.8.

/** Minimum selectable commute tolerance, in minutes. */
export const TOLERANCE_MIN = 15;

/** Maximum selectable commute tolerance, in minutes. */
export const TOLERANCE_MAX = 120;

/** Step size between valid commute tolerance values, in minutes. */
export const TOLERANCE_STEP = 5;

/** Default/target commute tolerance the slider initializes to, in minutes. */
export const TOLERANCE_TARGET = 20;

/**
 * Snap any real number to the nearest valid commute-tolerance step within
 * [{@link TOLERANCE_MIN}, {@link TOLERANCE_MAX}].
 *
 * Behavior:
 *   - Bounds the input to [TOLERANCE_MIN, TOLERANCE_MAX] first.
 *   - Rounds to the nearest multiple of {@link TOLERANCE_STEP} away from
 *     TOLERANCE_MIN, using {@link Math.round} (ties round toward +Infinity).
 *   - Re-bounds the rounded result so it never falls outside the valid
 *     range (e.g. rounding 119 up to 120 is fine, but rounding near the
 *     max is still clamped defensively).
 *   - Non-finite input (`NaN`, `Infinity`, `-Infinity`) is handled
 *     gracefully: `NaN` and `-Infinity` clamp to TOLERANCE_MIN, `Infinity`
 *     clamps to TOLERANCE_MAX.
 *
 * The result is always an integer multiple of TOLERANCE_STEP within
 * [TOLERANCE_MIN, TOLERANCE_MAX].
 *
 * @param value - Any real number (e.g. a restored/persisted tolerance).
 * @returns A valid tolerance step in [TOLERANCE_MIN, TOLERANCE_MAX].
 */
export function clampToleranceStep(value: number): number {
  // Guard against NaN (comparisons with NaN are always false, so handle
  // first and treat it like the minimum bound).
  if (Number.isNaN(value)) {
    return TOLERANCE_MIN;
  }

  // Bound to the valid range first (also resolves +/-Infinity).
  let bounded = value;
  if (bounded < TOLERANCE_MIN) {
    bounded = TOLERANCE_MIN;
  } else if (bounded > TOLERANCE_MAX) {
    bounded = TOLERANCE_MAX;
  }

  // Snap to the nearest valid step, measured from TOLERANCE_MIN.
  const stepsFromMin = Math.round((bounded - TOLERANCE_MIN) / TOLERANCE_STEP);
  const snapped = TOLERANCE_MIN + stepsFromMin * TOLERANCE_STEP;

  // Re-bound defensively in case rounding pushed the result out of range.
  if (snapped < TOLERANCE_MIN) {
    return TOLERANCE_MIN;
  }
  if (snapped > TOLERANCE_MAX) {
    return TOLERANCE_MAX;
  }
  return snapped;
}
