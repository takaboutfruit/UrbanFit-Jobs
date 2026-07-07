# Implementation Plan: Job Discovery Map-First

## Overview

This plan refactors `JobDiscoveryScreen` into a Map-First interface for the "20-Minute City" concept. Work proceeds bottom-up: first the shared types and i18n, then the pure `src/domain/*` helpers, then the presentational components under `src/screens/discovery/*`, then the map panel, and finally the screen wiring and responsive layout.

All code is TypeScript/React, matching the existing Vite stack. Pure domain logic is framework-free; components follow the existing `TransitMap` conventions for `react-leaflet`. Per the project's no-testing steering policy, this plan contains no test tasks — verification is done by reading code, running the build/typecheck, and manual reasoning.

## Tasks

- [x] 1. Set up shared types and i18n
  - [x] 1.1 Extend Job view model and add transit/geo supporting types
    - In `src/domain/types.ts` (and a new `src/domain/transit.ts`), add `TransitMode` (`"Walk" | "BTS" | "MRT"`), `TransitSegment`, `Polygon`, and `MapBounds`
    - Extend `Job` with `commutingMinutes: number | null`, `perTripCostBaht: number`, `transitSegments: TransitSegment[] | null`, `commuteFitScore: number | null`, `skillFitScore: number | null`, `location: Coordinate | null`; retain deprecated fields for other screens
    - Export the new types via `src/domain/index.ts`
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 5.6, 6.1, 6.3, 6.4, 6.6, 6.7, 8.3, 9.5_

  - [x] 1.2 Add Thai-first i18n keys and strings
    - Add keys to `src/i18n/keys.ts` and Thai + non-empty default values to `src/i18n/strings.ts`: `discoveryMapTitle`, `discoveryMapSubtitle`, `perTripUnit`, `commuteFitLabel`, `skillFitLabel`, `fitUnavailable`, `isochroneBoundaryLabel`, `homeNotSet`, `transitModeWalk`, `transitModeBts`, `transitModeMrt`
    - Confirm the guaranteed non-empty `DEFAULT_FALLBACK_TEXT` and `resolveText` behavior are reused as-is
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement tolerance and primary-row formatting domain logic
  - [x] 2.1 Implement `clampToleranceStep` and tolerance constants
    - Create `src/domain/clamp-tolerance.ts` exporting `TOLERANCE_MIN` (15), `TOLERANCE_MAX` (120), `TOLERANCE_STEP` (5), `TOLERANCE_TARGET` (20)
    - Snap any real input to the nearest valid 5-minute step within [15, 120]; export via `src/domain/index.ts`
    - _Requirements: 2.2, 2.4, 2.8_

  - [x] 2.2 Implement tolerance display + mint-glow helpers
    - Create `src/domain/format-tolerance.ts` with `formatToleranceValue(value)` → `"{value} นาที"` (single space, Thai unit) and `shouldShowMintGlow(value)` → true only when value === 20
    - _Requirements: 2.3, 2.5, 2.7_

  - [x] 2.3 Implement `formatPrimaryRow`
    - Create `src/domain/format-primary-row.ts` producing `"{minutes} นาที • ฿{cost} / เที่ยว"` (padded bullet), `"฿0 / เที่ยว"` for zero cost, and a commute-unavailable indicator when minutes is null
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 3. Checkpoint - Verify domain logic
  - Ensure the project builds and typechecks; verify tolerance and primary-row behavior by reading code and manual reasoning. Ask the user if questions arise.

- [x] 4. Implement transit and fit domain logic
  - [x] 4.1 Implement transit mode→icon mapping and segment formatting
    - Create `src/domain/transit-icon.ts` with a `Record<TransitMode, string>` (`Walk`→`directions_walk`, `BTS`→`tram`, `MRT`→`subway`) plus default `directions_transit`, and `resolveTransitIcon(mode)`
    - Add `formatSegmentDuration(minutes)` → `"{minutes} นาที"`
    - _Requirements: 5.2, 5.5, 5.7_

  - [x] 4.2 Implement fit-badge score formatting
    - Create `src/domain/format-fit.ts` with `formatFitBadge(score)` returning `clampPercent(score)` as a whole-number percent, or the fit-unavailable indicator for null/undefined (reuse existing `clampPercent`)
    - _Requirements: 6.3, 6.4, 6.6, 6.7_

