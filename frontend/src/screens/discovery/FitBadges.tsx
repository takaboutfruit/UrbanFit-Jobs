// Feature: job-discovery-map-first
// Job_Card Fit_Badges (task 8.4): the two pill badges replacing the single
// unified fit ring — Commute_Fit_Badge (mint fill) positioned left of
// Skill_Fit_Badge (bordered, no fill).
//
// Requirements:
//   - 6.2: two distinct pill-shaped badges aligned horizontally on a single
//     row, Commute_Fit_Badge positioned to the left of Skill_Fit_Badge.
//   - 6.3: Commute_Fit_Badge uses a mint-green (#4edea3) background with
//     text meeting WCAG AA contrast >= 4.5:1. Uses the `primary` /
//     `on-primary` design tokens (#4edea3 / #003824), which already satisfy
//     that contrast ratio (well above 4.5:1 — dark-green text on mint).
//   - 6.4: Skill_Fit_Badge uses a muted-gray bordered treatment with no
//     fill, visually distinct from the Commute_Fit_Badge (`border
//     border-outline`, no background class).
//   - 6.5: no unified circular fit chart is rendered here (or anywhere in
//     this component) — see JobCard, which no longer renders ProgressRing.
//   - 6.6 / 6.7: both badges render `formatFitBadge(score)`, which already
//     returns the fit-unavailable indicator for null/undefined scores.
//
// Typography: the value text uses `text-body-md` (14px), which is strictly
// larger than JobMetaRow's `text-label-sm` (12px, task 8.3).

import { formatFitBadge } from "../../domain";
import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";

export interface FitBadgesProps {
  /** Commute-fit score (0-100), or null when unavailable (Req 6.6). */
  commuteFitScore: number | null;
  /** Skill-fit score (0-100), or null when unavailable (Req 6.7). */
  skillFitScore: number | null;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the Fit_Badges row: Commute_Fit_Badge (mint fill) to the left of
 * Skill_Fit_Badge (bordered, no fill). There is no unified fit ring (Req 6.5).
 */
export function FitBadges({
  commuteFitScore,
  skillFitScore,
  className,
}: FitBadgesProps) {
  const commuteFitLabel = resolveText(K.commuteFitBadgeLabel, strings);
  const skillFitLabel = resolveText(K.skillFitBadgeLabel, strings);

  return (
    <div
      data-testid="fit-badges"
      className={["flex flex-wrap items-center gap-space-sm", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Commute_Fit_Badge: subtle mint outline, explicit Thai label (Req 6.2, 6.3). */}
      <span
        data-testid="commute-fit-badge"
        aria-label={`${commuteFitLabel}: ${formatFitBadge(commuteFitScore)}`}
        className="rounded-full border border-primary/40 bg-primary/10 px-space-md py-space-xs text-body-md font-semibold text-on-primary-container"
      >
        🟢 {commuteFitLabel}: {formatFitBadge(commuteFitScore)}
      </span>

      {/* Skill_Fit_Badge: subtle blue outline, explicit Thai label (Req 6.2, 6.4). */}
      <span
        data-testid="skill-fit-badge"
        aria-label={`${skillFitLabel}: ${formatFitBadge(skillFitScore)}`}
        className="rounded-full border border-secondary/40 bg-secondary/10 px-space-md py-space-xs text-body-md font-semibold text-on-secondary-container"
      >
        🔵 {skillFitLabel}: {formatFitBadge(skillFitScore)}
      </span>
    </div>
  );
}
