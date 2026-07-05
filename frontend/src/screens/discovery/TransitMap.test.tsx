// Feature: urbanfit-jobs-frontend
// Tests for TransitMap + CompanyPin (task 7.7).
//
// Two layers:
//   1. The PURE `partitionJobsByCoordinate` helper (no Leaflet) — covers the
//      Property 8 basics: plottable == jobs with valid coords, unplottableCount
//      == jobs with null coord, and the two sum to the total (Req 5.1/5.2).
//   2. The rendered component with `react-leaflet` MOCKED (MapContainer/
//      TileLayer/Marker/Popup/Polyline -> lightweight divs that render their
//      children) so pins, popups, legend, indicators, and the highlighted pin
//      are assertable under jsdom without a real map.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import fc from "fast-check";

// Mock react-leaflet with lightweight stand-ins. Each renders its children so
// the Marker -> Popup -> button chain (and Polylines) end up in the DOM.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  Polyline: () => <div data-testid="polyline" />,
}));

import { TransitMap, partitionJobsByCoordinate } from "./TransitMap";
import { SAMPLE_TRANSIT_LINES } from "./transit-lines";
import { strings, K } from "../../i18n";
import { resolveText } from "../../domain";
import type { Job } from "../../domain";

function makeJob(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    title: `Title ${id}`,
    company: `Company ${id}`,
    urbanFitScore: 80,
    lifestyleFitScore: 60,
    commutingMinutes: 30,
    routeDescription: `route ${id}`,
    monthlyTravelCostBaht: 1000,
    workModel: "Remote",
    location: { lat: 13.75, lng: 100.5 },
    ...overrides,
  };
}

