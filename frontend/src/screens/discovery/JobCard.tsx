// Feature: job-discovery-map-first, job-card-qualifications
// Job_Card (task 8.5): composes the Map-First rows in order — a Top_Row
// (Primary_Row anchored left, Salary_Tag anchored top-right), Transit_Chain_Row,
// Job_Meta_Row, QualificationsRow (years of experience + career growth),
// Financial_Comparison_Row (commute cost only), then a bottom row pairing
// WorkFlexibilityBadge with Fit_Badges — replacing the old single unified
// fit ring layout.
//
// Requirements:
//   - 4.1: Primary_Row (top-left) shows commuting time + per-trip cost.
//   - UI Layout Refactor (Spatial Distribution): Salary_Tag anchors to the
//     top-right corner, directly opposite the commute time, to spread the
//     financial data and reduce clutter in the bottom row.
//   - 5.1: Transit_Chain_Row renders the job's transit segments.
//   - 6.1: Job_Meta_Row shows the demoted title/company (merged single line,
//     no duplication).
//   - 6.2: Fit_Badges shows Commute_Fit_Badge left of Skill_Fit_Badge.
//   - 6.5: no single unified circular fit chart (ProgressRing) is rendered.
//   - job-card-qualifications: WorkFlexibilityBadge shows the job's work
//     model (e.g. "Hybrid (WFH 3 days)"); QualificationsRow shows required
//     years of experience + career growth index.
//
// Selection behavior (whole card is a focusable button, aria-pressed /
// data-selected, selected ring/border treatment) is unrelated to this task
// and is preserved as-is from the prior implementation.

import { PrimaryRow } from "./PrimaryRow";
import { SalaryTag } from "./SalaryTag";
import { TransitChainRow } from "./TransitChainRow";
import { JobMetaRow } from "./JobMetaRow";
import { QualificationsRow } from "./QualificationsRow";
import { FinancialComparisonRow } from "./FinancialComparisonRow";
import { FitBadges } from "./FitBadges";
import { WorkFlexibilityBadge } from "./WorkFlexibilityBadge";
import type { Job } from "../../domain";

export interface JobCardProps {
  /** The job view model to render. */
  job: Job;
  /** Whether this card is the currently selected one (Req 4.8). */
  isSelected: boolean;
  /** Called with the job id when the card is activated (Req 4.8). */
  onSelect: (id: string) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * A single Job Card.
 *
 * The whole card is a `<button>` so it is keyboard-focusable and activates on
 * Enter/Space as well as click. Selection is exposed two ways a test can read:
 *   - `aria-pressed={isSelected}`
 *   - `data-selected={isSelected}`
 * and the selected visual treatment (primary ring + border) is applied only
 * when `isSelected` is true.
 *
 * The card body composes the four Map-First rows in order (Req 4.1, 5.1,
 * 6.1, 6.2): Primary_Row, Transit_Chain_Row, Job_Meta_Row, Fit_Badges. There
 * is no unified fit ring anywhere on the card (Req 6.5).
 */
export function JobCard({ job, isSelected, onSelect, className }: JobCardProps) {
  return (
    <button
      type="button"
      data-testid="job-card"
      data-selected={isSelected}
      aria-pressed={isSelected}
      onClick={() => onSelect(job.id)}
      className={[
        "flex w-full flex-col gap-space-sm rounded-xl border p-space-lg text-left transition-colors",
        "bg-surface-container",
        isSelected
          ? "border-primary ring-2 ring-primary"
          : "border-surface-container-high hover:border-on-surface-variant",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div data-testid="top-row" className="flex items-start justify-between gap-space-sm">
        <PrimaryRow
          commuteMinutes={job.commutingMinutes}
          perTripCostBaht={job.perTripCostBaht}
        />
        <SalaryTag salaryBaht={job.salaryBaht} />
      </div>
      <TransitChainRow segments={job.transitSegments} />
      <JobMetaRow title={job.title} company={job.company} />
      <QualificationsRow
        yearsExperienceRequired={job.yearsExperienceRequired}
        careerGrowthIndex={job.careerGrowthIndex}
      />
      <FinancialComparisonRow
        salaryBaht={job.salaryBaht}
        monthlyCommuteCostBaht={job.monthlyCommuteCostBaht}
      />
      <div className="flex flex-wrap items-center gap-space-sm">
        <WorkFlexibilityBadge workModel={job.workModel} />
        <FitBadges
          commuteFitScore={job.commuteFitScore}
          skillFitScore={job.skillFitScore}
        />
      </div>
    </button>
  );
}
