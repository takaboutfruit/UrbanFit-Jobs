// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: TransitMap + legend (task 7.7).
//
// The interactive Bangkok transit map (Req 5). It:
//   - plots exactly one CompanyPin per job with a valid location (Req 5.1) and
//     omits jobs with no coordinate, surfacing the unplottable COUNT (Req 5.2);
//   - shows a "no company locations" message when nothing is plottable (Req 5.3);
//   - overlays BTS/MRT/BRT routes as visually distinct polylines (Req 5.4) with
//     a matching DOM legend identifying each line (Req 5.5);
//   - highlights the pin matching `selectedJobId` (Req 5.8) — single-valued, so
//     at most one pin is highlighted (Req 5.9);
//   - is built on Leaflet via react-leaflet (Req 5.10);
//   - disables one-finger drag-to-pan below 768px so the page scrolls with one
//     finger (Req 14.6); two-finger touch-zoom stays enabled.
//
// Design for testability & jsdom-safety:
//   - The derived data (which jobs are plottable, the unplottable count, and the
//     no-locations flag) comes from the PURE, framework-free
//     `partitionJobsByCoordinate` helper (no Leaflet import), so it can be
//     unit/property tested without rendering a map (Property 8, task 7.8).
//   - All overlays (legend, unplottable indicator, no-locations message) render
//     as plain DOM SIBLINGS of the Leaflet container — always present and
//     queryable regardless of whether the map itself renders.
//   - The one-finger-pan state is exposed as `data-onefinger-pan` on the outer
//     wrapper (always plain DOM) so a test can assert it below 768px without
//     depending on Leaflet internals.
//   - Component tests mock `react-leaflet` (MapContainer/TileLayer/Marker/
//     Popup/Polyline -> lightweight divs) so pins/popups/legend are assertable.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { T } from "../../components";
import { K, strings } from "../../i18n";
import {
  buildIsochrone,
  filterByTolerance,
  filterJobsByIsochrone,
  isValidCoordinate,
  resolveText,
} from "../../domain";
import type { Coordinate, Job, MapBounds, TransitLine } from "../../domain";
import { CompanyPin } from "./CompanyPin";
import { HomePin } from "./HomePin";
import { IsochroneOverlay } from "./IsochroneOverlay";
import { BoundaryLabel } from "./BoundaryLabel";
import { ViewportWatcher } from "./ViewportWatcher";
import {
  SAMPLE_TRANSIT_LINES,
  TRANSIT_STYLE,
  TRANSIT_TYPES,
} from "./transit-lines";

/** Center of the Bangkok map view (Req 5.1/5.3). */
export const BANGKOK_CENTER: Coordinate = { lat: 13.7563, lng: 100.5018 };
/** Default zoom for the Bangkok view. */
export const BANGKOK_ZOOM = 12;
/** Viewport width (px) below which one-finger pan is disabled (Req 14.6). */
export const MOBILE_BREAKPOINT_PX = 768;

/** Result of partitioning jobs by whether they have a valid map coordinate. */
export interface JobCoordinatePartition {
  /** Jobs that have a valid location coordinate — one pin each (Req 5.1). */
  plottable: Job[];
  /** Count of jobs with no valid coordinate (Req 5.2). */
  unplottableCount: number;
}

/**
 * Partition a job list by coordinate validity.
 *
 * Pure and dependency-free (no Leaflet), so it is unit/property testable without
 * rendering a map. The number of `plottable` jobs equals the number of jobs with
 * a valid coordinate, `unplottableCount` equals the number of jobs without one,
 * and the two always sum to the input length (Property 8 / Req 5.1, 5.2).
 *
 * @param jobs - The jobs to partition.
 * @returns `{ plottable, unplottableCount }`.
 */
export function partitionJobsByCoordinate(jobs: Job[]): JobCoordinatePartition {
  const plottable: Job[] = [];
  let unplottableCount = 0;
  for (const job of jobs) {
    if (isValidCoordinate(job.location)) {
      plottable.push(job);
    } else {
      unplottableCount += 1;
    }
  }
  return { plottable, unplottableCount };
}

/**
 * Whether the current viewport is below the mobile breakpoint. Prefers
 * `matchMedia` but falls back to `innerWidth` (jsdom does not implement
 * matchMedia), and never throws.
 */
function computeIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
        .matches;
    } catch {
      // fall through to innerWidth
    }
  }
  return window.innerWidth < MOBILE_BREAKPOINT_PX;
}

/**
 * Track the mobile viewport state, updating on resize. Drives the one-finger-pan
 * disabling below 768px (Req 14.6).
 */
