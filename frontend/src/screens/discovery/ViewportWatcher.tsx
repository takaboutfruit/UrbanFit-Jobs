// Feature: job-discovery-map-first
// Transit_Map — ViewportWatcher (task 11.4).
//
// A Leaflet event-listener-only child (renders no DOM) that watches the map
// for pan/zoom settling and reports the new viewport bounds to the parent.
//
// Requirements:
//   - 9.1: WHEN the map viewport settles after a pan/zoom (moveend/zoomend),
//     re-derive the job list from the new viewport bounds via a debounced
//     `onSettle(bounds)` callback.
//
// Implementation notes:
//   - Uses `useMapEvents` from react-leaflet, so it must be rendered as a
//     child of a `<MapContainer>` (same convention as CompanyPin/HomePin/
//     IsochroneOverlay).
//   - Debounces the callback so rapid moveend/zoomend bursts (e.g. inertial
//     panning) only trigger one `onSettle` call once the viewport is quiet
//     for `debounceMs`.
//   - The pending timeout is tracked in a ref and cleared on unmount so no
//     stale callback fires after the component is gone.

import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";
import type { MapBounds } from "../../domain";

/** Default debounce delay (ms) applied to viewport-settle notifications. */
export const VIEWPORT_WATCHER_DEBOUNCE_MS = 300;

export interface ViewportWatcherProps {
  /** Called with the new viewport bounds once panning/zooming has settled. */
  onSettle: (bounds: MapBounds) => void;
  /** Debounce delay in ms; defaults to `VIEWPORT_WATCHER_DEBOUNCE_MS`. */
  debounceMs?: number;
}

/**
 * Watches the parent Leaflet map for `moveend`/`zoomend` and invokes a
 * debounced `onSettle(bounds)` with the current viewport's bounding box
 * (Req 9.1). Renders no DOM — it only registers Leaflet event listeners via
 * `useMapEvents`.
 */
export function ViewportWatcher({
  onSettle,
  debounceMs = VIEWPORT_WATCHER_DEBOUNCE_MS,
}: ViewportWatcherProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = useMapEvents({
    moveend: () => scheduleSettle(),
    zoomend: () => scheduleSettle(),
  });

  function scheduleSettle() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const bounds = map.getBounds();
      onSettle({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    }, debounceMs);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return null;
}
