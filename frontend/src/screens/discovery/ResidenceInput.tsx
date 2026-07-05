// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: ResidenceInput (task 7.1).
//
// Controlled free-text input where a candidate pins their Bangkok residence.
//
// Requirements:
//   - 6.1 / 6.6: accept free text up to a MAXIMUM of 100 characters. The input
//     is HARD-CAPPED: any value longer than 100 characters is sliced to the
//     first 100 before being reported through `onChange`, so the stored value
//     never exceeds 100 characters regardless of how the text arrives (typing,
//     paste, autofill, IME composition, or programmatic setting).
//   - 6.7: a whitespace-only value must NOT trigger a residence-based change to
//     the job list. That rule is enforced by the consuming screen
//     (JobDiscoveryScreen, task 7.5); this component only stores/exposes the raw
//     value. See RESIDENCE_MAX_LENGTH + the note on `onChange` below.

import { T } from "../../components";
import { K } from "../../i18n";
import { resolveText } from "../../domain";
import { strings } from "../../i18n";

/** Hard cap for the residence free-text field (Req 6.1 / 6.6). */
export const RESIDENCE_MAX_LENGTH = 100;

/**
 * Enforce the 100-character hard cap.
 *
 * The capping mechanism is a simple prefix slice: `value.slice(0, 100)`. This
 * keeps only the first 100 characters entered and discards the rest, so the
 * result is always ≤ 100 characters. Exported so the Property 11 test (task
 * 7.2) can assert against the exact same mechanism.
 */
export function capResidence(value: string): string {
  return value.slice(0, RESIDENCE_MAX_LENGTH);
}

export interface ResidenceInputProps {
  /** Current residence text (already ≤ 100 chars once it flows through here). */
  value: string;
  /**
   * Called with the capped value whenever the user edits the field. The value
   * passed is guaranteed to be ≤ RESIDENCE_MAX_LENGTH characters.
   *
   * NOTE (Req 6.7): a whitespace-only value is still reported here so the field
   * stays controlled, but the consumer must treat whitespace-only as "no
   * residence-based change" and leave the current job list untouched.
   */
  onChange: (value: string) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Controlled residence text input with a 100-character hard cap.
 */
export function ResidenceInput({ value, onChange, className }: ResidenceInputProps) {
  const placeholder = resolveText(K.residencePlaceholder, strings);

  return (
    <label className={["flex flex-col gap-space-xs", className].filter(Boolean).join(" ")}>
      <T
        k={K.residenceLabel}
        as="span"
        className="text-label-sm text-on-surface-variant"
      />
      <input
        type="text"
        inputMode="text"
        value={value}
        placeholder={placeholder}
        // Native attribute cap; the slice in onChange is the authoritative
        // enforcement for paste / IME / programmatic input.
        maxLength={RESIDENCE_MAX_LENGTH}
        onChange={(e) => onChange(capResidence(e.target.value))}
        className="rounded-md border border-outline bg-surface-container px-space-md py-space-sm text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
      />
    </label>
  );
}
