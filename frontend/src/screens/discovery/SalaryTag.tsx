// Feature: job-card-financial-metrics
// Job_Card — Salary_Tag: the salary value anchored to the top-right corner
// of a Map-First job card, directly opposite the Primary_Row's commute time
// (UI Layout Refactor — Spatial Distribution).
//
// Format: just the value, e.g. "฿32,000/เดือน" (no "เงินเดือน:" label — the
// top-right position + bold/light styling already communicates its role as
// the card's secondary focal point after the commute time).

import { formatMonthlyBaht } from "../../domain";

export interface SalaryTagProps {
  /** Whole baht/month gross salary. */
  salaryBaht: number;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the Salary_Tag: `formatMonthlyBaht(salaryBaht)` in bold, light
 * on-surface text — a secondary focal point after the Primary_Row.
 */
export function SalaryTag({ salaryBaht, className }: SalaryTagProps) {
  return (
    <span
      data-testid="salary-tag"
      className={[
        "shrink-0 whitespace-nowrap text-body-md font-bold text-on-surface",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {formatMonthlyBaht(salaryBaht)}
    </span>
  );
}
