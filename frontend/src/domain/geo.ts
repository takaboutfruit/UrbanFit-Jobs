// Feature: job-discovery-map-first
// Pure geometry helpers for the Map-First job discovery screen: coordinate
// validity, viewport-bounds containment, ray-casting point-in-polygon, and a
// deterministic isochrone-ring approximation. No framework/Leaflet imports.

import type { Coordinate } from "./types";
import type { MapBounds, Polygon } from "./transit";

/** Small tolerance for floating-point on-edge/on-segment comparisons. */
const EPSILON = 1e-9;

/** Number of vertices in the isochrone ring (Req 7.3, 7.4). */
const ISOCHRONE_VERTEX_COUNT = 16;

/**
 * Degrees of lat/lng radius added per minute of tolerance. Arbitrary but
 * fixed constant: what matters for correctness is that it is deterministic
 * and produces a radius that scales linearly with `toleranceMinutes`.
 */
const ISOCHRONE_DEGREES_PER_MINUTE = 0.0015;

/**
 * True when `c` is present and both `lat` and `lng` are finite numbers.
 *
 * Guards every other geo helper below: `NaN`, `Infinity`, `null`, and
 * `undefined` coordinates are never treated as valid (Req 8.3, 9.3).
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
 * Ray-casting point-in-polygon test. A point exactly on an edge of the
 * polygon counts as inside (Req 8.1).
 *
 * Returns false for an invalid/non-finite point or a polygon with fewer
 * than 3 vertices (degenerate; cannot enclose anything).
 *
 * @param point   The point to test (`lng` = x, `lat` = y).
 * @param polygon The polygon ring (need not be explicitly closed; the
 *                 algorithm wraps from the last vertex back to the first).
 */
export function pointInPolygon(point: Coordinate, polygon: Polygon): boolean {
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

/**
 * Builds a deterministic isochrone boundary: a closed regular polygon ring
 * centered on `home` whose radius scales linearly with `toleranceMinutes`
 * (frontend approximation; Req 7.3, 7.4).
 *
 * Because every ring is a uniform scaling of the same fixed 16-gon shape
 * about the same center, a larger tolerance always yields a ring that fully
 * encloses the ring for any smaller tolerance (Property 11).
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
  const radius = safeTolerance * ISOCHRONE_DEGREES_PER_MINUTE;

  const ring: Coordinate[] = [];
  for (let i = 0; i < ISOCHRONE_VERTEX_COUNT; i++) {
    const angle = (2 * Math.PI * i) / ISOCHRONE_VERTEX_COUNT;
    ring.push({
      lat: home.lat + radius * Math.sin(angle),
      lng: home.lng + radius * Math.cos(angle),
    });
  }
  // Close the ring by repeating the first vertex as the last.
  ring.push(ring[0]);

  return ring;
}
