// Feature: urbanfit-jobs-frontend
// Shared design-system component: horizontal progress bar.
//
// The filled proportion always equals clampPercent(percent) / 100 and the
// optional numeric label displays exactly clampPercent(percent).
// Requirements: 4.4, 13.2, 13.8. Consumed-by Property 6.

import { clampPercent } from "../domain";

export interface ProgressBarProps {
  /** Raw percentage value (any real number); clamped to a whole [0, 100]. */
  percent: number;
  /** Render the numeric "{value}%" label. Defaults to false. */
  showValue?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Accessible label describing what the bar measures. */
  ariaLabel?: string;
}

/**
 * A horizontal progress bar.
 *
 * The clamped value drives three things a test (Property 6) can read:
 *   - `aria-valuenow` on the progressbar root
 *   - the inline `width: {value}%` on the fill element
 *   - the `data-value` attribute on the fill element (`data-testid="progress-fill"`)
 *
 * Filled proportion = value / 100.
 */
export function ProgressBar({
  percent,
  showValue = false,
  className,
  ariaLabel,
}: ProgressBarProps) {
  const value = clampPercent(percent);

  return (
    <div className={["flex items-center gap-space-sm", className].filter(Boolean).join(" ")}>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
      >
        <div
          data-testid="progress-fill"
          data-value={value}
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      {showValue && (
        <span
          data-testid="progress-value"
          className="shrink-0 text-label-sm tabular-nums text-on-surface"
        >
          {value}%
        </span>
      )}
    </div>
  );
}
