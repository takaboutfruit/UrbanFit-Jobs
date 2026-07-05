// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: ToleranceSlider (task 7.1).
//
// Range slider that sets the maximum acceptable commuting time in minutes.
//
// Requirements:
//   - 6.2: select a maximum commute time in the range 15..120 minutes in
//     increments of 5 (min=15, max=120, step=5).
//   - 6.3: display the current value as a numeric value followed by a minutes
//     unit label — rendered here as `"{value} นาที"` (value + K.toleranceUnit).
//   - 6.4: the displayed value updates immediately on change. Because this is a
//     controlled input, the parent updates `value` synchronously in its change
//     handler, so the label re-renders in the same tick as the interaction.
//
// The native `input[type=range]` provides `role="slider"` semantics along with
// aria-valuemin / aria-valuemax / aria-valuenow, so screen readers announce the
// current minute value.

import { T } from "../../components";
import { K } from "../../i18n";
import { resolveText } from "../../domain";
import { strings } from "../../i18n";

/** Tolerance slider bounds and step (Req 6.2). */
export const TOLERANCE_MIN = 15;
export const TOLERANCE_MAX = 120;
export const TOLERANCE_STEP = 5;

export interface ToleranceSliderProps {
  /** Current maximum commute time in minutes (expected 15..120, step 5). */
  value: number;
  /** Called with the new minute value whenever the slider moves. */
  onChange: (minutes: number) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Controlled tolerance range slider.
 *
 * The displayed value is composed as `"{value} {unit}"` where `unit` is the
 * resolved K.toleranceUnit string ("นาที"). It reads the same `value` prop the
 * slider is bound to, so the number shown always matches the slider position.
 */
export function ToleranceSlider({ value, onChange, className }: ToleranceSliderProps) {
  const unit = resolveText(K.toleranceUnit, strings);
  const displayValue = `${value} ${unit}`;

  return (
    <div className={["flex flex-col gap-space-xs", className].filter(Boolean).join(" ")}>
      <div className="flex items-baseline gap-space-xs">
        <T
          k={K.toleranceLabel}
          as="span"
          className="text-label-sm text-on-surface-variant"
        />
        <span className="text-label-sm text-on-surface-variant">:</span>
        {/* Req 6.3 / 6.4: "{value} นาที", updates immediately on change. */}
        <span
          data-testid="tolerance-display"
          className="text-body-md font-medium tabular-nums text-on-surface"
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={TOLERANCE_MIN}
        max={TOLERANCE_MAX}
        step={TOLERANCE_STEP}
        value={value}
        aria-valuemin={TOLERANCE_MIN}
        aria-valuemax={TOLERANCE_MAX}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
