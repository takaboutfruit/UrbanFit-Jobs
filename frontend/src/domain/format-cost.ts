// Feature: urbanfit-jobs-frontend
// Pure logic: format an estimated monthly travel cost in Thai Baht.

/** The unit suffix appended to a formatted monthly cost ("Baht per month"). */
export const MONTHLY_COST_UNIT = "บ./เดือน";

/**
 * Format an integer baht value (0..999,999) as thousands-grouped digits
 * followed by the "บ./เดือน" unit, e.g. `formatMonthlyCostTHB(1200)` ->
 * `"1,200 บ./เดือน"`.
 *
 * Grouping always uses a comma separator regardless of the environment locale.
 * Stripping the grouping commas and the unit recovers the original integer
 * (Property 4: round-trip).
 *
 * @param baht integer baht amount in the range 0..999,999
 * @returns the formatted cost string
 */
export function formatMonthlyCostTHB(baht: number): string {
  // Normalize to a non-negative integer so grouping is deterministic.
  const value = Math.trunc(baht);
  const grouped = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped} ${MONTHLY_COST_UNIT}`;
}
