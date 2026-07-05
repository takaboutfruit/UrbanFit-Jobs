// Feature: urbanfit-ui-fixes (bugfix)
// Bug condition exploration tests for the global shell (task 1).
//
// Encodes isBugCondition(X) clauses 1.1 and 1.2 from design.md/bugfix.md:
//   1.1  X.sidebarPinned = false        -> desktop <nav> lacks sticky/h-screen classes
//   1.2  X.povWidgetPresent = false     -> no floating Candidate/HR POV toggle exists
//
// CRITICAL: These tests are EXPECTED TO FAIL on the current unfixed code.
// A failure here is the SUCCESS signal for task 1 — it proves defects 1.1 and
// 1.2 exist. Do NOT modify AppShell.tsx to make these pass at this stage.
//
// **Validates: Requirements 1.1, 1.2** (Bug Condition — Property 1, design.md)

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

function renderShell(path = "/jobs") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Bug condition 1.1 — desktop sidebar is not pinned to the viewport", () => {
  it("EXPECTED FAIL on unfixed code: desktop <nav> carries sticky/full-height positioning classes", () => {
    renderShell();
    const sideNav = screen.getByRole("navigation", { name: "Primary" });

    // Corrected behavior (Req 2.1): the nav should stay pinned while <main>
    // scrolls, via sticky positioning + full viewport height.
    expect(sideNav.className).toContain("md:sticky");
    expect(sideNav.className).toContain("md:top-0");
    expect(sideNav.className).toContain("md:h-screen");
  });
});

describe("Bug condition 1.2 — no floating Candidate/HR POV widget exists", () => {
  it("EXPECTED FAIL on unfixed code: a bottom-right POV toggle with Thai labels exists", () => {
    renderShell();

    // Corrected behavior (Req 2.2): a floating widget fixed to the
    // bottom-right that switches "มุมมองผู้สมัคร" <-> "มุมมอง HR".
    const toggle = screen.queryByTestId("pov-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.queryByText("มุมมองผู้สมัคร")).toBeInTheDocument();
    expect(screen.queryByText("มุมมอง HR")).toBeInTheDocument();
  });
});
