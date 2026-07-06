// Feature: urbanfit-jobs-frontend
// Component tests for JobDiscoveryScreen composition + selection state
// (task 7.5). Example-based coverage of: header + job list rendering, the
// ordered (score desc) + tolerance-filtered visible list (Req 4.1 / 6.5),
// single-selection highlight (Req 4.8), the lg: split vs mobile stacked layout
// (Req 3.1 / 3.2 / 14.1), and the (temporary) map-region placeholder.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// This screen now renders <TransitMap>, which uses react-leaflet. Real Leaflet
// cannot initialize inside jsdom (it needs a sized map container/renderer), so
// we mock react-leaflet with lightweight stand-ins that render their children.
// This keeps the screen composition/selection tests focused on the list while
// the map's own behavior is covered in discovery/TransitMap.test.tsx.
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

import { JobDiscoveryScreen } from "./JobDiscoveryScreen";
import type { Job } from "../domain";
import { strings, K } from "../i18n";

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
    location: null,
    ...overrides,
  };
}

/** Deliberately unordered so we can prove the screen orders it. */
const testJobs: Job[] = [
  makeJob("b", { urbanFitScore: 80, commutingMinutes: 55 }),
  makeJob("a", { urbanFitScore: 90, commutingMinutes: 20 }),
  makeJob("c", { urbanFitScore: 70, commutingMinutes: 40 }),
];

function renderedTitles(): string[] {
  return screen
    .getAllByTestId("job-card")
    .map((card) => within(card).getByTestId("job-title").textContent ?? "");
}

describe("JobDiscoveryScreen", () => {
  it("renders the discovery header (title + controls) and the job list", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);

    // Header title (Req 3.4).
    expect(screen.getByText(strings[K.discoveryTitle].th)).toBeInTheDocument();
    // Header controls (Req 3.3): residence textbox + tolerance slider.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    // The job list itself is present.
    expect(screen.getByTestId("job-list")).toBeInTheDocument();
  });

  it("orders the visible list by urbanFitScore descending (Req 4.1)", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);
    // Default tolerance (60) keeps all three; order is a(90) > b(80) > c(70).
    expect(renderedTitles()).toEqual(["Title a", "Title b", "Title c"]);
  });

  it("breaks urbanFitScore ties by company name A→Z (Req 4.2)", () => {
    const tied: Job[] = [
      makeJob("z", { company: "Zebra", urbanFitScore: 88 }),
      makeJob("m", { company: "Alpha", urbanFitScore: 88 }),
    ];
    render(<JobDiscoveryScreen jobs={tied} />);
    // Equal scores -> Alpha before Zebra.
    expect(renderedTitles()).toEqual(["Title m", "Title z"]);
  });

  it("re-filters the list when the tolerance slider changes (Req 6.4 / 6.5)", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);
    // Start: all three visible at the default 60-minute tolerance.
    expect(renderedTitles()).toEqual(["Title a", "Title b", "Title c"]);

    // Lower the tolerance to 45 minutes: b (55 min) is removed, a (20) and
    // c (40) remain and keep their descending-score order.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "45" } });
    expect(renderedTitles()).toEqual(["Title a", "Title c"]);

    // The slider display reflects the new value (Req 6.3 / 6.4).
    expect(screen.getByTestId("tolerance-display")).toHaveTextContent("45");
  });

  it("shows the empty-state message when the tolerance filters out everything (Req 4.9)", () => {
    render(<JobDiscoveryScreen jobs={testJobs} initialToleranceMinutes={15} />);
    // Minimum tolerance (15) excludes every test job (min commute is 20).
    expect(screen.queryByTestId("job-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("jobs-empty")).toBeInTheDocument();
  });

  it("keeps at most one job card selected at a time (Req 4.8)", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);
    const selectedCount = () =>
      screen
        .getAllByTestId("job-card")
        .filter((c) => c.getAttribute("data-selected") === "true").length;

    // Nothing selected initially.
    expect(selectedCount()).toBe(0);

    // Select the first card -> exactly one selected.
    fireEvent.click(screen.getAllByTestId("job-card")[0]);
    expect(selectedCount()).toBe(1);
    expect(
      within(screen.getAllByTestId("job-card")[0]).getByTestId("job-title"),
    ).toHaveTextContent("Title a");

    // Select another card -> still exactly one selected (highlight moves).
    fireEvent.click(screen.getAllByTestId("job-card")[2]);
    expect(selectedCount()).toBe(1);
    expect(
      within(screen.getAllByTestId("job-card")[2]).getByTestId("job-title"),
    ).toHaveTextContent("Title c");
  });

  it("uses a stacked single column on mobile that splits at the lg: breakpoint (Req 3.1 / 3.2 / 14.1)", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);
    const body = screen.getByTestId("discovery-body");
    // Base (mobile): single stacked column.
    expect(body).toHaveClass("grid-cols-1");
    // >=1024px: two-region split (JobList left + map right).
    expect(body.className).toMatch(/lg:grid-cols-2/);
    // Both regions exist in the split.
    expect(screen.getByTestId("job-list-region")).toBeInTheDocument();
    expect(screen.getByTestId("map-region")).toBeInTheDocument();
  });

  it("renders a map-region placeholder for task 7.7 to replace", () => {
    render(<JobDiscoveryScreen jobs={testJobs} />);
    // Light assertion — the real TransitMap arrives in 7.7.
    expect(screen.getByTestId("map-region")).toBeInTheDocument();
  });

  it("renders default sample content when no jobs prop is provided", () => {
    render(<JobDiscoveryScreen />);
    // Routed screen (no props) shows real, non-empty content.
    expect(screen.getAllByTestId("job-card").length).toBeGreaterThan(0);
    // Every sample card shares the pre-selected "Data Analyst" role.
    for (const title of renderedTitles()) {
      expect(title).toBe("Data Analyst");
    }
  });
});
