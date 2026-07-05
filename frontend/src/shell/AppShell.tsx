// Feature: urbanfit-jobs-frontend
// AppShell — persistent navigation chrome + routed screen outlet
// (Req 2.1, 2.2, 2.3, 2.6).
//
// Layout:
//   - >= 768px (Tailwind `md:`): a persistent LEFT side navigation listing all
//     four destinations, with the "UrbanFit Jobs" product name at the top.
//   - < 768px: a fixed BOTTOM navigation bar with the same four destinations.
//
// The active route is derived from react-router `useLocation`; exactly one
// NavItem receives `isActive` (Property 16). The routed screen renders through
// `<Outlet/>`.

import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { T } from "../components";
import { K } from "../i18n";
import type { I18nKey } from "../i18n";
import { NavItem } from "./NavItem";
import { PovProvider, usePov } from "./pov-context";
import type { Pov } from "./pov-context";
import { PovToggle } from "./PovToggle";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

/** Lightweight loading indicator shown while a lazy screen chunk loads. */
function ScreenFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="screen-loading"
      className="flex min-h-[8rem] items-center justify-center p-space-lg text-on-surface-variant"
    >
      <span className="material-symbols-outlined animate-spin" aria-hidden>
        progress_activity
      </span>
    </div>
  );
}

interface Destination {
  route: string;
  labelKey: I18nKey;
  icon: string;
}

/** The four core screens, in navigation order. */
export const DESTINATIONS: Destination[] = [
  { route: "/jobs", labelKey: K.navJobs, icon: "work" },
  { route: "/assessment", labelKey: K.navAssessment, icon: "psychology" },
  { route: "/radar", labelKey: K.navRadar, icon: "radar" },
  { route: "/hr", labelKey: K.navHr, icon: "groups" },
];

/**
 * Determine which destination is active for a given pathname. Exactly one (or
 * none, for an unknown path) matches because the four routes are distinct,
 * non-overlapping prefixes.
 */
export function activeRouteFor(pathname: string): string | null {
  const match = DESTINATIONS.find(
    (d) => pathname === d.route || pathname.startsWith(`${d.route}/`)
  );
  return match ? match.route : null;
}

/**
 * The destinations visible for a given POV:
 *   - "candidate" sees only Job Discovery, Assessment, and Radar.
 *   - "hr" sees only the HR Dashboard.
 */
function destinationsForPov(pov: Pov): Destination[] {
  return pov === "hr"
    ? DESTINATIONS.filter((d) => d.route === "/hr")
    : DESTINATIONS.filter((d) => d.route !== "/hr");
}

/** The route each POV lands on when it has no other destination to show. */
function defaultRouteForPov(pov: Pov): string {
  return pov === "hr" ? "/hr" : "/jobs";
}

/** Renders the nav chrome + routed outlet; nested inside PovProvider so it
 * can read the current POV to decide which destinations to show. */
function AppShellContent() {
  const { pathname } = useLocation();
  const activeRoute = activeRouteFor(pathname);
  const { pov } = usePov();
  const destinations = destinationsForPov(pov);

  // Keep the current route in sync with the active POV: if the route the
  // user is on isn't one of the current POV's destinations — whether because
  // they just switched POV or navigated directly to a URL outside the
  // current POV's scope — redirect to that POV's default screen (Req 2.2).
  // Redirecting during render (rather than via an effect) avoids a flash of
  // the disallowed screen.
  const isRouteAllowed =
    activeRoute === null || destinations.some((d) => d.route === activeRoute);

  return (
    <div className="min-h-full bg-surface-container-lowest text-on-surface font-sans md:flex">
      {/* Desktop side navigation (>= 768px). Pinned via sticky positioning
          + full viewport height so it stays in view while <main> scrolls
          (Req 2.1). */}
      <nav
        aria-label="Primary"
        className="hidden md:flex md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto md:flex-col md:gap-space-lg border-r border-surface-container bg-surface-container-low p-space-lg"
      >
        <T
          k={K.productName}
          as="h1"
          className="text-headline-sm font-bold text-on-surface"
        />
        <div className="flex flex-col gap-space-xs">
          {destinations.map((d) => (
            <NavItem
              key={d.route}
              icon={d.icon}
              labelKey={d.labelKey}
              route={d.route}
              isActive={activeRoute === d.route}
              orientation="horizontal"
            />
          ))}
        </div>
      </nav>

      {/* Routed screen content. Bottom padding on mobile clears the fixed nav.
          The routed screen is code-split (React.lazy); <Suspense> shows a
          lightweight loading indicator while its chunk loads (Req 2.4). The
          RouteErrorBoundary guards ONLY this content region, so a failed chunk
          load or a screen render error keeps the surrounding nav chrome active
          and surfaces a non-blocking, dismissible error (Req 2.5). Passing the
          active pathname as resetKey clears a prior failure on each navigation. */}
      <main className="min-h-full flex-1 pb-24 md:pb-0">
        {isRouteAllowed ? (
          <RouteErrorBoundary resetKey={pathname}>
            <Suspense fallback={<ScreenFallback />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        ) : (
          <Navigate to={defaultRouteForPov(pov)} replace />
        )}
      </main>

      {/* Mobile bottom navigation (< 768px). */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-10 flex md:hidden border-t border-surface-container bg-surface-container-low px-space-sm py-space-xs"
      >
        {destinations.map((d) => (
          <NavItem
            key={d.route}
            icon={d.icon}
            labelKey={d.labelKey}
            route={d.route}
            isActive={activeRoute === d.route}
            orientation="vertical"
          />
        ))}
      </nav>

      {/* Floating Candidate/HR POV toggle, rendered once outside both navs
          so it appears on every screen (Req 2.2). */}
      <PovToggle />
    </div>
  );
}

export function AppShell() {
  return (
    <PovProvider>
      <AppShellContent />
    </PovProvider>
  );
}
