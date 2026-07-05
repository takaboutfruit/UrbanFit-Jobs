// Feature: urbanfit-jobs-frontend
// Tests for RadarScreen composition (task 11.4):
//   - The RadarChart renders as the central element.
//   - The screen title and subtitle render.
//   - The AdviceAlert renders BELOW the chart (asserted by DOM order).
//   - The layout container uses classes ensuring vertical-only scrolling / no
//     horizontal overflow (overflow-x-hidden + centered max-width column) and a
//     single-column stack (flex-col).
//
// Chart.js is mocked so RadarChart's useEffect never touches a real canvas
// under jsdom. AdviceAlert calls useNavigate at render, so the screen is
// wrapped in a MemoryRouter.

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
import type { RadarData } from "../../domain";
import { resolveText } from "../../domain";
import { strings, K } from "../../i18n";

function renderScreen(data?: RadarData) {
  return render(
    <MemoryRouter initialEntries={["/radar"]}>
      <RadarScreen data={data} onFindCourses={() => {}} />
    </MemoryRouter>,
  );
}

describe("RadarScreen composition", () => {
  it("renders the RadarChart as the central element", () => {
    renderScreen();
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  it("renders the screen title and subtitle", () => {
    renderScreen();
    expect(
      screen.getByText(resolveText(K.radarTitle, strings)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(resolveText(K.radarSubtitle, strings)),
    ).toBeInTheDocument();
  });

  it("renders the AdviceAlert below the RadarChart", () => {
    renderScreen();
    const chart = screen.getByTestId("radar-chart");
    const advice = screen.getByTestId("advice-alert");
    expect(advice).toBeInTheDocument();
    // DOCUMENT_POSITION_FOLLOWING (4) => advice comes after the chart in the DOM.
    expect(
      chart.compareDocumentPosition(advice) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("derives the AdviceAlert gap from candidate vs market (Data Cleaning 18%)", () => {
    renderScreen();
    // Sample: candidate Data Cleaning 60 vs market 78 => largest shortfall 18%.
    const message = screen.getByTestId("advice-gap-message");
    expect(message.textContent).toContain("Data Cleaning");
    expect(message.textContent).toContain(
      resolveText(K.radarLegendMarket, strings),
    );
    expect(message.textContent).toContain("18%");
  });

  it("uses a vertical-only, no-horizontal-overflow layout", () => {
    renderScreen();
    const section = screen.getByTestId("radar-screen");
    // No horizontal scrollbar produced (Req 14.4).
    expect(section.className).toContain("overflow-x-hidden");
    // Single vertically stacked column (Req 14.5).
    expect(section.className).toContain("flex-col");
  });

  it("centers the content in a constrained max-width, two-column-on-desktop layout", () => {
    renderScreen();
    const section = screen.getByTestId("radar-screen");
    const column = section.firstElementChild as HTMLElement;
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("max-w-6xl");
    expect(column.className).toContain("md:grid");
  });

  it("shows the no-gap confirmation when the candidate meets the market benchmark", () => {
    const data: RadarData = {
      dimensions: ["Data Cleaning", "SQL", "Python"],
      candidate: { values: { "Data Cleaning": 90, SQL: 90, Python: 90 } },
      requirement: { values: { "Data Cleaning": 60, SQL: 60, Python: 60 } },
      market: { values: { "Data Cleaning": 80, SQL: 80, Python: 80 } },
    };
    renderScreen(data);
    expect(screen.getByTestId("advice-no-gap")).toBeInTheDocument();
    expect(screen.queryByTestId("advice-gap-message")).toBeNull();
  });
});
