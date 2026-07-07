// Feature: job-discovery-map-first
// Screen 1 — Job Discovery: IsochroneOverlay (task 11.2).
//
// Renders the mint-green (#4edea3) commute-boundary polygon radiating from
// the candidate's Home_Pin, built via the pure `buildIsochrone` geo helper.
//
// Requirements:
//   - 7.3: WHEN a valid Home_Pin is displayed, render an Isochrone_Overlay as
//     a mint-green (#4edea3) polygon layer with fill opacity between 0.2 and
//     0.5 inclusive, radiating from the Home_Pin.
//   - 7.4: WHEN the Tolerance_Slider value changes, the Isochrone_Overlay
//     redraws its boundary so the shaded area represents the newly selected
//     maximum commuting time (handled by recomputing `buildIsochrone` on
//     every render since `toleranceMinutes` is a prop, not internal state).
//
// Renders nothing when `home` is invalid/null or the derived isochrone ring
// is empty, matching `buildIsochrone`'s "invalid home -> []" contract.

import { Polygon } from "react-leaflet";
import { buildIsochrone, isValidCoordinate } from "../../domain";
import type { Coordinate } from "../../domain";

/** Mint-green accent color shared across the Map-First design (Req 7.3). */
export const ISOCHRONE_COLOR = "#4edea3";
/** Fill opacity within the required [0.2, 0.5] range (Req 7.3). */
export const ISOCHRONE_FILL_OPACITY = 0.35;

export interface IsochroneOverlayProps {
  /** Candidate's home/residence coordinate; overlay omitted when invalid. */
  home: Coordinate | null;
  /** Current maximum commuting time in minutes driving the boundary radius. */
  toleranceMinutes: number;
}

/**
 * The mint-green isochrone boundary polygon, radiating from `home` and
 * scaled by `toleranceMinutes` (Req 7.3, 7.4).
 */
export function IsochroneOverlay({ home, toleranceMinutes }: IsochroneOverlayProps) {
  if (!isValidCoordinate(home)) {
    return null;
  }

  const ring = buildIsochrone(home, toleranceMinutes);
  if (ring.length === 0) {
    return null;
  }

  return (
    <Polygon
      positions={ring.map((point) => [point.lat, point.lng])}
      pathOptions={{
        color: ISOCHRONE_COLOR,
        fillColor: ISOCHRONE_COLOR,
        fillOpacity: ISOCHRONE_FILL_OPACITY,
        weight: 2,
      }}
    />
  );
}
