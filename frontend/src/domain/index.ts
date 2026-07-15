// Feature: urbanfit-jobs-frontend
// Public entry point for the pure domain layer.
// Re-exports shared view-model types. Pure logic functions (clampPercent,
// orderJobs, filterByTolerance, formatMonthlyCostTHB, formatMMSS,
// largestShortfall, resolveText) are added here as tasks 2.x land.

export * from "./types";
export * from "./transit";
export * from "./clamp-percent";
export * from "./clamp-tolerance";
export * from "./order-jobs";
export * from "./order-by-commute-fit";
export * from "./filter-by-tolerance";
export * from "./filter-by-commute-boundary";
export * from "./filter-by-viewport";
export * from "./format-cost";
export * from "./format-time";
export * from "./format-tolerance";
export * from "./format-primary-row";
export * from "./format-financial";
export * from "./transit-icon";
export * from "./format-fit";
export * from "./geo";
export * from "./largest-shortfall";
export * from "./resolve-text";
export * from "./job-result";
export * from "./build-search-params";
export * from "./map-job-result";
export * from "./parse-search-response";