- [x] 5. Implement geometry domain logic
  - [x] 5.1 Implement geo helpers
    - Create `src/domain/geo.ts` with `isValidCoordinate`, `isWithinBounds` (inclusive of edges, guarded by `Number.isFinite`), `pointInPolygon` (ray-casting, on-edge counts as inside), and `buildIsochrone(home, toleranceMinutes)` (deterministic closed ring scaling linearly with tolerance); export via `src/domain/index.ts`
    - _Requirements: 7.3, 7.4, 8.1, 8.3, 9.1, 9.2, 9.3_

- [x] 6. Implement filtering and ordering domain logic
  - [x] 6.1 Implement `filterJobsByIsochrone`
    - Create `src/domain/filter-by-isochrone.ts` returning jobs whose valid finite company coordinate is inside/on the isochrone; exclude null/non-finite coordinates
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Implement `filterJobsByViewport`
    - Create `src/domain/filter-by-viewport.ts` returning jobs whose valid finite company coordinate is within bounds inclusive of edges; exclude invalid coordinates
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.3 Implement `orderByCommuteFit`
    - Create `src/domain/order-by-commute-fit.ts` returning a permutation ordered by descending `commuteFitScore`, ties broken by company name ascending A→Z; never mutate input
    - _Requirements: 9.5_

- [x] 7. Checkpoint - Verify domain logic
  - Ensure the project builds and typechecks; verify transit, fit, geometry, filtering, and ordering behavior by reading code and manual reasoning. Ask the user if questions arise.

- [x] 8. Build job card presentational components
  - [x] 8.1 Implement `PrimaryRow`
    - Create `src/screens/discovery/PrimaryRow.tsx` rendering `formatPrimaryRow` output in white on-surface text at a font size and weight strictly greater than the meta row
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.2 Implement `TransitChainRow`
    - Create `src/screens/discovery/TransitChainRow.tsx` rendering 1–10 segments left-to-right with per-mode Material Symbols icons, per-segment `"{minutes} นาที"`, exactly N−1 connectors, single-Walk with no connector, and the commute-unavailable indicator for null/empty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 8.3 Implement `JobMetaRow`
    - Create `src/screens/discovery/JobMetaRow.tsx` rendering muted-gray title + company at a font size smaller than the fit-badge value text
    - _Requirements: 6.1_

  - [x] 8.4 Implement `FitBadges`
    - Create `src/screens/discovery/FitBadges.tsx` with `Commute_Fit_Badge` (mint `#4edea3` fill, AA-contrast text) left of `Skill_Fit_Badge` (bordered, no fill), both via `formatFitBadge`; no unified fit ring
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 8.5 Rewrite `JobCard` to compose the four rows
    - Update `src/screens/discovery/JobCard.tsx` to render `PrimaryRow`, `TransitChainRow`, `JobMetaRow`, `FitBadges` in order and remove the single unified fit ring
    - _Requirements: 4.1, 5.1, 6.1, 6.2, 6.5_

- [x] 9. Update header and tolerance slider
  - [x] 9.1 Update `DiscoveryHeader`
    - Edit `src/screens/discovery/DiscoveryHeader.tsx` to render `discoveryMapTitle` at headline size with `discoveryMapSubtitle` immediately below at a strictly smaller size, sourced via `resolveText`, and host `ToleranceSlider`; preserve title-above-subtitle layout on fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.3_

  - [x] 9.2 Update `ToleranceSlider`
    - Edit `src/screens/discovery/ToleranceSlider.tsx` for label + trailing ":" , default 20, range 15–120 step 5, value display via `formatToleranceValue`, and mint-green glow on the target indicator only when value === 20 (`shouldShowMintGlow`); clamp restored values via `clampToleranceStep`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 10. Checkpoint - Verify components
  - Ensure the project builds and typechecks; verify job card rows, header, and tolerance slider behavior by reading code and manual reasoning. Ask the user if questions arise.

