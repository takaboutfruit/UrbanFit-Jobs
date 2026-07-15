// Feature: job-discovery-map-first
// Screen 1 — Job Discovery: IsochroneOverlay (task 11.2).
//
// Renders the mint-green (#4edea3) commute-boundary circle radiating from
// the candidate's Home_Pin, sized in real meters via `isochroneRadiusMeters`
// so the shaded boundary actually bounds the pins the backend returns for
// the same `toleranceMinutes` (previously this used a hand-tuned, unitless
// polygon (`buildIsochrone`) with no relationship to real transit speed,
// which made the circle visually too small/misaligned with valid pins).
//
// Requirements:
//   - 7.3: WHEN a valid Home_Pin is displayed, render an Isochrone_Overlay as
//     a mint-green (#4edea3) circle layer with fill opacity between 0.2 and
//     0.5 inclusive, radiating from the Home_Pin.
//   - 7.4: WHEN the Tolerance_Slider value changes, the Isochrone_Overlay
//     redraws its boundary so the shaded area represents the newly selected
//     maximum commuting time (handled by recomputing the radius on every
//     render since `toleranceMinutes` is a prop, not internal state).
//
// Renders nothing when `home` is invalid/null.

import { Circle } from "react-leaflet";
import { isValidCoordinate, isochroneRadiusMeters } from "../../domain";
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
 * The mint-green isochrone boundary circle, radiating from `home` with a
 * real-world radius (meters) derived from `toleranceMinutes` via a blended
 * transit velocity (Req 7.3, 7.4). The same `toleranceMinutes` value drives
 * both this radius and the `GET /search` `max_time` filter, so the shaded
 * area and the plotted pins stay in sync.
 */
export function IsochroneOverlay({ home, toleranceMinutes }: IsochroneOverlayProps) {
  if (!isValidCoordinate(home)) {
    return null;
  }

  const radius = isochroneRadiusMeters(toleranceMinutes);
  if (radius <= 0) {
    return null;
  }

  return (
    <Circle
      center={[home.lat, home.lng]}
      radius={radius}
      pathOptions={{
        color: ISOCHRONE_COLOR,
        fillColor: ISOCHRONE_COLOR,
        fillOpacity: ISOCHRONE_FILL_OPACITY,
        weight: 2,
      }}
    />
  );
}
