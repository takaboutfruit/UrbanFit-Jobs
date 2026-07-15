// Feature: job-discovery-map-first
// Pure geometry helpers for the Map-First job discovery screen: coordinate
// validity, viewport-bounds containment, ray-casting point-in-polygon
// containment, and a hand-tuned transit-corridor-biased "isochrone" shape.
// No framework/Leaflet imports.

import type { Coordinate } from "./types";
import type { MapBounds, Polygon } from "./transit";

/** Small tolerance for floating-point on-edge/on-segment comparisons. */
const EPSILON = 1e-9;

/** Number of vertices in the isochrone ring; higher = smoother lobes. */
const ISOCHRONE_VERTEX_COUNT = 48;

/**
 * Baseline degrees of lat/lng radius added per minute of tolerance, applied
 * in every direction before the corridor lobes below stretch it further.
 * Tuned so the shape stays visually proportionate to a walkable/short-transit
 * neighborhood at the default 20-minute tolerance (~2.2km base radius,
 * ~8km along the strongest transit-corridor lobe) rather than ballooning
 * out to cover the entire metro area. A job whose coordinate falls outside
 * the resulting boundary is never shown — as a pin OR a list card — even if
 * its `commutingMinutes` alone would qualify it (see
 * `filterJobsByCommuteBoundary`); this is a deliberate, hardcoded pitch-demo
 * shape, not a real routing isochrone.
 */
const ISOCHRONE_BASE_DEGREES_PER_MINUTE = 0.001;

/**
 * Blended average transit speed (meters/second) used to size the
 * Isochrone_Overlay's real-world circle radius so the visual boundary
 * actually bounds the pins the backend returns for the same
 * `toleranceMinutes` (Req: Isochrone/pin alignment).
 *
 * ~10 m/s (~36 km/h) approximates a mixed BTS/MRT/BRT trip including
 * station dwell time and last-mile walking, matching the fare/time model
 * `app.db.repository.select_fallback_candidates` uses on the backend
 * (train + last-mile legs). This constant — not `ISOCHRONE_BASE_DEGREES_PER_MINUTE`
 * — drives `isochroneRadiusMeters`, the only radius calculation consumed by
 * the real (non-decorative) map circle in `IsochroneOverlay`.
 */
export const ISOCHRONE_TRANSIT_VELOCITY_MPS = 10;

/**
 * Real-world isochrone radius, in meters, for a given commute tolerance.
 *
 * `radiusMeters = toleranceMinutes * 60 * ISOCHRONE_TRANSIT_VELOCITY_MPS`, so
 * the boundary scales directly with the same `toleranceMinutes` value used
 * to filter jobs server-side (Requirement: same slider state drives both the
 * fetch and the circle). Negative or non-finite input is treated as 0.
 *
 * @param toleranceMinutes Max commute tolerance in minutes.
 * @returns A non-negative radius in meters, suitable for a Leaflet `Circle`.
 */
export function isochroneRadiusMeters(toleranceMinutes: number): number {
  const safeTolerance = Number.isFinite(toleranceMinutes)
    ? Math.max(0, toleranceMinutes)
    : 0;
  return safeTolerance * 60 * ISOCHRONE_TRANSIT_VELOCITY_MPS;
}

/**
 * Hand-picked stretch lobes that bias the isochrone shape toward the sample
 * BTS/MRT/BRT corridors (see `screens/discovery/transit-lines.ts`) instead
 * of a plain circle, so the boundary visually "hugs" the transit lines
 * radiating from home. This is a hardcoded pitch-demo shape, not a routing
 * calculation: `angleDegrees` is the bearing from home in the same
 * convention as the ring generator below (0deg = due east/+lng, 90deg = due
 * north/+lat, measured counter-clockwise), and `strength` is how much extra
 * radius (as a multiple of the baseline radius) is added at that bearing.
 *   - -25deg (ESE): follows the MRT Blue Line's general run east of home.
 *   - -55deg (SE):  follows the BTS Sukhumvit Line's run southeast of home.
 *   - -96deg (S):   follows the BRT Sathorn Line's run south of home.
 */
interface IsochroneLobe {
  angleDegrees: number;
  strength: number;
}

const ISOCHRONE_LOBES: IsochroneLobe[] = [
  { angleDegrees: -25, strength: 1.6 },
  { angleDegrees: -55, strength: 2.0 },
  { angleDegrees: -96, strength: 1.3 },
];

/** Higher = narrower lobes that hug their corridor bearing more tightly. */
const ISOCHRONE_LOBE_SHARPNESS = 2.5;

/**
 * True when `c` is present and both `lat` and `lng` are finite numbers.
 *
 * Guards every other geo helper below: `NaN`, `Infinity`, `null`, and
 * `undefined` coordinates are never treated as valid.
 */
export function isValidCoordinate(
  c: Coordinate | null | undefined,
): c is Coordinate {
  return (
    c !== null &&
    c !== undefined &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng)
  );
}

