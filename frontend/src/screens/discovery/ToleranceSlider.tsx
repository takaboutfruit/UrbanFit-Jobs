// Feature: job-discovery-map-first
// Screen 1 — Job Discovery: ToleranceSlider (task 9.2).
//
// Range slider that sets the maximum acceptable commuting time in minutes,
// centered on the "20-minute city" concept.
//
// Requirements:
//   - 2.1: label followed by a trailing ":" (Discovery_Header composition).
//   - 2.2: default value of 20 minutes (owned by the parent screen; this
//     component clamps whatever value it is given).
//   - 2.3: display the current value as `"{value} นาที"` via
//     `formatToleranceValue`.
//   - 2.4: allow selecting a maximum commuting time within [15, 120] in
//     increments of 5 (min=15, max=120, step=5).
//   - 2.5 / 2.7: the Tolerance_Target_Indicator (here, the current-value
//     display) shows a mint-green (#4edea3) glow accent if and only if the
//     value is exactly 20 minutes, via `shouldShowMintGlow`.
//   - 2.6: the displayed value updates immediately on change (controlled
//     input; the parent updates `value` synchronously so the label re-renders
//     in the same tick as the interaction).
//   - 2.8: a restored value outside [15, 120] or not a multiple of 5 is
//     clamped to the nearest valid step via `clampToleranceStep`.
//
// The native `input[type=range]` provides `role="slider"` semantics along with
// aria-valuemin / aria-valuemax / aria-valuenow, so screen readers announce the
// current minute value.

import { T } from "../../components";
import { K } from "../../i18n";
import {
  clampToleranceStep,
  formatToleranceValue,
  shouldShowMintGlow,
  TOLERANCE_MIN,
  TOLERANCE_MAX,
  TOLERANCE_STEP,
} from "../../domain";

// Re-exported under the same names for `src/screens/discovery/index.ts` and
// any other existing consumers of this module's local constants.
export { TOLERANCE_MIN, TOLERANCE_MAX, TOLERANCE_STEP };

/** Mint-green accent color for the Tolerance_Target_Indicator glow (Req 2.5). */
const MINT_GLOW_COLOR = "#4edea3";

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
 * The displayed value is composed via `formatToleranceValue`, e.g.
 * `"20 นาที"`. The value used for display and slider attributes is always
 * defensively clamped via `clampToleranceStep`, so an out-of-range or
 * off-step `value` prop (e.g. a restored value that has not yet been
 * clamped upstream) is never rendered raw.
 */
export function ToleranceSlider({ value, onChange, className }: ToleranceSliderProps) {
  const clampedValue = clampToleranceStep(value);
  const displayValue = formatToleranceValue(clampedValue);
  const showMintGlow = shouldShowMintGlow(clampedValue);

  return (
    <div className={["flex flex-col gap-space-xs", className].filter(Boolean).join(" ")}>
      <div className="flex items-baseline gap-space-xs">
        <T
          k={K.toleranceLabel}
          as="span"
          className="text-label-sm text-on-surface-variant"
        />
        {/* Req 2.1: label followed by a trailing ":". */}
        <span className="text-label-sm text-on-surface-variant">:</span>
        {/* Req 2.3 / 2.6: "{value} นาที", updates immediately on change. */}
        {/* Req 2.5 / 2.7: Tolerance_Target_Indicator mint-green glow only at 20. */}
        <span
          data-testid="tolerance-display"
          className="rounded-full px-space-xs text-body-md font-medium tabular-nums text-on-surface transition-shadow"
          style={
            showMintGlow
              ? {
                  boxShadow: `0 0 0 2px ${MINT_GLOW_COLOR}, 0 0 8px 2px ${MINT_GLOW_COLOR}`,
                }
              : undefined
          }
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={TOLERANCE_MIN}
        max={TOLERANCE_MAX}
        step={TOLERANCE_STEP}
        value={clampedValue}
        aria-valuemin={TOLERANCE_MIN}
        aria-valuemax={TOLERANCE_MAX}
        aria-valuenow={clampedValue}
        aria-valuetext={displayValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