function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => computeIsMobile());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const update = () => setIsMobile(computeIsMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

export interface TransitMapProps {
  /** Jobs to plot (already ordered + filtered by the screen). */
  jobs: Job[];
  /** id of the currently selected job, or null (Req 5.8). */
  selectedJobId: string | null;
  /** Called with a job id when a pin is activated. */
  onSelect: (id: string) => void;
  /** Candidate's home/residence coordinate, or null when unset (Req 7.1, 7.2, 7.6). */
  home: Coordinate | null;
  /** Current maximum commuting time in minutes driving the isochrone radius (Req 7.3, 7.4, 8.x). */
  toleranceMinutes: number;
  /** Called with the new viewport bounds once panning/zooming has settled (Req 9.1). */
  onViewportSettle?: (bounds: MapBounds) => void;
  /** Transit routes to overlay; defaults to an in-file Bangkok sample. */
  transitLines?: TransitLine[];
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * The interactive Bangkok transit map.
 */
export function TransitMap({
  jobs,
  selectedJobId,
  onSelect,
  home,
  toleranceMinutes,
  onViewportSettle,
  transitLines = SAMPLE_TRANSIT_LINES,
  className,
}: TransitMapProps) {
  const isMobile = useIsMobileViewport();
  const { plottable, unplottableCount } = partitionJobsByCoordinate(jobs);
  const hasNoLocations = plottable.length === 0;
  // Map pins are filtered by the isochrone (Req 8.1-8.4). When home is unset
  // `buildIsochrone` returns [] so `filterJobsByIsochrone` yields no pins; the
  // "home not set" message (below) explains why, and the map still renders
  // (Req 7.6). Hard threshold (Req: strict filter logic): a job whose
  // commute time exceeds `toleranceMinutes` never appears as a pin either,
  // even if its coordinate falls inside the isochrone's geometric
  // approximation.
  const isochronePins = isValidCoordinate(home)
    ? filterJobsByIsochrone(
        filterByTolerance(plottable, toleranceMinutes),
        buildIsochrone(home, toleranceMinutes),
      )
    : [];

  return (
    <div
      data-testid="transit-map"
      // Exposes the one-finger-pan state for tests + styling (Req 14.6).
      data-onefinger-pan={isMobile ? "disabled" : "enabled"}
      className={[
        "relative h-full min-h-64 w-full overflow-hidden rounded-xl border border-outline bg-surface-container-low",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <MapContainer
        center={[BANGKOK_CENTER.lat, BANGKOK_CENTER.lng]}
        zoom={BANGKOK_ZOOM}
        // Req 14.6: below 768px disable one-finger drag-to-pan so the page can
        // be scrolled with one finger; two-finger touch-zoom stays enabled.
        dragging={!isMobile}
        touchZoom={true}
        scrollWheelZoom={false}
        className="h-full min-h-64 w-full"
        style={{ height: "100%", minHeight: "16rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* BTS/MRT/BRT route overlays, each visually distinct (Req 5.4). */}
        {transitLines.map((line, index) => {
          const style = TRANSIT_STYLE[line.type];
          return (
            <Polyline
              key={`${line.type}-${index}`}
              positions={line.path.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: style.color,
                weight: 4,
                dashArray: style.dashArray,
              }}
            />
          );
        })}

        {/* Isochrone below the pins; omitted entirely when home is invalid (Req 7.3, 7.6). */}
        <IsochroneOverlay home={home} toleranceMinutes={toleranceMinutes} />

        {/* Home marker; omitted when home is invalid (Req 7.1, 7.2). */}
        <HomePin home={home} />

        {/* Company pins filtered to the isochrone (Req 8.1-8.4); selected one highlighted. */}
        {isochronePins.map((job) => (
          <CompanyPin
            key={job.id}
            job={job}
            isSelected={job.id === selectedJobId}
            onSelect={onSelect}
          />
        ))}

        {/* Debounced viewport-settle notifications (Req 9.1). */}
        <ViewportWatcher
          onSettle={(bounds) => onViewportSettle?.(bounds)}
        />
      </MapContainer>

      {/* --- Plain-DOM overlays (always present & queryable) ----------------- */}

      {/* Boundary label anchored on the shaded isochrone area (Req 7.5). */}
      <BoundaryLabel home={home} />

      {/* Home-not-set message; map itself still renders (Req 7.6). */}
      {!isValidCoordinate(home) && (
        <div
          data-testid="map-home-not-set"
          role="status"
          className="absolute inset-x-space-md top-space-md z-[1000] rounded-lg bg-surface-container/90 p-space-sm text-center text-body-md text-on-surface-variant shadow-lg"
        >
          <T k={K.homeNotSet} />
        </div>
      )}

      {/* Legend identifying each transit line (Req 5.5). */}
      <ul
        data-testid="map-legend"
        aria-label={resolveText(K.mapLegendTitle, strings)}
        className="pointer-events-none absolute bottom-space-md left-space-md z-[1000] flex flex-col gap-space-xs rounded-lg bg-surface-container/90 p-space-sm text-label-sm text-on-surface shadow-lg"
      >
        {TRANSIT_TYPES.map((type) => {
          const style = TRANSIT_STYLE[type];
          return (
            <li
              key={type}
              data-testid={`map-legend-${type}`}
              className="flex items-center gap-space-xs"
            >
              <span
                aria-hidden="true"
                className="inline-block h-1 w-6 rounded-full"
                style={{
                  backgroundColor: style.color,
                  ...(style.dashArray
                    ? {
                        backgroundImage: `repeating-linear-gradient(to right, ${style.color} 0 6px, transparent 6px 10px)`,
                        backgroundColor: "transparent",
                      }
                    : {}),
                }}
              />
              <T k={style.labelKey} as="span" />
            </li>
          );
        })}
      </ul>

      {/* Unplottable-count indicator (Req 5.2). */}
      {unplottableCount > 0 && (
        <div
          data-testid="map-unplottable"
          data-count={unplottableCount}
          role="status"
          className="absolute right-space-md top-space-md z-[1000] rounded-lg bg-surface-container/90 px-space-sm py-space-xs text-label-sm text-on-surface-variant shadow-lg"
        >
          {`${unplottableCount} `}
          <T k={K.mapUnplottableCount} as="span" />
        </div>
      )}

      {/* No-company-locations message (Req 5.3). */}
      {hasNoLocations && (
        <div
          data-testid="map-no-locations"
          role="status"
          className="absolute inset-x-space-md top-1/2 z-[1000] -translate-y-1/2 rounded-lg bg-surface-container/90 p-space-md text-center text-body-md text-on-surface-variant shadow-lg"
        >
          <T k={K.mapNoLocations} />
        </div>
      )}
    </div>
  );
}