/**
 * True when a valid, finite coordinate lies within `bounds`, inclusive of
 * the boundary edges (Req 9.1, 9.2).
 *
 * Returns false when the coordinate is invalid/non-finite or when any of
 * the bounds values is non-finite, so malformed input never yields a false
 * "match".
 */
export function isWithinBounds(c: Coordinate, bounds: MapBounds): boolean {
  if (!isValidCoordinate(c)) {
    return false;
  }
  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    return false;
  }

  return (
    c.lat >= bounds.south &&
    c.lat <= bounds.north &&
    c.lng >= bounds.west &&
    c.lng <= bounds.east
  );
}

/**
 * True when `(px, py)` lies on the closed segment from `(x1, y1)` to
 * `(x2, y2)`, within `EPSILON` (collinear AND within the segment's
 * bounding box).
 */
function isOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const cross = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
  if (Math.abs(cross) > EPSILON) {
    return false;
  }

  const withinX =
    px >= Math.min(x1, x2) - EPSILON && px <= Math.max(x1, x2) + EPSILON;
  const withinY =
    py >= Math.min(y1, y2) - EPSILON && py <= Math.max(y1, y2) + EPSILON;
  return withinX && withinY;
}

/**
 * Ray-casting point-in-polygon containment test used to decide whether a
 * job's coordinate falls inside the rendered isochrone shape. A point
 * exactly on a boundary edge counts as inside.
 *
 * Returns false for an invalid/non-finite point or a polygon with fewer
 * than 3 vertices (degenerate; cannot enclose anything).
 *
 * @param point   The point to test (`lng` = x, `lat` = y).
 * @param polygon The polygon ring (need not be explicitly closed; the
 *                 algorithm wraps from the last vertex back to the first).
 */
export function isInsideIsochrone(point: Coordinate, polygon: Polygon): boolean {
  if (!isValidCoordinate(point) || polygon.length < 3) {
    return false;
  }

  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    const xi = vi.lng;
    const yi = vi.lat;
    const xj = vj.lng;
    const yj = vj.lat;

    if (isOnSegment(x, y, xi, yi, xj, yj)) {
      return true;
    }

    const crossesRay = yi > y !== yj > y;
    if (crossesRay) {
      const intersectX = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < intersectX) {
        inside = !inside;
      }
    }
  }

  return inside;
}

/** Converts a bearing in degrees (this module's angle convention) to radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Radius multiplier at a given ring angle: 1 (baseline) plus a smooth bump
 * for each configured corridor lobe, peaking at the lobe's `angleDegrees`
 * and decaying with angular distance. Produces the amoeba/star-shaped
 * silhouette that stretches toward the sample transit corridors instead of
 * a plain circle.
 */
function lobeMultiplier(angleRadians: number): number {
  let multiplier = 1;
  for (const lobe of ISOCHRONE_LOBES) {
    const lobeAngle = toRadians(lobe.angleDegrees);
    const angularAlignment = Math.cos(angleRadians - lobeAngle) - 1; // 0 at peak, negative away from it
    multiplier += lobe.strength * Math.exp(ISOCHRONE_LOBE_SHARPNESS * angularAlignment);
  }
  return multiplier;
}

/**
 * Builds the hand-tuned isochrone boundary: a closed ring centered on `home`
 * whose overall size scales linearly with `toleranceMinutes`, stretched
 * toward the sample BTS/MRT/BRT corridors via `ISOCHRONE_LOBES` instead of
 * forming a plain circle. This is a deterministic, hardcoded pitch-demo
 * shape (not a real routing isochrone) — see `ISOCHRONE_LOBES` above for the
 * corridor-bearing rationale.
 *
 * Every ring is the same lobed silhouette uniformly scaled about the same
 * center, so a larger tolerance always yields a ring that fully encloses
 * the ring for any smaller tolerance.
 *
 * Returns an empty array when `home` is invalid, since there is no center
 * to build a ring around.
 *
 * @param home              Center of the isochrone (candidate's residence).
 * @param toleranceMinutes  Max commute tolerance in minutes; negative or
 *                          non-finite values are treated as 0 (no radius).
 */
export function buildIsochrone(
  home: Coordinate,
  toleranceMinutes: number,
): Polygon {
  if (!isValidCoordinate(home)) {
    return [];
  }

  const safeTolerance = Number.isFinite(toleranceMinutes)
    ? Math.max(0, toleranceMinutes)
    : 0;
  const baseRadius = safeTolerance * ISOCHRONE_BASE_DEGREES_PER_MINUTE;

  const ring: Coordinate[] = [];
  for (let i = 0; i < ISOCHRONE_VERTEX_COUNT; i++) {
    const angle = (2 * Math.PI * i) / ISOCHRONE_VERTEX_COUNT;
    const radius = baseRadius * lobeMultiplier(angle);
    ring.push({
      lat: home.lat + radius * Math.sin(angle),
      lng: home.lng + radius * Math.cos(angle),
    });
  }
  // Close the ring by repeating the first vertex as the last.
  ring.push(ring[0]);

  return ring;
}
