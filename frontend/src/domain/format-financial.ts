// Feature: job-card-financial-metrics
// Pure logic: format a Job_Card's Financial_Comparison_Row amounts —
// monthly salary and monthly transit overhead (assuming 22 working days /
// month, 2 trips per working day).

/**
 * Format an integer baht value (0..999,999) as thousands-grouped digits
 * prefixed with "฿" and suffixed with "/เดือน", e.g.
 * `formatMonthlyBaht(35000)` -> `"฿35,000/เดือน"`.
 *
 * Grouping always uses a comma separator regardless of the environment
 * locale. Numeric inputs are truncated to whole numbers so fractional baht
 * never leaks into the formatted text.
 *
 * @param baht integer baht amount in the range 0..999,999
 * @returns the formatted "฿{amount}/เดือน" string
 */
export function formatMonthlyBaht(baht: number): string {
  const value = Math.trunc(baht);
  const grouped = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `฿${grouped}/เดือน`;
}

/** Working days per month assumed when deriving monthly commute cost. */
export const WORKING_DAYS_PER_MONTH = 22;

/** Trips per working day (round trip) assumed when deriving monthly commute cost. */
export const TRIPS_PER_WORKING_DAY = 2;

/**
 * Derive the monthly commute overhead from a per-trip cost, assuming
 * {@link TRIPS_PER_WORKING_DAY} trips/day across {@link WORKING_DAYS_PER_MONTH}
 * working days, e.g. `deriveMonthlyCommuteCost(45)` -> `1980`.
 *
 * @param perTripCostBaht whole baht per trip (0..999,999)
 * @returns the derived whole-baht monthly commute cost
 */
export function deriveMonthlyCommuteCost(perTripCostBaht: number): number {
  return (
    Math.trunc(perTripCostBaht) *
    TRIPS_PER_WORKING_DAY *
    WORKING_DAYS_PER_MONTH
  );
}

/**
 * Commute-cost-as-percent-of-salary upper bound of the "low" (mint green)
 * band, calibrated to realistic Bangkok urban commuting costs.
 */
export const LOW_COMMUTE_COST_PERCENT_THRESHOLD = 3.0;

/**
 * Commute-cost-as-percent-of-salary threshold above which the
 * Financial_Comparison_Row's cost segment renders in the "high" (coral)
 * color treatment.
 */
export const HIGH_COMMUTE_COST_PERCENT_THRESHOLD = 10.0;

/**
 * Severity bucket for the monthly commute cost relative to salary, driving
 * the Financial_Comparison_Row's cost segment color (calibrated Bangkok
 * urban thresholds):
 * - "low": 0% to {@link LOW_COMMUTE_COST_PERCENT_THRESHOLD}% inclusive ->
 *   mint green (financial benefit / negligible drain).
 * - "high": above {@link HIGH_COMMUTE_COST_PERCENT_THRESHOLD}% -> coral red
 *   (financial drain).
 * - "normal": anything in between -> muted gray (the default/expected range,
 *   e.g. a 5.5% commute cost).
 */
export type CommuteCostSeverity = "low" | "high" | "normal";

/**
 * Classify a monthly commute cost against salary into a color severity
 * bucket for the Financial_Comparison_Row (see {@link CommuteCostSeverity}).
 *
 * @param monthlyCommuteCostBaht whole baht/month commute overhead (0..999,999)
 * @param salaryBaht whole baht/month gross salary (0..999,999)
 */
export function commuteCostSeverity(
  monthlyCommuteCostBaht: number,
  salaryBaht: number
): CommuteCostSeverity {
  const cost = Math.trunc(monthlyCommuteCostBaht);
  const percent = salaryBaht > 0 ? (cost / Math.trunc(salaryBaht)) * 100 : 0;

  if (percent <= LOW_COMMUTE_COST_PERCENT_THRESHOLD) {
    return "low";
  }
  if (percent > HIGH_COMMUTE_COST_PERCENT_THRESHOLD) {
    return "high";
  }
  return "normal";
}

/**
 * Format the monthly commute cost as a percentage of salary, rounded to one
 * decimal place with trailing ".0" dropped, e.g.
 * `formatCommutePercentOfSalary(1540, 28000)` -> `"5.5"`, and
 * `formatCommutePercentOfSalary(0, 32000)` -> `"0"`.
 *
 * @param monthlyCommuteCostBaht whole baht/month commute overhead (0..999,999)
 * @param salaryBaht whole baht/month gross salary (0..999,999)
 * @returns the percentage as a string, without a trailing "%" sign
 */
export function formatCommutePercentOfSalary(
  monthlyCommuteCostBaht: number,
  salaryBaht: number
): string {
  const salary = Math.trunc(salaryBaht);
  if (salary <= 0) {
    return "0";
  }
  const cost = Math.trunc(monthlyCommuteCostBaht);
  const rounded = Math.round((cost / salary) * 1000) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}
