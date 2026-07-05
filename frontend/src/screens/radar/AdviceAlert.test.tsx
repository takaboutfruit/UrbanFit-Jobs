// Feature: urbanfit-jobs-frontend
// Tests for AdviceAlert (task 11.3): skill-gap message composition + warning
// styling (Req 11.1, 11.2), enabled CTA and navigation (Req 11.3, 11.4), and
// the no-gap confirmation shown in place of the gap message (Req 11.5).

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

import {
  AdviceAlert,
  composeSkillGapMessage,
  UPSKILL_COURSES_PATH,
} from "./AdviceAlert";
import { resolveText } from "../../domain";
import { strings, K } from "../../i18n";

const MARKET_LABEL = resolveText(K.radarLegendMarket, strings); // "ค่าเฉลี่ยตลาด"

/** Renders the current pathname so navigation can be asserted. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/radar"]}>
      <Routes>
        <Route path="/radar" element={<>{ui}<LocationProbe /></>} />
        <Route
          path={UPSKILL_COURSES_PATH}
          element={<><div>courses page</div><LocationProbe /></>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("composeSkillGapMessage", () => {
  it("names the dimension, benchmark, and rounded shortfall percentage", () => {
    const message = composeSkillGapMessage("Data Cleaning", 15, MARKET_LABEL);
    expect(message).toContain("Data Cleaning");
    expect(message).toContain(MARKET_LABEL);
    expect(message).toContain("15%");
    expect(message).toContain(resolveText(K.adviceGapPrefix, strings));
  });

  it("rounds a fractional shortfall to a whole number", () => {
    const message = composeSkillGapMessage("SQL", 14.6, MARKET_LABEL);
    expect(message).toContain("15%");
    expect(message).not.toContain("14.6");
  });
});

describe("AdviceAlert with a skill gap", () => {
  const candidate = { "Data Cleaning": 60, SQL: 80, Python: 90 };
  const benchmark = { "Data Cleaning": 75, SQL: 82, Python: 92 };

  it("shows a gap message naming dimension + benchmark + shortfall%", () => {
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    const message = screen.getByTestId("advice-gap-message");
    // Largest shortfall is Data Cleaning: 75 - 60 = 15.
    expect(message.textContent).toContain("Data Cleaning");
    expect(message.textContent).toContain(MARKET_LABEL);
    expect(message.textContent).toContain("15%");
  });

  it("renders the gap message in the warning amber treatment", () => {
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    expect(screen.getByTestId("advice-gap-message").className).toContain(
      "text-warning",
    );
  });

  it("renders an enabled, selectable find-courses CTA", () => {
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    const cta = screen.getByTestId("advice-find-courses");
    expect(cta).toBeEnabled();
    expect(cta.textContent).toContain(resolveText(K.adviceFindCourse, strings));
  });

  it("invokes onFindCourses when the CTA is selected", async () => {
    const user = userEvent.setup();
    const onFindCourses = vi.fn();
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
        onFindCourses={onFindCourses}
      />,
    );
    await user.click(screen.getByTestId("advice-find-courses"));
    expect(onFindCourses).toHaveBeenCalledTimes(1);
  });

  it("navigates to the courses destination when no callback is provided", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    expect(screen.getByTestId("location").textContent).toBe("/radar");
    await user.click(screen.getByTestId("advice-find-courses"));
    expect(screen.getByTestId("location").textContent).toBe(
      UPSKILL_COURSES_PATH,
    );
  });

  it("does not render the no-gap confirmation when a gap exists", () => {
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    expect(screen.queryByTestId("advice-no-gap")).toBeNull();
  });
});

describe("AdviceAlert with no skill gap", () => {
  // Candidate meets or exceeds the benchmark on every dimension.
  const candidate = { "Data Cleaning": 80, SQL: 85, Python: 95 };
  const benchmark = { "Data Cleaning": 75, SQL: 82, Python: 92 };

  it("shows the no-gap confirmation in place of the skill-gap message", () => {
    renderWithRouter(
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={MARKET_LABEL}
      />,
    );
    expect(screen.getByTestId("advice-no-gap").textContent).toContain(
      resolveText(K.adviceNoGap, strings),
    );
    expect(screen.queryByTestId("advice-gap-message")).toBeNull();
    expect(screen.queryByTestId("advice-find-courses")).toBeNull();
  });
});
