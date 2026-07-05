// Feature: urbanfit-jobs-frontend
// Component tests for the app shell navigation (Req 2.1, 2.2, 2.3, 2.6).
//
// These cover the Property 16 basics (exactly one active nav entry per nav)
// via example routes; the full property test is optional task 5.2.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { strings } from "../i18n";
import { K } from "../i18n";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

const candidateLabels = [
  strings[K.navJobs].th,
  strings[K.navAssessment].th,
  strings[K.navRadar].th,
] as string[];

const hrLabel = strings[K.navHr].th;

describe("AppShell navigation", () => {
  it("displays the 'UrbanFit Jobs' product name in the nav chrome", () => {
    renderAt("/jobs");
    expect(
      screen.getByRole("heading", { name: "UrbanFit Jobs" })
    ).toBeInTheDocument();
  });

  it("renders only the candidate destinations in the side nav by default (Candidate POV)", () => {
    renderAt("/jobs");
    const sideNav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of candidateLabels) {
      expect(within(sideNav).getByText(label)).toBeInTheDocument();
    }
    expect(within(sideNav).queryByText(hrLabel)).not.toBeInTheDocument();
  });

  it("renders only the candidate destinations in the mobile bottom nav by default (Candidate POV)", () => {
    renderAt("/jobs");
    const bottomNav = screen.getByRole("navigation", { name: "Primary mobile" });
    for (const label of candidateLabels) {
      expect(within(bottomNav).getByText(label)).toBeInTheDocument();
    }
    expect(within(bottomNav).queryByText(hrLabel)).not.toBeInTheDocument();
  });

  it("switches the nav to show only the HR destination when the POV toggle is set to HR", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    renderAt("/jobs");
    await user.click(screen.getByTestId("pov-toggle-hr"));

    const sideNav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(sideNav).getByText(hrLabel)).toBeInTheDocument();
    for (const label of candidateLabels) {
      expect(within(sideNav).queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("marks exactly one side-nav entry active for the current route", () => {
    renderAt("/jobs");
    const sideNav = screen.getByRole("navigation", { name: "Primary" });
    const active = within(sideNav)
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute("href", "/jobs");
  });

  it("moves the active style to exactly one entry when the route changes (Candidate POV)", () => {
    for (const { path, href } of [
      { path: "/jobs", href: "/jobs" },
      { path: "/assessment", href: "/assessment" },
      { path: "/radar", href: "/radar" },
    ]) {
      const { unmount } = renderAt(path);
      const sideNav = screen.getByRole("navigation", { name: "Primary" });
      const activeLinks = within(sideNav)
        .getAllByRole("link")
        .filter((el) => el.getAttribute("aria-current") === "page");

      expect(activeLinks).toHaveLength(1);
      expect(activeLinks[0]).toHaveAttribute("href", href);
      // The active entry carries the distinct primary treatment.
      expect(activeLinks[0].className).toContain("bg-primary-container");
      unmount();
    }
  });

  it("shows the HR destination as active when in HR POV on /hr", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    renderAt("/hr");
    await user.click(screen.getByTestId("pov-toggle-hr"));

    const sideNav = screen.getByRole("navigation", { name: "Primary" });
    const activeLinks = within(sideNav)
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]).toHaveAttribute("href", "/hr");
  });

  it("redirects the index route to /jobs", () => {
    renderAt("/");
    const sideNav = screen.getByRole("navigation", { name: "Primary" });
    const active = within(sideNav)
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute("href", "/jobs");
  });
});
