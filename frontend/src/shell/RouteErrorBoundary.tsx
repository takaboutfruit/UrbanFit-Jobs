// Feature: urbanfit-jobs-frontend
// RouteErrorBoundary — route-level error boundary (Req 2.5).
//
// Catches errors thrown while a routed screen renders (including failures of a
// lazily-loaded route chunk, whose rejected dynamic import surfaces as a render
// error). On error it does NOT unmount the surrounding App_Shell chrome; the
// boundary only wraps the routed content region, so the navigation stays
// active and usable. In place of the broken screen it surfaces a NON-BLOCKING,
// dismissible error indication (an amber/warning banner) telling the User the
// destination could not be opened (K.navError).
//
// Recovery: the banner exposes a dismiss/retry control that resets the boundary
// state and re-renders its children. Navigating to another destination also
// resets the boundary because `resetKey` (the active pathname) changes.

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Icon, T } from "../components";
import { K } from "../i18n";

export interface RouteErrorBoundaryProps {
  /** The routed content to guard. */
  children: ReactNode;
  /**
   * When this value changes, the boundary clears any captured error and
   * retries rendering its children. AppShell passes the active pathname so a
   * fresh navigation always starts from a clean state.
   */
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    // Enter the error state so render() shows the non-blocking indication
    // instead of the crashed subtree (Req 2.5).
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for diagnostics. React also logs caught errors to the console in
    // development, so this is expected noise during error-boundary tests.
    console.error("RouteErrorBoundary caught a routed-screen error:", error, info);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    // A new navigation (changed resetKey) clears a prior failure so the newly
    // selected screen gets a clean render attempt.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleDismiss = (): void => {
    // Reset and retry: re-render the children. If the underlying problem is
    // gone (e.g. a transient chunk-load failure), the screen renders normally.
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Non-blocking, dismissible warning banner. Rendered inside the content
    // region only — the surrounding nav chrome remains mounted and active.
    return (
      <div className="p-space-lg">
        <div
          role="alert"
          data-testid="route-error-banner"
          className="flex items-start gap-space-sm rounded-lg border border-warning/40 bg-surface-container p-space-md text-warning"
        >
          <Icon name="warning" aria-hidden />
          <T k={K.navError} className="flex-1 text-body-md text-warning" />
          <button
            type="button"
            onClick={this.handleDismiss}
            data-testid="route-error-dismiss"
            aria-label="Dismiss"
            className="rounded-md p-space-xs text-warning hover:bg-surface-container-low"
          >
            <Icon name="close" aria-hidden />
          </button>
        </div>
      </div>
    );
  }
}
