// Feature: job-card-qualifications
// Job_Card — WorkFlexibilityBadge: a visual badge for a job's work model,
// e.g. "Hybrid (WFH 3 days)" or "On-site".

import { formatWorkFlexibility } from "../../domain";
import type { WorkModel } from "../../domain";

export interface WorkFlexibilityBadgeProps {
  /** The job's resolved work model, or null when unavailable. */
  workModel: WorkModel | null;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the Work_Flexibility badge: a bordered pill showing
 * `formatWorkFlexibility(workModel)`, e.g. "Hybrid (WFH 3 days)", "Remote",
 * or "On-site". Visually distinct from the Commute_Fit / Skill_Fit badges
 * (amber-tinted outline, no fill) so it reads as qualification metadata
 * rather than a fit score.
 */
export function WorkFlexibilityBadge({
  workModel,
  className,
}: WorkFlexibilityBadgeProps) {
  return (
    <span
      data-testid="work-flexibility-badge"
      data-work-model={workModel ?? "unspecified"}
      className={[
        // `text-tertiary` (light coral #ffb3af) is used instead of
        // `text-on-tertiary-container` (#711419, a dark maroon meant for text
        // on a *light* tertiary-container fill) — against this badge's
        // near-opaque dark card background, the dark-maroon text failed WCAG
        // AA contrast (~1.7:1). The light tertiary token keeps the same
        // coral identity while reading clearly (>7:1) on the dark surface,
        // matching the light-on-dark pattern already used by FitBadges.
        "rounded-full border border-tertiary/40 bg-tertiary/10 px-space-md py-space-xs text-body-md font-semibold text-tertiary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      🏢 {formatWorkFlexibility(workModel)}
    </span>
  );
}
