// Feature: urbanfit-jobs-frontend
// Component tests for RouteErrorBoundary (Req 2.5).
//
// Verifies that when a routed child throws:
//   - the boundary renders the NON-BLOCKING error indication (K.navError text),
//   - the surrounding shell/nav chrome remains present (it lives OUTSIDE the
//     boundary, so it is never unmounted),
//   - the dismiss control resets the boundary and re-renders its children.
//
// React logs caught errors to console.error inside an error boundary; that is
// expected here, so we silence it for these tests to keep the output clean.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { strings, K } from "../i18n";

const navErrorText = strings[K.navError].th;

/** A child that throws while `shouldThrow` is true. */
function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("simulated route chunk load failure");
  }
  return <div data-testid="screen-ok">Screen content</div>;
}

/** Minimal shell chrome (nav) rendered OUTSIDE the boundary, like AppShell. */
function ShellHarness({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav aria-label="Primary">
        <a href="/jobs">Jobs</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children normally when they do not throw", () => {
    render(
      <RouteErrorBoundary>
        <Thrower shouldThrow={false} />
      </RouteErrorBoundary>
    );
    expect(screen.getByTestId("screen-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("route-error-banner")).not.toBeInTheDocument();
  });

  it("shows the non-blocking error indication while keeping the shell/nav present", () => {
    render(
      <ShellHarness>
        <RouteErrorBoundary>
          <Thrower shouldThrow />
        </RouteErrorBoundary>
      </ShellHarness>
    );

    // Non-blocking error indication with the navError message.
    const banner = screen.getByTestId("route-error-banner");
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByText(navErrorText)).toBeInTheDocument();
    expect(banner).toHaveAttribute("role", "alert");

    // The surrounding nav chrome is still present (shell not unmounted).
    expect(
      screen.getByRole("navigation", { name: "Primary" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
  });

  it("dismisses the error and re-renders children on recovery", () => {
    let shouldThrow = true;

    function Wrapper() {
      return (
        <RouteErrorBoundary>
          <Thrower shouldThrow={shouldThrow} />
        </RouteErrorBoundary>
      );
    }

    const { rerender } = render(<Wrapper />);
    expect(screen.getByTestId("route-error-banner")).toBeInTheDocument();

    // The underlying issue clears (e.g. transient chunk failure resolved) and
    // fresh children (no longer throwing) are provided to the boundary.
    shouldThrow = false;
    rerender(<Wrapper />);

    // Dismiss/retry resets the boundary, which re-renders the now-healthy child.
    fireEvent.click(screen.getByTestId("route-error-dismiss"));

    // Banner gone, screen content restored.
    expect(screen.queryByTestId("route-error-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-ok")).toBeInTheDocument();
  });

  it("resets when the resetKey changes (navigation to another destination)", () => {
    let shouldThrow = true;

    const { rerender } = render(
      <RouteErrorBoundary resetKey="/jobs">
        <Thrower shouldThrow={shouldThrow} />
      </RouteErrorBoundary>
    );
    expect(screen.getByTestId("route-error-banner")).toBeInTheDocument();

    // Navigate elsewhere: the destination renders fine.
    shouldThrow = false;
    rerender(
      <RouteErrorBoundary resetKey="/radar">
        <Thrower shouldThrow={shouldThrow} />
      </RouteErrorBoundary>
    );

    expect(screen.queryByTestId("route-error-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("screen-ok")).toBeInTheDocument();
  });
});