- [x] 11. Build the map panel components
  - [x] 11.1 Implement `HomePin`
    - Create `src/screens/discovery/HomePin.tsx` rendering a marker at a valid finite home coordinate and omitting it when invalid
    - _Requirements: 7.1, 7.2_

  - [x] 11.2 Implement `IsochroneOverlay`
    - Create `src/screens/discovery/IsochroneOverlay.tsx` rendering a mint-green `#4edea3` polygon (fill opacity in [0.2, 0.5]) from `buildIsochrone(home, toleranceMinutes)`
    - _Requirements: 7.3, 7.4_

  - [x] 11.3 Implement `BoundaryLabel`
    - Create `src/screens/discovery/BoundaryLabel.tsx` as a plain-DOM sibling badge anchored on the shaded area showing `isochroneBoundaryLabel`
    - _Requirements: 7.5_

  - [x] 11.4 Implement `ViewportWatcher`
    - Create `src/screens/discovery/ViewportWatcher.tsx` using `useMapEvents` (moveend/zoomend) to invoke a debounced `onSettle(bounds)` callback
    - _Requirements: 9.1_

  - [x] 11.5 Update `TransitMap` to compose the map panel
    - Edit `src/screens/discovery/TransitMap.tsx` to render `HomePin`, `IsochroneOverlay`, `BoundaryLabel`, isochrone-filtered `CompanyPin`s (via `filterJobsByIsochrone`), and `ViewportWatcher`; show the home-not-set message (plain-DOM sibling) when home is invalid while still rendering the map
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4_

- [x] 12. Wire `JobDiscoveryScreen` and responsive layout
  - [x] 12.1 Implement screen state and derivation pipelines
    - Edit `src/screens/discovery` screen (`JobDiscoveryScreen`) to own `toleranceMinutes` (default `TOLERANCE_TARGET`, clamped on restore), `selectedJobId`, and `viewportBounds`; derive the isochrone in `useMemo`, feed isochrone-filtered pins to `TransitMap`, and derive the list via `orderByCommuteFit(filterJobsByViewport(jobs, viewportBounds))`; render `JobList` empty-state when no cards
    - _Requirements: 2.2, 2.8, 7.4, 8.4, 8.5, 9.1, 9.4, 9.5_

  - [x] 12.2 Implement the 35/65 responsive layout and dark surfaces
    - Apply `lg:grid-cols-[35fr_65fr]` desktop split (list left, map right), single stacked column (list above map) below 1024px with `overflow-x-hidden`, and dark-mode surface tokens on header/list/map regions
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 13. Final checkpoint - Verify integration
  - Ensure the project builds and typechecks; verify the map panel, screen wiring, and responsive layout by reading code and manual reasoning. Ask the user if questions arise.

## Notes

- Each task references specific requirement sub-clauses for traceability.
- Per the no-testing steering policy, this plan intentionally contains no unit, integration, or property-based test tasks.
- Verification at checkpoints is done via the build/typecheck and by reading code, not by running tests.
- Checkpoints ensure incremental validation before moving to the next layer.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "4.1", "4.2", "5.1", "6.3"] },
    { "id": 2, "tasks": ["6.1", "6.2", "8.1", "8.2", "8.3", "8.4", "9.2", "11.1", "11.2", "11.3", "11.4"] },
    { "id": 3, "tasks": ["8.5", "9.1", "11.5"] },
    { "id": 4, "tasks": ["12.1"] },
    { "id": 5, "tasks": ["12.2"] }
  ]
}
```
