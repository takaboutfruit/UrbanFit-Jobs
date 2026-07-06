// Feature: urbanfit-ui-fixes (bugfix)
// Bug condition exploration tests for the Radar screen layout (task 1).
//
// Encodes isBugCondition(X) clauses 1.5 and 1.6 from design.md/bugfix.md:
//   1.5  X.screen = "radar" AND X.radarLayout = "single-column"
//        -> RadarScreen stacks chart + advice into one column instead of a
//           two-column desktop layout (chart left, advice right)
//   1.6  X.screen = "radar" AND X.radarFillsColumn = false
//        -> the chart canvas is capped small (max-w-md) instead of filling
//           its column
//
// CRITICAL: These tests are EXPECTED TO FAIL on the current unfixed code.
// A failure here is the SUCCESS signal for task 1 — it proves defects 1.5 and
// 1.6 exist. Do NOT modify RadarScreen.tsx/RadarChart.tsx to make these pass
// at this stage.
//
// **Validates: Requirements 1.5, 1.6** (Bug Condition — Property 1, design.md)

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
  return render(
    <MemoryRouter initialEntries={["/radar"]}>
      <RadarScreen />
    </MemoryRouter>,
  );
}

describe("Bug condition 1.5 — Radar screen is a single stacked column, not two-column", () => {
  it("EXPECTED FAIL on unfixed code: desktop layout is two-column (chart left, advice right)", () => {
    renderScreen();
    const section = screen.getByTestId("radar-screen");
    const column = section.firstElementChild as HTMLElement;

    // Corrected behavior (Req 2.5): a responsive two-column layout at `md:`
    // (grid or row flex), not the current centered `max-w-3xl flex-col`
    // single column.
    expect(column.className).not.toContain("max-w-3xl");
    const usesTwoColumn =
      column.className.includes("md:grid") ||
      column.className.includes("md:flex-row");
    expect(usesTwoColumn).toBe(true);
  });
});

describe("Bug condition 1.6 — Radar chart is capped small instead of filling its column", () => {
  it("EXPECTED FAIL on unfixed code: the chart canvas wrapper has no max-w-md cap", () => {
    renderScreen();
    const chart = screen.getByTestId("radar-chart");
    const canvasWrapper = chart.querySelector(
      '[data-testid="radar-canvas"]',
    )?.parentElement as HTMLElement;

    // Corrected behavior (Req 2.6): the canvas wrapper should NOT be capped
    // at max-w-md so it can grow to fill the left column.
    expect(canvasWrapper.className).not.toContain("max-w-md");
  });
});
