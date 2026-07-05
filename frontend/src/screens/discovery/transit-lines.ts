// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: transit line sample data + per-type styling (task 7.7).
//
// The Transit_Map overlays BTS, MRT, and BRT routes, each rendered as a
// visually DISTINCT line (Req 5.4) with a matching legend entry (Req 5.5).
// This module holds:
//   - TRANSIT_STYLE: the per-type color / dash style used by BOTH the map
//     polylines and the DOM legend swatches, so they always stay in sync.
//   - SAMPLE_TRANSIT_LINES: a small in-file set of Bangkok BTS/MRT/BRT lines
//     used as the TransitMap default when the caller supplies none.
//
// Keeping this pure and framework-free lets the styles be shared without
// pulling Leaflet into the legend.

import { K } from "../../i18n";
import type { I18nKey } from "../../i18n";
import type { Coordinate, TransitLine, TransitLineType } from "../../domain";

/** Visual style for one transit line type (color + optional dash pattern). */
export interface TransitStyle {
  /** Stroke color, applied to the polyline and the legend swatch. */
  color: string;
  /** Dash pattern (Leaflet `dashArray`); undefined = solid line. */
  dashArray?: string;
  /** i18n key for the legend label. */
  labelKey: I18nKey;
}

/**
 * Per-type styling. Each type gets a distinct color, and MRT/BRT additionally
 * differ by dash pattern so the three lines remain distinguishable even for
 * users who cannot rely on color alone (Req 5.4).
 */
export const TRANSIT_STYLE: Record<TransitLineType, TransitStyle> = {
  BTS: { color: "#4edea3", labelKey: K.mapLegendBts }, // solid green
  MRT: { color: "#a2c9ff", dashArray: "8 6", labelKey: K.mapLegendMrt }, // dashed blue
  BRT: { color: "#f2cc60", dashArray: "2 6", labelKey: K.mapLegendBrt }, // dotted amber
};

/** Fixed render/legend order for the three transit line types. */
export const TRANSIT_TYPES: TransitLineType[] = ["BTS", "MRT", "BRT"];

function coords(points: Array<[number, number]>): Coordinate[] {
  return points.map(([lat, lng]) => ({ lat, lng }));
}

/**
 * A small representative set of Bangkok transit lines used when the TransitMap
 * caller does not provide its own. Coordinates are approximate and only meant
 * to render a recognizable overlay near central Bangkok.
 */
export const SAMPLE_TRANSIT_LINES: TransitLine[] = [
  {
    type: "BTS",
    name: "BTS Sukhumvit Line",
    path: coords([
      [13.7437, 100.5348],
      [13.7376, 100.5602],
      [13.7304, 100.5698],
      [13.7194, 100.5776],
    ]),
  },
  {
    type: "MRT",
    name: "MRT Blue Line",
    path: coords([
      [13.7563, 100.5018],
      [13.7466, 100.5386],
      [13.7383, 100.5601],
      [13.7226, 100.5732],
    ]),
  },
  {
    type: "BRT",
    name: "BRT Sathorn Line",
    path: coords([
      [13.7189, 100.5231],
      [13.7002, 100.5297],
      [13.6893, 100.5411],
    ]),
  },
];
