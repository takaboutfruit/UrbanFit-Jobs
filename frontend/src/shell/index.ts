// Feature: urbanfit-jobs-frontend
// Barrel for the app shell (navigation chrome + routing).

export { AppShell, DESTINATIONS, activeRouteFor } from "./AppShell";
export { NavItem } from "./NavItem";
export type { NavItemProps } from "./NavItem";
export { PovProvider, usePov } from "./pov-context";
export type { Pov, PovContextValue } from "./pov-context";
export { PovToggle } from "./PovToggle";
export { RouteErrorBoundary } from "./RouteErrorBoundary";
export type { RouteErrorBoundaryProps } from "./RouteErrorBoundary";
export { AppRoutes } from "./routes";
