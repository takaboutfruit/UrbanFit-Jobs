// Feature: urbanfit-jobs-frontend
// Pure timer formatting for the assessment PromptTimer (Req 8.1, 8.5).

/**
 * Format a duration in seconds as a zero-padded `MM:SS` string.
 *
 * Behavior (Property 9 / Req 8.1, 8.5):
 * - Minutes = floor(total / 60), seconds = total % 60.
 * - Seconds are always two-digit zero-padded ("05", "00").
 * - Minutes are at least two-digit zero-padded and are NOT truncated, so very
 *   large inputs may yield three or more minute digits (e.g. 100 minutes ->
 *   "100:00").
 * - Any value at or below zero floors to "00:00".
 * - Non-integer inputs are floored to whole seconds before formatting.
 *
 * @param totalSeconds duration in seconds (may be fractional or negative)
 * @returns the `MM:SS` representation
 */
export function formatMMSS(totalSeconds: number): string {
  // Floor at zero: non-positive (and NaN) inputs collapse to "00:00".
  if (!(totalSeconds > 0)) {
    return "00:00";
  }

  const whole = Math.floor(totalSeconds);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${mm}:${ss}`;
}
