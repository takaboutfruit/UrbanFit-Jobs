// Feature: job-discovery-map-first
// Transit_Map — HomePin (task 11.1).
//
// Renders the single marker at the candidate's home/residence coordinate.
//
// Requirements:
//   - 7.1: WHEN the candidate's home location coordinate is a valid finite
//     latitude/longitude pair, render a Home_Pin at that coordinate.
//   - 7.2: IF the candidate's home location coordinate is unavailable or
//     invalid, omit the Home_Pin (the parent TransitMap is responsible for
//     showing the "home not set" message and omitting the Isochrone_Overlay).
//
// The visual marker uses a Leaflet `divIcon` (styled HTML, no image assets),
// mirroring the CompanyPin convention. It renders an off-white circle with a
// "home" glyph plus a soft pulsing ring behind it ("home-pin-marker" /
// "home-pin-pulse") so it is unmistakably distinct from the smaller mint/blue
// CompanyPin dots on the map.

import L from "leaflet";
import { Marker } from "react-leaflet";
import { isValidCoordinate } from "../../domain";
import type { Coordinate } from "../../domain";

export interface HomePinProps {
  /** The candidate's home/residence coordinate, or null when unset. */
  home: Coordinate | null;
}

/**
 * Build a lightweight Leaflet `divIcon` for the home pin. Uses its own class
 * names (distinct from `company-pin-marker`) — an off-white filled circle
 * with a "home" glyph plus a soft pulsing ring — so it reads as "the
 * candidate's residence" at a glance rather than another company pin. No
 * image assets are used; the glyph is the globally-loaded Material Symbols
 * Outlined font (Req 1.4).
 */
export function buildHomePinIcon(): L.DivIcon {
  return L.divIcon({
    className: "home-pin-icon",
    html: `
      <span class="home-pin-marker" aria-hidden="true">
        <span class="home-pin-pulse"></span>
        <span class="material-symbols-outlined filled home-pin-marker__glyph">home</span>
      </span>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/**
 * The candidate's home marker. Renders nothing when `home` is null or not a
 * valid finite coordinate (Req 7.2).
 */
export function HomePin({ home }: HomePinProps) {
  if (!isValidCoordinate(home)) {
    return null;
  }

  return (
    <Marker
      position={[home.lat, home.lng]}
      icon={buildHomePinIcon()}
      zIndexOffset={2000}
    />
  );
}
