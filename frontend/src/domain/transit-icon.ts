// Feature: job-discovery-map-first
// Pure logic: transit mode -> icon mapping and per-segment duration text for
// the Transit_Chain_Row (Req 5.2, 5.5, 5.7).

import type { TransitMode } from "./transit";

/** The Thai minutes unit label, reused for per-segment duration text (Req 5.2). */
export const MINUTES_UNIT = "นาที";

/** Default Material Symbols Outlined icon for an unrecognized transit mode (Req 5.7). */
export const DEFAULT_TRANSIT_ICON = "directions_transit";

/**
 * Material Symbols Outlined icon name per known transit mode (Req 5.5).
 *
 * Each known mode maps to a distinct icon, applied consistently across all
 * job cards. Unrecognized mode strings are not represented here; callers
 * should use `resolveTransitIcon` to fall back to `DEFAULT_TRANSIT_ICON`.
 */
export const TRANSIT_ICON_BY_MODE: Record<TransitMode, string> = {
  Walk: "directions_walk",
  BTS: "tram",
  MRT: "subway",
  Win: "moped",
};

/**
 * Resolve the Material Symbols Outlined icon name for a transit segment's
 * mode. Known modes (`Walk`, `BTS`, `MRT`) resolve to their distinct icon;
 * any other string falls back to `DEFAULT_TRANSIT_ICON` (Req 5.5, 5.7).
 *
 * @param mode the segment's transport mode, possibly an unrecognized string
 * @returns the icon name to render for this mode
 */
export function resolveTransitIcon(mode: TransitMode | string): string {
  return Object.prototype.hasOwnProperty.call(TRANSIT_ICON_BY_MODE, mode)
    ? TRANSIT_ICON_BY_MODE[mode as TransitMode]
    : DEFAULT_TRANSIT_ICON;
}

/**
 * Format a single transit segment's duration as a whole number of minutes
 * followed by a single space and the Thai minutes unit, e.g.
 * `formatSegmentDuration(5)` -> `"5 นาที"` (Req 5.2).
 *
 * @param minutes non-negative whole minutes (0..999) for this leg
 * @returns the formatted per-segment duration string
 */
export function formatSegmentDuration(minutes: number): string {
  const value = Math.trunc(minutes);
  return `${value} ${MINUTES_UNIT}`;
}
