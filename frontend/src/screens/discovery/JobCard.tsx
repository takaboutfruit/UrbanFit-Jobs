// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: JobCard (task 7.3).
//
// Renders a single job as an interactive, selectable card.
//
// Requirements:
//   - 4.3: non-empty job title and company name.
//   - 4.4: Lifestyle-Fit-Score with a progress indicator whose fill matches
//     the percentage (ProgressRing with showValue).
//   - 4.5: commuting time (whole minutes) + route description; when
//     commutingMinutes is null, show the commute-unavailable indicator.
//   - 4.6: estimated monthly travel cost via formatMonthlyCostTHB.
//   - 4.7 / Property 5: EXACTLY ONE Work-Model tag whose text is the work
//     model (exposed via data-testid="work-model-tag").
//   - 4.8: selected state visually distinct (primary ring/border) and
//     detectable via aria-pressed / data-selected; the whole card is a button
//     calling onSelect(job.id).

import { ProgressRing, T, Icon } from "../../components";
import { formatMonthlyCostTHB, resolveText } from "../../domain";
import type { Job, WorkModel } from "../../domain";
import { K, strings } from "../../i18n";
import type { I18nKey } from "../../i18n";

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

/** Map a WorkModel value to its i18n key so the tag renders a localized label. */
const WORK_MODEL_KEY: Record<WorkModel, I18nKey> = {
  "On-site": K.workModelOnsite,
  Hybrid: K.workModelHybrid,
  Remote: K.workModelRemote,
};

/**
 * A single Job Card.
 *
 * The whole card is a `<button>` so it is keyboard-focusable and activates on
 * Enter/Space as well as click. Selection is exposed two ways a test can read:
 *   - `aria-pressed={isSelected}`
 *   - `data-selected={isSelected}`
 * and the selected visual treatment (primary ring + border) is applied only
 * when `isSelected` is true.
 */
export function JobCard({ job, isSelected, onSelect, className }: JobCardProps) {
  const workModelLabel = resolveText(WORK_MODEL_KEY[job.workModel], strings);

  return (
    <button
      type="button"
      data-testid="job-card"
      data-selected={isSelected}
      aria-pressed={isSelected}
      onClick={() => onSelect(job.id)}
      className={[
        "flex w-full flex-col gap-space-md rounded-xl border p-space-lg text-left transition-colors",
        "bg-surface-container",
        isSelected
          ? "border-primary ring-2 ring-primary"
          : "border-surface-container-high hover:border-on-surface-variant",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Title + company (Req 4.3) alongside the Lifestyle-Fit-Score ring (Req 4.4). */}
      <div className="flex items-start justify-between gap-space-md">
        <div className="flex min-w-0 flex-col gap-space-xs">
          <span
            data-testid="job-title"
            className="truncate text-body-lg font-semibold text-on-surface"
          >
            {job.title}
          </span>
          <span
            data-testid="job-company"
            className="truncate text-body-md text-on-surface-variant"
          >
            {job.company}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-space-xs">
          <ProgressRing
            percent={job.lifestyleFitScore}
            showValue
            ariaLabel={resolveText(K.lifestyleFitLabel, strings)}
          />
          <T
            k={K.lifestyleFitLabel}
            as="span"
            className="text-label-sm text-on-surface-variant"
          />
        </div>
      </div>

      {/* Commute time + route, or the unavailable indicator (Req 4.5). */}
      <div
        data-testid="job-commute"
        className="flex items-center gap-space-xs text-body-md text-on-surface"
      >
        <Icon name="directions_transit" aria-hidden className="text-secondary" />
        {job.commutingMinutes === null ? (
          <T
            k={K.commuteUnavailable}
            as="span"
            className="text-on-surface-variant"
          />
        ) : (
          <span data-testid="job-route">{job.routeDescription}</span>
        )}
      </div>

      {/* Monthly travel cost (Req 4.6) + exactly one Work-Model tag (Req 4.7). */}
      <div className="flex items-center justify-between gap-space-md">
        <span
          data-testid="job-cost"
          className="flex items-center gap-space-xs text-body-md text-on-surface"
        >
          <Icon name="payments" aria-hidden className="text-secondary" />
          {formatMonthlyCostTHB(job.monthlyTravelCostBaht)}
        </span>
        <span
          data-testid="work-model-tag"
          className="rounded-full bg-surface-container-high px-space-md py-space-xs text-label-sm text-on-surface"
        >
          {workModelLabel}
        </span>
      </div>
    </button>
  );
}
