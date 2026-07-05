// Feature: urbanfit-jobs-frontend
// Shared design-system component: circular (SVG) progress ring.
//
// The filled proportion always equals clampPercent(percent) / 100 and the
// optional center label displays exactly clampPercent(percent).
// Requirements: 4.4, 13.2, 13.8. Consumed-by Property 6.

import { clampPercent } from "../domain";

export interface ProgressRingProps {
  /** Raw percentage value (any real number); clamped to a whole [0, 100]. */
  percent: number;
  /** Outer diameter of the ring in pixels. Defaults to 64. */
  size?: number;
  /** Stroke width of the ring in pixels. Defaults to 6. */
  strokeWidth?: number;
  /** Render the numeric "{value}%" label in the center. Defaults to true. */
  showValue?: boolean;
  /** Extra classes for the SVG root. */
  className?: string;
  /** Accessible label describing what the ring measures. */
  ariaLabel?: string;
}

/**
 * A circular SVG progress indicator.
 *
 * The stroke is drawn along a circle of circumference `C = 2 * PI * r`. The
 * dash offset encodes the filled proportion via:
 *
 *     dashoffset = C * (1 - value / 100)
 *
 * so a value of 0 leaves the whole ring "empty" (offset === C) and a value of
 * 100 fills it (offset === 0). Filled proportion = value / 100.
 *
 * Test-readable surface (Property 6):
 *   - `data-value` on the SVG root and on the fill <circle>
 *   - `aria-valuenow` on the root
 *   - `data-circumference` and `strokeDashoffset` on the fill <circle> so a
 *     test can recompute filled proportion = 1 - dashoffset / circumference.
 */
export function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 6,
  showValue = true,
  className,
  ariaLabel,
}: ProgressRingProps) {
  const value = clampPercent(percent);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - value / 100);
  const center = size / 2;

  return (
    <svg
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="progress-ring"
      data-value={value}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-surface-container-high"
      />
      {/* Fill: rotated -90deg so the arc starts at 12 o'clock. */}
      <circle
        data-testid="progress-ring-fill"
        data-value={value}
        data-circumference={circumference}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform={`rotate(-90 ${center} ${center})`}
        className="stroke-primary transition-[stroke-dashoffset] duration-300"
      />
      {showValue && (
        <text
          data-testid="progress-ring-value"
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-on-surface text-label-sm tabular-nums"
        >
          {value}%
        </text>
      )}
    </svg>
  );
}
