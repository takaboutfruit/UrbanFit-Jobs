// Feature: urbanfit-jobs-frontend
// Screen 4 — Zero-Filter HR Dashboard (router entry).
//
// The real screen lives in ./hr/HRDashboardScreen (task 12.2). This module
// re-exports it under the named export `HRDashboardScreen` so the router's
// lazy import path (`import("../screens/HRDashboardScreen").then(m => ({
// default: m.HRDashboardScreen }))`) keeps working unchanged.

export { HRDashboardScreen } from "./hr/HRDashboardScreen";
export type { HRDashboardScreenProps } from "./hr/HRDashboardScreen";
