// Feature: job-card-financial-metrics
// Job_Card — Financial_Comparison_Row: the bottom financial line of a
// Map-First job card. Since the salary moved to the Salary_Tag (top-right
// corner, UI Layout Refactor — Spatial Distribution), this row now
// exclusively shows the monthly commute cost and its percent-of-salary
// ratio so the burden is unambiguous.
//
// Format: "ค่าเดินทาง: ฿{cost}/เดือน ({percent}% ของเงินเดือน)".
//
// Color logic (calibrated Bangkok urban thresholds), applied to the ENTIRE
// string:
//   - 0.0% - 3.0%   -> mint green (#00e676): financial benefit.
//   - 3.1% - 10.0%  -> muted standard UI text color (never red at this
//     range, e.g. a 5.5% commute cost stays muted).
//   - > 10.0%       -> coral red (#ff5252): financial drain.

import { K, strings } from "../../i18n";
import {
  resolveText,
  formatMonthlyBaht,
  formatCommutePercentOfSalary,
  commuteCostSeverity,
} from "../../domain";

export interface FinancialComparisonRowProps {
  /** Whole baht/month gross salary (used only to derive the percent ratio). */
  salaryBaht: number;
  /** Whole baht/month derived commute overhead. */
  monthlyCommuteCostBaht: number;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/** Tailwind color classes per commute-cost severity bucket. */
const SEVERITY_CLASSNAME: Record<"low" | "high" | "normal", string> = {
  low: "text-financial-positive", // mint green — 0.0%-3.0% (financial benefit).
  high: "text-financial-negative", // coral red — >10.0% (financial drain).
  normal: "text-financial-neutral", // muted gray — 3.1%-10.0% (default range).
};

/**
 * Renders the Financial_Comparison_Row: the monthly commute cost + its
 * percent-of-salary ratio, entirely colored by severity.
 */
export function FinancialComparisonRow({
  salaryBaht,
  monthlyCommuteCostBaht,
  className,
}: FinancialComparisonRowProps) {
  const commuteCostLabel = resolveText(K.monthlyCommuteCostLabel, strings);
  const percentText = resolveText(K.percentOfSalaryLabel, strings).replace(
    "{percent}",
    formatCommutePercentOfSalary(monthlyCommuteCostBaht, salaryBaht)
  );
  const severity = commuteCostSeverity(monthlyCommuteCostBaht, salaryBaht);

  return (
    <div
      data-testid="financial-comparison-row"
      className={[
        "text-body-md font-semibold",
        SEVERITY_CLASSNAME[severity],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span data-testid="commute-cost-column">
        <span className="font-bold">{commuteCostLabel}:</span>{" "}
        {formatMonthlyBaht(monthlyCommuteCostBaht)} ({percentText})
      </span>
    </div>
  );
}
