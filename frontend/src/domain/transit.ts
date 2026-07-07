// Feature: job-discovery-map-first
// Transit and map-geometry supporting types for the Map-First job discovery
// screen. These are pure view-model types with no framework dependencies.

import type { Coordinate } from "./types";

/** Transport mode for one leg of a Transit_Chain_Row (Req 5.2, 5.5). */
export type TransitMode = "Walk" | "BTS" | "MRT" | "Win";

/**
 * One leg of a job's transit chain.
 *
 * `mode` is typed as `TransitMode | string` so an unrecognized mode string
 * from upstream data still renders (with a default icon) instead of being
 * rejected (Req 5.7).
 */
export interface TransitSegment {
  /** Transport mode; unknown strings fall back to a default icon (Req 5.7). */
  mode: TransitMode | string;
  /** Non-negative whole minutes (0..999) for this leg (Req 5.2). */
  minutes: number;
}

/** A closed polygon ring used for the isochrone boundary (Req 7.3, 8.1). */
export type Polygon = Coordinate[];

/** The current map viewport's bounding box, inclusive of its edges (Req 9.1, 9.2). */
export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}