// --------------------------------------------------------------------------
// Pure helper: partitionJobsByCoordinate (Property 8 basics)
// --------------------------------------------------------------------------
describe("partitionJobsByCoordinate", () => {
  it("plottable == jobs with a valid coordinate; unplottableCount == jobs with none", () => {
    const jobs: Job[] = [
      makeJob("a", { location: { lat: 13.7, lng: 100.5 } }),
      makeJob("b", { location: null }),
      makeJob("c", { location: { lat: 13.8, lng: 100.6 } }),
      makeJob("d", { location: null }),
    ];
    const { plottable, unplottableCount } = partitionJobsByCoordinate(jobs);
    expect(plottable.map((j) => j.id)).toEqual(["a", "c"]);
    expect(unplottableCount).toBe(2);
  });

  it("treats non-finite lat/lng as unplottable", () => {
    const jobs: Job[] = [
      makeJob("a", { location: { lat: Number.NaN, lng: 100.5 } }),
      makeJob("b", { location: { lat: 13.7, lng: Number.POSITIVE_INFINITY } }),
      makeJob("c", { location: { lat: 13.7, lng: 100.5 } }),
    ];
    const { plottable, unplottableCount } = partitionJobsByCoordinate(jobs);
    expect(plottable.map((j) => j.id)).toEqual(["c"]);
    expect(unplottableCount).toBe(2);
  });

  it("plottable count + unplottable count always equals the total (Property 8 basics)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            hasCoord: fc.boolean(),
            id: fc.string(),
          }),
        ),
        (specs) => {
          const jobs = specs.map((s, i) =>
            makeJob(`${s.id}-${i}`, {
              location: s.hasCoord ? { lat: 13.7, lng: 100.5 } : null,
            }),
          );
          const { plottable, unplottableCount } =
            partitionJobsByCoordinate(jobs);
          return plottable.length + unplottableCount === jobs.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --------------------------------------------------------------------------
// Rendered component (react-leaflet mocked)
// --------------------------------------------------------------------------
describe("TransitMap component", () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  function setViewportWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  const noop = () => {};

  it("renders one pin per job with a valid coordinate (Req 5.1)", () => {
    const jobs = [
      makeJob("a"),
      makeJob("b", { location: null }),
      makeJob("c"),
    ];
    render(<TransitMap jobs={jobs} selectedJobId={null} onSelect={noop} />);
    // Two plottable jobs -> two pins.
    expect(screen.getAllByTestId("company-pin")).toHaveLength(2);
  });

  it("renders a legend identifying BTS/MRT/BRT (Req 5.5)", () => {
    render(<TransitMap jobs={[makeJob("a")]} selectedJobId={null} onSelect={noop} />);
    expect(screen.getByTestId("map-legend")).toBeInTheDocument();
    expect(screen.getByText(resolveText(K.mapLegendBts, strings))).toBeInTheDocument();
    expect(screen.getByText(resolveText(K.mapLegendMrt, strings))).toBeInTheDocument();
    expect(screen.getByText(resolveText(K.mapLegendBrt, strings))).toBeInTheDocument();
  });

  it("overlays one polyline per transit line (Req 5.4)", () => {
    render(<TransitMap jobs={[makeJob("a")]} selectedJobId={null} onSelect={noop} />);
    expect(screen.getAllByTestId("polyline")).toHaveLength(
      SAMPLE_TRANSIT_LINES.length,
    );
  });

  it("shows an unplottable-count indicator with the count of jobs lacking a coordinate (Req 5.2)", () => {
    const jobs = [
      makeJob("a"),
      makeJob("b", { location: null }),
      makeJob("c", { location: null }),
    ];
    render(<TransitMap jobs={jobs} selectedJobId={null} onSelect={noop} />);
    const indicator = screen.getByTestId("map-unplottable");
    expect(indicator).toHaveAttribute("data-count", "2");
    expect(indicator.textContent).toContain("2");
    expect(indicator.textContent).toContain(
      resolveText(K.mapUnplottableCount, strings),
    );
  });

  it("does not show the unplottable indicator when every job is plottable", () => {
    render(
      <TransitMap
        jobs={[makeJob("a"), makeJob("b")]}
        selectedJobId={null}
        onSelect={noop}
      />,
    );
    expect(screen.queryByTestId("map-unplottable")).toBeNull();
  });

  it("shows a no-company-locations message when nothing is plottable (Req 5.3)", () => {
    render(
      <TransitMap
        jobs={[makeJob("a", { location: null })]}
        selectedJobId={null}
        onSelect={noop}
      />,
    );
    const message = screen.getByTestId("map-no-locations");
    expect(message).toBeInTheDocument();
    expect(message.textContent).toContain(resolveText(K.mapNoLocations, strings));
  });

  it("shows the no-locations message for an empty job list (Req 5.3)", () => {
    render(<TransitMap jobs={[]} selectedJobId={null} onSelect={noop} />);
    expect(screen.getByTestId("map-no-locations")).toBeInTheDocument();
    // The map itself still renders (Bangkok map present).
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("shows the job title + whole-minute commuting time in a pin popup (Req 5.6)", () => {
    render(
      <TransitMap
        jobs={[makeJob("a", { title: "Data Analyst", commutingMinutes: 45 })]}
        selectedJobId={null}
        onSelect={noop}
      />,
    );
    const pin = screen.getByTestId("company-pin");
    expect(within(pin).getByTestId("pin-title")).toHaveTextContent("Data Analyst");
    expect(within(pin).getByTestId("pin-commute")).toHaveTextContent(
      `45 ${resolveText(K.toleranceUnit, strings)}`,
    );
  });

  it("shows an unavailable indicator when commuting time is null (Req 5.7)", () => {
    render(
      <TransitMap
        jobs={[makeJob("a", { commutingMinutes: null })]}
        selectedJobId={null}
        onSelect={noop}
      />,
    );
    const pin = screen.getByTestId("company-pin");
    expect(within(pin).queryByTestId("pin-commute")).toBeNull();
    expect(
      within(pin).getByText(resolveText(K.commuteUnavailable, strings)),
    ).toBeInTheDocument();
  });

  it("highlights only the pin matching selectedJobId (Req 5.8/5.9)", () => {
    const jobs = [makeJob("a"), makeJob("b"), makeJob("c")];
    render(<TransitMap jobs={jobs} selectedJobId="b" onSelect={noop} />);
    const pins = screen.getAllByTestId("company-pin");
    const selected = pins.filter(
      (p) => p.getAttribute("data-selected") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute("data-job-id", "b");
  });

  it("calls onSelect with the job id when a pin is activated (Req 5.8)", () => {
    const onSelect = vi.fn();
    render(
      <TransitMap jobs={[makeJob("a")]} selectedJobId={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByTestId("company-pin"));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("disables one-finger pan below 768px (Req 14.6)", () => {
    setViewportWidth(500);
    render(<TransitMap jobs={[makeJob("a")]} selectedJobId={null} onSelect={noop} />);
    expect(screen.getByTestId("transit-map")).toHaveAttribute(
      "data-onefinger-pan",
      "disabled",
    );
  });

  it("enables one-finger pan at desktop widths (>=768px)", () => {
    setViewportWidth(1200);
    render(<TransitMap jobs={[makeJob("a")]} selectedJobId={null} onSelect={noop} />);
    expect(screen.getByTestId("transit-map")).toHaveAttribute(
      "data-onefinger-pan",
      "enabled",
    );
  });
});
