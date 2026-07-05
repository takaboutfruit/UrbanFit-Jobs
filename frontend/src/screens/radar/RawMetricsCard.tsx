// Feature: urbanfit-jobs-frontend
// Screen 3 — Radar dashboard: RawMetricsCard.
//
// Card 4 in the right column of the redesigned Radar dashboard: a grid of
// small stat boxes showing raw performance metrics captured during the
// assessment (e.g. time-to-first-keystroke, tests passed, memory used).

import { T } from "../../components";
import { K } from "../../i18n";
import type { RawMetric } from "../../domain";

export interface RawMetricsCardProps {
  /** The raw performance metrics to render, one stat box each. */
  metrics: RawMetric[];
  /** Extra classes for the outer card wrapper. */
  className?: string;
}

/**
 * Card showing a grid of small stat boxes with raw performance metrics.
 */
export function RawMetricsCard({ metrics, className }: RawMetricsCardProps) {
  return (
    <section
      data-testid="raw-metrics-card"
      className={[
        "flex flex-col gap-space-md rounded-xl border border-outline bg-surface-container p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <T
        k={K.radarRawDataTitle}
        as="h3"
        className="text-body-lg font-semibold text-on-surface"
      />
      <div
        data-testid="raw-metrics-grid"
        className="grid grid-cols-2 gap-space-sm sm:grid-cols-3"
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            data-testid="raw-metric-box"
            className="flex flex-col gap-space-xs rounded-md border border-outline bg-surface-container-low p-space-md"
          >
            <span className="text-label-sm text-on-surface-variant">{metric.label}</span>
            <span className="text-body-lg font-semibold tabular-nums text-on-surface">
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
