// Feature: urbanfit-jobs-frontend
// Screen 3 — Radar dashboard: UpskillPriorityCard.
//
// Card 3 in the right column of the redesigned Radar dashboard: upskilling
// recommendations derived from skill gaps in the radar chart data. Each
// recommendation is rendered as an item whose visual treatment depends on
// priority — amber/red for high-priority gaps, blue/neutral for
// medium-priority gaps — plus a CTA to explore an upskill challenge.

import { Icon, T } from "../../components";
import { K } from "../../i18n";
import type { UpskillRecommendation } from "../../domain";

export interface UpskillPriorityCardProps {
  /** The upskill recommendations to render, in display order. */
  recommendations: UpskillRecommendation[];
  /** Called when the "ค้นหา challenge อัปสกิล" CTA is selected. */
  onFindChallenge?: () => void;
  /** Extra classes for the outer card wrapper. */
  className?: string;
}

/** Per-priority visual treatment for an upskill recommendation item. */
const PRIORITY_CLASSES: Record<UpskillRecommendation["priority"], string> = {
  high: "border-error/40 bg-error/10 text-error",
  medium: "border-secondary/40 bg-secondary/10 text-secondary",
};

const PRIORITY_ICON: Record<UpskillRecommendation["priority"], string> = {
  high: "priority_high",
  medium: "trending_up",
};

/**
 * Card listing skill-gap-driven upskill recommendations, color-coded by
 * priority, with a CTA to explore an upskill challenge.
 */
export function UpskillPriorityCard({
  recommendations,
  onFindChallenge,
  className,
}: UpskillPriorityCardProps) {
  return (
    <section
      data-testid="upskill-priority-card"
      className={[
        "flex flex-col gap-space-md rounded-xl border border-outline bg-surface-container p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <T
        k={K.radarUpskillPriorityTitle}
        as="h3"
        className="text-body-lg font-semibold text-on-surface"
      />
      <div className="flex flex-col gap-space-sm">
        {recommendations.map((rec) => (
          <div
            key={rec.label}
            data-testid="upskill-priority-item"
            data-priority={rec.priority}
            role="alert"
            className={[
              "flex flex-col gap-space-xs rounded-md border p-space-md",
              PRIORITY_CLASSES[rec.priority],
            ].join(" ")}
          >
            <span className="flex items-center gap-space-sm text-body-md font-medium">
              <Icon name={PRIORITY_ICON[rec.priority]} aria-hidden />
              {rec.label}
            </span>
            {rec.subtext && (
              <span
                data-testid="upskill-priority-subtext"
                className="pl-space-xl text-body-md text-on-surface-variant"
              >
                {rec.subtext}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTA to explore an upskill challenge. */}
      <button
        type="button"
        data-testid="upskill-find-challenge"
        onClick={onFindChallenge}
        className="mt-space-xs inline-flex items-center gap-space-xs self-start rounded-md bg-primary px-space-md py-space-sm text-label-sm font-medium text-on-primary"
      >
        <Icon name="school" aria-hidden />
        <T k={K.radarUpskillFindChallenge} />
      </button>
    </section>
  );
}
