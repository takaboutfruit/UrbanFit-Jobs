// Feature: job-discovery-map-first
// Pure logic: format the Tolerance_Slider value and decide when the
// Tolerance_Target_Indicator should show its mint-green glow accent.

/**
 * Format a maximum commuting time value for display on the Tolerance_Slider,
 * e.g. `formatToleranceValue(20)` -> `"20 นาที"`.
 *
 * Behavior (Req 2.3):
 * - Whole number followed by a single space and the Thai minutes unit "นาที".
 *
 * @param value the selected maximum commuting time in minutes
 * @returns the formatted "{value} นาที" string
 */
export function formatToleranceValue(value: number): string {
  return `${value} นาที`;
}

/**
 * Decide whether the Tolerance_Target_Indicator should display its
 * mint-green (#4edea3) glow accent.
 *
 * Behavior (Req 2.5, 2.7):
 * - True only when the value is exactly 20 minutes.
 * - False for every other value, including values outside the valid range.
 *
 * @param value the selected maximum commuting time in minutes
 * @returns true only when value === 20
 */
export function shouldShowMintGlow(value: number): boolean {
  return value === 20;
}
