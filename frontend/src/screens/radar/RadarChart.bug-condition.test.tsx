// Feature: urbanfit-ui-fixes (bugfix)
// Bug condition exploration tests for the RadarChart config/rendering (task 1).
//
// Encodes isBugCondition(X) clauses 1.7, 1.8, 1.9, and 1.10 from
// design.md/bugfix.md:
//   1.7   X.radarAxisCount <> 6      -> buildRadarChartConfig(defaultData)
//                                        only returns 4 labels
//   1.8   X.axisLabelReadable = false -> Chart.js pointLabels color/size
//                                        options are absent
//   1.9   X.scaleLabelReadable = false -> Chart.js ticks backdrop options
//                                        are absent
//   1.10  X.legendCount > 1          -> both the Chart.js top legend AND the
//                                        DOM <ul data-testid="radar-legend">
//                                        are rendered simultaneously
//
// CRITICAL: These tests are EXPECTED TO FAIL on the current unfixed code.
// A failure here is the SUCCESS signal for task 1 — it proves defects
// 1.7-1.10 exist. Do NOT modify RadarChart.tsx to make these pass at this
// stage.
//
// **Validates: Requirements 1.7, 1.8, 1.9, 1.10** (Bug Condition — Property 1, design.md)

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom lacks a canvas 2D context; stub getContext to a truthy fake so the
// component's Chart construction path runs and we can inspect the config
// passed to the (mocked) Chart constructor.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
});

// Capture the config object passed into `new Chart(canvas, config)` so we can
// inspect `options.scales.r.pointLabels` / `options.scales.r.ticks` without a
// real canvas.
let lastChartConfig: any = null;

vi.mock("chart.js", () => {
  class Chart {
    static register = vi.fn();
    destroy = vi.fn();
    constructor(_canvas: unknown, config: unknown) {
      lastChartConfig = config;
    }
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

import { RadarChart, buildRadarChartConfig } from "./RadarChart";
import type { RadarData } from "../../domain";

const defaultData: RadarData = {
  dimensions: [
    "Data Cleaning",
    "SQL",
    "Python",
    "Visualization",
    "Statistics",
    "Business Logic",
  ],
  candidate: {
    values: {
      "Data Cleaning": 60,
      SQL: 85,
      Python: 88,
      Visualization: 72,
      Statistics: 74,
      "Business Logic": 80,
    },
  },
  requirement: {
    values: {
      "Data Cleaning": 65,
      SQL: 70,
      Python: 75,
      Visualization: 70,
      Statistics: 65,
      "Business Logic": 70,
    },
  },
  market: {
    values: {
      "Data Cleaning": 78,
      SQL: 80,
      Python: 82,
      Visualization: 76,
      Statistics: 72,
      "Business Logic": 75,
    },
  },
};

describe("Bug condition 1.7 — radar chart draws only 4 axes, not 6", () => {
  it("EXPECTED FAIL on unfixed code: buildRadarChartConfig(defaultData) returns 6 labels including Statistics and Business Logic", () => {
    const config = buildRadarChartConfig(defaultData);

    // Corrected behavior (Req 2.7): a six-axis hexagon.
    expect(config.labels).toHaveLength(6);
    expect(config.labels).toContain("Statistics");
    expect(config.labels).toContain("Business Logic");
  });
});

describe("Bug condition 1.8/1.9 — axis label and scale-number readability options are absent", () => {
  it("EXPECTED FAIL on unfixed code: Chart.js options include pointLabels color/size and ticks backdrop settings", () => {
    lastChartConfig = null;
    render(<RadarChart data={defaultData} />);

    const rScale = lastChartConfig?.options?.scales?.r;

    // Corrected behavior (Req 2.8): larger, light-gray/white pointLabels for
    // contrast on the dark background.
    expect(rScale?.pointLabels?.color).toBeTruthy();
    expect(rScale?.pointLabels?.font?.size).toBeTruthy();

    // Corrected behavior (Req 2.9): scale numbers wrapped in semi-transparent
    // dark pills via tick backdrop settings.
    expect(rScale?.ticks?.showLabelBackdrop).toBe(true);
    expect(rScale?.ticks?.backdropColor).toBeTruthy();
  });
});

describe("Bug condition 1.10 — duplicate legend (Chart.js top legend AND DOM <ul>)", () => {
  it("EXPECTED FAIL on unfixed code: exactly one legend region is rendered", () => {
    lastChartConfig = null;
    render(<RadarChart data={defaultData} />);

    const chartJsLegendEnabled =
      lastChartConfig?.options?.plugins?.legend?.display === true;
    const domLegend = screen.queryByTestId("radar-legend");

    // Corrected behavior (Req 2.10): exactly one legend region — the Chart.js
    // top legend only; the duplicate DOM <ul> legend is removed.
    const legendCount = (chartJsLegendEnabled ? 1 : 0) + (domLegend ? 1 : 0);
    expect(legendCount).toBe(1);
  });
});
