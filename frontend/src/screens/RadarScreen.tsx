// Feature: urbanfit-jobs-frontend
// Screen 3 — Market-Benchmarked Radar (router entry).
//
// The real screen lives in ./radar/RadarScreen (task 11.4). This module
// re-exports it under the named export `RadarScreen` so the router's lazy
// import path (`import("../screens/RadarScreen").then(m => ({
// default: m.RadarScreen }))`) keeps working unchanged.

export { RadarScreen } from "./radar/RadarScreen";
export type { RadarScreenProps } from "./radar/RadarScreen";
