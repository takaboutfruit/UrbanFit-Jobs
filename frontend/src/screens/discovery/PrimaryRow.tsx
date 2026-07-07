// Feature: job-discovery-map-first
// Job_Card Primary_Row (task 8.1): the top row of a Map-First job card,
// leading with commute time and per-trip cost.
//
// Requirements:
//   - 4.1: shows commuting time (whole minutes) + per-trip cost (whole baht).
//   - 4.2: text is exactly `formatPrimaryRow`'s output, e.g.
//     "15 นาที • ฿45 / เที่ยว".
//   - 4.3: rendered in a white on-surface color at a font size AND font
//     weight that are both strictly greater than the Job_Meta_Row text.
//     Uses `text-body-lg font-bold` (16px / 700) — strictly larger in size
//     and weight than Job_Meta_Row's `text-body-md`-or-smaller, non-bold
//     treatment (task 8.3).
//   - 4.4: zero per-trip cost renders as "฿0 / เที่ยว" (handled by
//     `formatPrimaryRow`).
//   - 4.5: unavailable commute time renders the commute-unavailable
//     indicator instead of a numeric minute value (handled by
//     `formatPrimaryRow`).

import { formatPrimaryRow } from "../../domain";

export interface PrimaryRowProps {
  /** Whole minutes (0..999), or null when the commute time is unavailable (Req 4.5). */
  commuteMinutes: number | null;
  /** Whole baht per trip (0..999,999) (Req 4.1, 4.2, 4.4). */
  perTripCostBaht: number;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the Primary_Row: `formatPrimaryRow(commuteMinutes, perTripCostBaht)`
 * in white on-surface text, strictly larger and bolder than Job_Meta_Row.
 */
export function PrimaryRow({
  commuteMinutes,
  perTripCostBaht,
  className,
}: PrimaryRowProps) {
  return (
    <span
      data-testid="primary-row"
      className={["text-body-lg font-bold text-on-surface", className]
        .filter(Boolean)
        .join(" ")}
    >
      {formatPrimaryRow(commuteMinutes, perTripCostBaht)}
    </span>
  );
}
