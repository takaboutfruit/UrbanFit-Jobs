// Feature: job-discovery-map-first
// Screen 1 — Job Discovery: BoundaryLabel (task 11.3).
//
// The floating text badge anchored on the shaded Isochrone_Overlay area,
// displaying the exact Thai text "ขอบเขตเดินทาง 20 นาที" via the
// `isochroneBoundaryLabel` translation key.
//
// Requirements:
//   - 7.5: WHEN a valid Isochrone_Overlay is rendered, THE Transit_Map SHALL
//     anchor a Boundary_Label onto the shaded Isochrone_Overlay area
//     displaying the exact Thai text "ขอบเขตเดินทาง 20 นาที".
//
// Design: like the existing map-legend / map-unplottable / map-no-locations
// overlays in TransitMap.tsx, this is a plain DOM element (NOT a Leaflet /
// react-leaflet component) rendered as an absolutely-positioned SIBLING of
// the `<MapContainer>` inside the map wrapper div — always present &
// queryable regardless of whether the Leaflet map itself renders. Task 11.5
// wires it into TransitMap, mounting it only while a valid Isochrone_Overlay
// is shown (Req 7.5's "WHEN a valid Isochrone_Overlay is rendered" guard is
// applied by the caller, mirroring how `home` gates `IsochroneOverlay`).
//
// The `home` prop lets this component self-gate the same way `IsochroneOverlay`
// does: it renders nothing when the home coordinate isn't valid, so a valid
// Isochrone_Overlay and a rendered Boundary_Label stay in lockstep.

import { T } from "../../components";
import { K } from "../../i18n";
import { isValidCoordinate } from "../../domain";
import type { Coordinate } from "../../domain";

export interface BoundaryLabelProps {
  /** Candidate's home/residence coordinate; label omitted when invalid. */
  home: Coordinate | null;
}

/**
 * The Boundary_Label badge anchored over the shaded Isochrone_Overlay area
 * (Req 7.5). Renders nothing when `home` is invalid/null, matching the same
 * gating `IsochroneOverlay` uses so the label never appears without its
 * shaded area.
 */
export function BoundaryLabel({ home }: BoundaryLabelProps) {
  if (!isValidCoordinate(home)) {
    return null;
  }

  return (
    <div
      data-testid="boundary-label"
      className="pointer-events-none absolute left-1/2 top-space-md z-[1000] -translate-x-1/2 rounded-full border border-[#4edea3]/60 bg-surface-container/90 px-space-sm py-space-xs text-label-sm text-on-surface shadow-lg"
    >
      <T k={K.isochroneBoundaryLabel} as="span" />
    </div>
  );
}
