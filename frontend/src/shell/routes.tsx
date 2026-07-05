// Feature: urbanfit-jobs-frontend
// Route configuration (Req 2.1–2.6).
//
// Declares the AppShell as the layout route wrapping the four child routes
// (/jobs, /assessment, /radar, /hr) plus a redirect from "/" to "/jobs".
//
// The declarative `<Routes>` API (rather than a data router) is used so that
// navigation stays purely client-side/synchronous — matching the <1s budget
// (Req 2.4) and keeping the redirect synchronous. `AppRoutes` is rendered
// inside a router: App wraps it in <BrowserRouter>, tests in <MemoryRouter>.
//
// Each screen is code-split via React.lazy so its module downloads on demand as
// a separate chunk. This keeps the initial shell payload small and navigation
// fast (Req 2.4); the AppShell renders these lazy screens inside a <Suspense>
// (lightweight loading indicator) wrapped by a RouteErrorBoundary so a chunk
// that fails to load surfaces a non-blocking error instead of crashing the
// shell (Req 2.5).

import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";

// Named exports wrapped for React.lazy (which expects a default export).
const JobDiscoveryScreen = lazy(() =>
  import("../screens/JobDiscoveryScreen").then((m) => ({
    default: m.JobDiscoveryScreen,
  }))
);
const AssessmentScreen = lazy(() =>
  import("../screens/AssessmentScreen").then((m) => ({
    default: m.AssessmentScreen,
  }))
);
const RadarScreen = lazy(() =>
  import("../screens/RadarScreen").then((m) => ({ default: m.RadarScreen }))
);
const HRDashboardScreen = lazy(() =>
  import("../screens/HRDashboardScreen").then((m) => ({
    default: m.HRDashboardScreen,
  }))
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="jobs" element={<JobDiscoveryScreen />} />
        <Route path="assessment" element={<AssessmentScreen />} />
        <Route path="radar" element={<RadarScreen />} />
        <Route path="hr" element={<HRDashboardScreen />} />
      </Route>
    </Routes>
  );
}
