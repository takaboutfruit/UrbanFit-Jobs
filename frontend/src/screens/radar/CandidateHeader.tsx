// Feature: urbanfit-jobs-frontend
// Screen 3 — Radar dashboard: CandidateHeader.
//
// Header section at the top of the redesigned Radar dashboard: the
// candidate's name, the applied role, and a large, prominent overall match
// score.

import { clampPercent } from "../../domain";
import { resolveText } from "../../domain";
import { K, strings } from "../../i18n";
import { T } from "../../components";
import type { CandidateProfile } from "../../domain";

export interface CandidateHeaderProps {
  /** The candidate identity + application context to render. */
  profile: CandidateProfile;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Dashboard header: candidate name + applied role on the left, a large
 * overall match score on the right.
 */
export function CandidateHeader({ profile, className }: CandidateHeaderProps) {
  const appliedRoleText = resolveText(K.radarAppliedRoleTemplate, strings).replace(
    "{role}",
    profile.appliedRole,
  );
  const score = clampPercent(profile.overallMatchScore);

  return (
    <header
      data-testid="candidate-header"
      className={[
        "flex flex-col items-start justify-between gap-space-md rounded-xl border border-outline bg-surface-container p-space-lg sm:flex-row sm:items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-space-xs">
        <h1
          data-testid="candidate-name"
          className="text-headline-md font-bold text-on-surface"
        >
          {profile.name}
        </h1>
        <p data-testid="candidate-applied-role" className="text-body-md text-on-surface-variant">
          {appliedRoleText}
        </p>
      </div>

      <div className="flex flex-col items-start gap-space-xs sm:items-end">
        <T
          k={K.radarOverallMatchLabel}
          as="span"
          className="text-label-sm text-on-surface-variant"
        />
        <span
          data-testid="candidate-overall-score"
          className="text-headline-lg font-bold tabular-nums text-primary"
        >
          {score}%
        </span>
      </div>
    </header>
  );
}
