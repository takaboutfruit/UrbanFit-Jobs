// Feature: urbanfit-jobs-frontend
// Component tests for HRDashboardScreen (Req 12.1–12.5, 14.3).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HRDashboardScreen } from "./HRDashboardScreen";
import type { CandidateSummary, HRShortlist } from "../../domain";
import { strings, K } from "../../i18n";

const emptyText = strings[K.hrEmpty].th;

function makeCandidate(overrides: Partial<CandidateSummary> = {}): CandidateSummary {
  return {
    id: "c",
    name: "ผู้สมัคร",
    urbanFitScore: 80,
    skillMatch: 80,
    commutingFeasibility: 80,
    aiSummary: "สรุปโดย AI",
    ...overrides,
  };
}

function makeShortlist(candidates: CandidateSummary[], targetRole = "Data Analyst"): HRShortlist {
  return { targetRole, candidates };
}

describe("HRDashboardScreen", () => {
  it("renders a header title including the candidate count and the target role", () => {
    const shortlist = makeShortlist([
      makeCandidate({ id: "a", urbanFitScore: 90 }),
      makeCandidate({ id: "b", urbanFitScore: 80 }),
      makeCandidate({ id: "c", urbanFitScore: 70 }),
    ]);
    render(<HRDashboardScreen shortlist={shortlist} />);

    const title = screen.getByTestId("hr-title");
    // Count (3) and target role are both part of the title (Req 12.1).
    expect(title).toHaveTextContent("3");
    expect(title).toHaveTextContent("Data Analyst");
  });

  it("renders NO search, filter, or sort controls", () => {
    const shortlist = makeShortlist([
      makeCandidate({ id: "a", urbanFitScore: 90 }),
      makeCandidate({ id: "b", urbanFitScore: 80 }),
    ]);
    render(<HRDashboardScreen shortlist={shortlist} />);

    // Zero-filter dashboard (Req 12.2): no text/search inputs and no
    // sort/filter dropdowns anywhere on the screen.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("searchbox")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("renders exactly one card per candidate and the count equals the title count", () => {
    const shortlist = makeShortlist([
      makeCandidate({ id: "a", urbanFitScore: 90 }),
      makeCandidate({ id: "b", urbanFitScore: 80 }),
      makeCandidate({ id: "c", urbanFitScore: 70 }),
      makeCandidate({ id: "d", urbanFitScore: 60 }),
    ]);
    render(<HRDashboardScreen shortlist={shortlist} />);

    const cards = screen.getAllByTestId("candidate-card");
    expect(cards).toHaveLength(shortlist.candidates.length);
    // Title count matches the number of rendered cards (Req 12.3 / Property 14).
    expect(screen.getByTestId("hr-title")).toHaveTextContent(String(cards.length));
  });

  it("orders candidate cards by Urban-Fit Score descending (null last)", () => {
    const shortlist = makeShortlist([
      makeCandidate({ id: "low", name: "Low", urbanFitScore: 55 }),
      makeCandidate({ id: "none", name: "NoScore", urbanFitScore: null }),
      makeCandidate({ id: "high", name: "High", urbanFitScore: 98 }),
      makeCandidate({ id: "mid", name: "Mid", urbanFitScore: 77 }),
    ]);
    render(<HRDashboardScreen shortlist={shortlist} />);

    // Overall score cells render in non-increasing order; the null-score card
    // (rendered as a placeholder) sorts to the end (Req 12.4 / Property 15).
    const overalls = screen.getAllByTestId("overall-score").map((el) => el.textContent);
    expect(overalls[0]).toContain("98%");
    expect(overalls[1]).toContain("77%");
    expect(overalls[2]).toContain("55%");
    // Last card is the unavailable-score candidate (no percent).
    expect(overalls[3]).not.toContain("%");
  });

  it("shows the empty-state message when the shortlist has no candidates", () => {
    render(<HRDashboardScreen shortlist={makeShortlist([])} />);

    expect(screen.getByText(emptyText)).toBeInTheDocument();
    expect(screen.queryAllByTestId("candidate-card")).toHaveLength(0);
    // Title still reflects a count of zero (Req 12.1).
    expect(screen.getByTestId("hr-title")).toHaveTextContent("0");
  });

  it("renders one card per row on mobile via a single-column grid base class (Req 14.3)", () => {
    render(
      <HRDashboardScreen
        shortlist={makeShortlist([makeCandidate({ id: "a" }), makeCandidate({ id: "b" })])}
      />,
    );
    const grid = screen.getByTestId("candidate-grid");
    // Base (mobile) layout is a single column; wider grids apply only at >=768px.
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid.className).toMatch(/md:grid-cols-/);
  });

  it("renders default sample content when no shortlist prop is provided", () => {
    render(<HRDashboardScreen />);
    // The routed screen (no props) shows a real, non-empty shortlist.
    expect(screen.getAllByTestId("candidate-card").length).toBeGreaterThan(0);
    expect(screen.getByTestId("hr-title")).toHaveTextContent("Data Analyst");
  });
});
