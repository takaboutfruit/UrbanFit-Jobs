// Feature: urbanfit-jobs-frontend
// Tests for RadarChart (task 11.1): the pure config helper and the rendered
// component's DOM legend + omitted-series message.
//
// Chart.js is mocked so the component's useEffect never touches a real canvas
// under jsdom. The pure `buildRadarChartConfig` needs no mocking.

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// jsdom does not implement canvas 2D contexts. Stub getContext to return a
// truthy fake so the component's guard proceeds to the (mocked) Chart and
// jsdom's "Not implemented" warning is suppressed. Chart.js itself is mocked
// below, so no real canvas operations run.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
});

// Mock Chart.js: a no-op Chart class + registerable component tokens so the
// module import and Chart.register(...) call succeed without a canvas.
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

import {
  RadarChart,
  buildRadarChartConfig,
  RADAR_SERIES_COLORS,
} from "./RadarChart";
import { clampPercent } from "../../domain";
import type { RadarData, RadarSeries } from "../../domain";
import { strings, K } from "../../i18n";
import { resolveText } from "../../domain";

function series(values: Record<string, number>): RadarSeries {
  return { values };
}

const DIMENSIONS = ["Data Cleaning", "SQL", "Python"];

function fullData(): RadarData {
  return {
    dimensions: [...DIMENSIONS],
    candidate: series({ "Data Cleaning": 70, SQL: 80, Python: 90 }),
    requirement: series({ "Data Cleaning": 60, SQL: 65, Python: 70 }),
    market: series({ "Data Cleaning": 75, SQL: 78, Python: 82 }),
  };
}

describe("buildRadarChartConfig", () => {
  it("keeps at least 3 axis labels from data.dimensions", () => {
    const config = buildRadarChartConfig(fullData());
    expect(config.labels).toEqual(DIMENSIONS);
    expect(config.labels.length).toBeGreaterThanOrEqual(3);
  });

  it("scales every axis 0-100", () => {
    const config = buildRadarChartConfig(fullData());
    expect(config.scale).toEqual({ min: 0, max: 100 });
  });

  it("plots one clamped value per dimension for each available series", () => {
    const config = buildRadarChartConfig(fullData());
    expect(config.datasets).toHaveLength(3);
    for (const dataset of config.datasets) {
      expect(dataset.data).toHaveLength(DIMENSIONS.length);
    }
    const candidate = config.datasets.find((d) => d.key === "candidate");
    expect(candidate?.data).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range values into 0..100", () => {
    const data: RadarData = {
      dimensions: [...DIMENSIONS],
      candidate: series({ "Data Cleaning": -20, SQL: 150, Python: 55.6 }),
      requirement: null,
      market: null,
    };
    const config = buildRadarChartConfig(data);
    const candidate = config.datasets.find((d) => d.key === "candidate");
    expect(candidate?.data).toEqual([
      clampPercent(-20), // 0
      clampPercent(150), // 100
      clampPercent(55.6), // 56
    ]);
    expect(candidate?.data).toEqual([0, 100, 56]);
  });

  it("treats a missing dimension value as 0", () => {
    const data: RadarData = {
      dimensions: [...DIMENSIONS],
      candidate: series({ "Data Cleaning": 40 }), // SQL & Python missing
      requirement: null,
      market: null,
    };
    const config = buildRadarChartConfig(data);
    const candidate = config.datasets.find((d) => d.key === "candidate");
    expect(candidate?.data).toEqual([40, 0, 0]);
  });

  it("omits null series and reports which were omitted", () => {
    const data: RadarData = {
      dimensions: [...DIMENSIONS],
      candidate: series({ "Data Cleaning": 70, SQL: 80, Python: 90 }),
      requirement: null,
      market: null,
    };
    const config = buildRadarChartConfig(data);
    expect(config.datasets.map((d) => d.key)).toEqual(["candidate"]);
    expect(config.omitted).toEqual(["requirement", "market"]);
  });

  it("uses the correct per-series colors and a dashed requirement line", () => {
    const config = buildRadarChartConfig(fullData());
    const byKey = Object.fromEntries(config.datasets.map((d) => [d.key, d]));
    expect(byKey.candidate.borderColor).toBe(RADAR_SERIES_COLORS.candidate);
    expect(byKey.requirement.borderColor).toBe(RADAR_SERIES_COLORS.requirement);
    expect(byKey.market.borderColor).toBe(RADAR_SERIES_COLORS.market);
    expect(byKey.requirement.borderDash).toEqual([4, 4]);
    expect(byKey.candidate.borderDash).toBeUndefined();
  });
});

describe("RadarChart component", () => {
  it("does not render a duplicate DOM legend (the Chart.js top legend is the only legend)", () => {
    render(<RadarChart data={fullData()} />);
    expect(screen.queryByTestId("radar-legend")).toBeNull();
  });

  it("does not render an omitted-series message when all series are present", () => {
    render(<RadarChart data={fullData()} />);
    expect(screen.queryByTestId("radar-omitted-message")).toBeNull();
  });

  it("renders an omitted-series message naming the omitted series", () => {
    const data: RadarData = {
      dimensions: [...DIMENSIONS],
      candidate: series({ "Data Cleaning": 70, SQL: 80, Python: 90 }),
      requirement: null,
      market: null,
    };
    render(<RadarChart data={data} />);
    const message = screen.getByTestId("radar-omitted-message");
    expect(message).toBeInTheDocument();
    expect(message.textContent).toContain(
      resolveText(K.radarSeriesOmitted, strings),
    );
    expect(message.textContent).toContain(
      resolveText(K.radarLegendRequirement, strings),
    );
    expect(message.textContent).toContain(
      resolveText(K.radarLegendMarket, strings),
    );
  });
});
