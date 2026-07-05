// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: CompanyPin (task 7.7).
//
// Renders ONE Leaflet marker for a single job that has a valid location
// coordinate, plus the popup content shown when the pin is activated.
//
// Requirements:
//   - 5.1: one Company_Pin per job with a valid coordinate (the parent
//     TransitMap only renders a CompanyPin for plottable jobs).
//   - 5.6: activating the pin shows the job title + commuting time in WHOLE
//     minutes (e.g. "45 นาที").
//   - 5.7: when commutingMinutes is null, show the title + a commute-unavailable
//     indicator (K.commuteUnavailable) instead of a time.
//   - 5.8/5.9: the pin matching the selected job renders in a distinct
//     highlighted visual state (a differently-styled div marker). Because
//     selection is single-valued, at most one pin is ever highlighted.
//
// The visual marker uses a Leaflet `divIcon` (styled HTML, no image assets) so
// it renders without the well-known broken default-marker-icon problem and so
// creating the icon is a lightweight, jsdom-safe object construction.
//
// Testability: the popup content is a real DOM `<button>` carrying
// `data-testid="company-pin"`, `data-job-id`, and `data-selected`. When
// react-leaflet is mocked (Marker/Popup -> plain divs that render children),
// this button is queryable so tests can count pins, read the popup text, assert
// the highlighted state, and click to trigger onSelect. Under real Leaflet the
// same button lives inside the popup and the divIcon reflects the highlight.

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { T } from "../../components";
import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";
import type { Job } from "../../domain";

export interface CompanyPinProps {
  /** The job to plot. MUST have a non-null, valid `location` (parent enforces). */
  job: Job;
  /** Whether this pin is the currently selected/highlighted one (Req 5.8). */
  isSelected: boolean;
  /** Called with the job id when the pin (marker or popup button) is activated. */
  onSelect: (id: string) => void;
}

/**
 * Build a lightweight Leaflet `divIcon` for a company pin. The selected pin gets
 * a distinct class (`company-pin-marker--selected`) so it is visually
 * highlighted (Req 5.8). No image assets are used.
 */
export function buildPinIcon(isSelected: boolean): L.DivIcon {
  const selectedClass = isSelected ? " company-pin-marker--selected" : "";
  return L.divIcon({
    className: "company-pin-icon",
    html: `<span class="company-pin-marker${selectedClass}" aria-hidden="true"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

/**
 * A single company marker + popup.
 */
export function CompanyPin({ job, isSelected, onSelect }: CompanyPinProps) {
  const { location } = job;
  // Defensive: parent only renders plottable jobs, but guard anyway.
  if (location == null) {
    return null;
  }

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={buildPinIcon(isSelected)}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(job.id) }}
    >
      <Popup>
        <button
          type="button"
          data-testid="company-pin"
          data-job-id={job.id}
          data-selected={isSelected}
          onClick={() => onSelect(job.id)}
          className="flex flex-col gap-space-xs text-left"
        >
          <span data-testid="pin-title" className="font-semibold text-on-surface">
            {job.title}
          </span>
          {job.commutingMinutes === null ? (
            <T
              k={K.commuteUnavailable}
              as="span"
              className="text-on-surface-variant"
            />
          ) : (
            <span data-testid="pin-commute" className="text-on-surface-variant">
              {`${job.commutingMinutes} ${resolveText(K.toleranceUnit, strings)}`}
            </span>
          )}
        </button>
      </Popup>
    </Marker>
  );
}
