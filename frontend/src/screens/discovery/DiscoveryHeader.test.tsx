// Feature: urbanfit-jobs-frontend
// Component tests for DiscoveryHeader (task 7.1). Verifies title + subtitle
// (Req 3.4) and that BOTH controls are present (Req 3.3), plus wiring.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiscoveryHeader } from "./DiscoveryHeader";
import { strings, K } from "../../i18n";

const UNIT = strings[K.toleranceUnit].th;

function renderHeader(overrides: Partial<Parameters<typeof DiscoveryHeader>[0]> = {}) {
  const props = {
    recommendedRole: "Data Analyst",
    toleranceMinutes: 30,
    onToleranceChange: vi.fn(),
    ...overrides,
  };
  render(<DiscoveryHeader {...props} />);
  return props;
}

describe("DiscoveryHeader", () => {
  it("renders the pre-selected role context header", () => {
    renderHeader({ recommendedRole: "Data Analyst" });
    expect(screen.getByTestId("discovery-role-title")).toHaveTextContent("Data Analyst");
  });

  it("renders the residence-based subtitle", () => {
    renderHeader();
    expect(screen.getByText(strings[K.discoveryResidenceContext].th)).toBeInTheDocument();
  });

  it("contains only the tolerance slider as an interactive control", () => {
    renderHeader({ toleranceMinutes: 45 });
    // ToleranceSlider renders a slider showing "{value} นาที".
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByTestId("tolerance-display")).toHaveTextContent(`45 ${UNIT}`);
    // No search/residence input is rendered.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("forwards tolerance changes through onToleranceChange", () => {
    const { onToleranceChange } = renderHeader();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    expect(onToleranceChange).toHaveBeenCalledWith(75);
  });
});
