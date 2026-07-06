// Feature: urbanfit-jobs-frontend
// Tests for RadarScreen composition:
//   - The RadarChart renders inside the Skill DNA card.
//   - The dashboard header, grid, and cards render.
//   - The layout container uses classes ensuring vertical-only scrolling / no
//     horizontal overflow.
//
// Chart.js is mocked so RadarChart's useEffect never touches a real canvas
// under jsdom.

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom lacks a canvas 2D context; stub getContext to a truthy fake. Chart.js
// is mocked below, so no real canvas operations run.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
});

vi.mock("chart.js", () => {
  class Chart {
    static register = vi.fn();
    destroy = vi.fn();
    constructor() {}
  }
  return {
    Chart,
    RadarController: {},
    RadialLinearScale: {},
    PointElement: {},
    LineElement: {},
    Filler: {},
    Tooltip: {},
    Legend: {},
  };
});

import { RadarScreen } from "./RadarScreen";

function renderScreen() {
  return render(<RadarScreen />);
}

describe("RadarScreen composition", () => {
  it("renders the RadarChart inside the Skill DNA card", () => {
    renderScreen();
    expect(screen.getByTestId("skill-dna-card")).toBeInTheDocument();
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  it("renders the candidate dashboard header and the 2-column grid cards", () => {
    renderScreen();
    expect(screen.getByTestId("candidate-header")).toBeInTheDocument();
    expect(screen.getByTestId("radar-dashboard-grid")).toBeInTheDocument();
    expect(screen.getByTestId("technical-skills-card")).toBeInTheDocument();
    expect(screen.getByTestId("upskill-priority-card")).toBeInTheDocument();
    expect(screen.getByTestId("raw-metrics-card")).toBeInTheDocument();
  });

  it("uses a vertical-only, no-horizontal-overflow layout", () => {
    renderScreen();
    const section = screen.getByTestId("radar-screen");
    // No horizontal scrollbar produced.
    expect(section.className).toContain("overflow-x-hidden");
    // Single vertically stacked column.
    expect(section.className).toContain("flex-col");
  });

  it("centers the content in a constrained max-width layout with a 2-column grid on desktop", () => {
    renderScreen();
    const section = screen.getByTestId("radar-screen");
    const column = section.firstElementChild as HTMLElement;
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("max-w-6xl");
    const grid = screen.getByTestId("radar-dashboard-grid");
    expect(grid.className).toContain("md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]");
  });
});
