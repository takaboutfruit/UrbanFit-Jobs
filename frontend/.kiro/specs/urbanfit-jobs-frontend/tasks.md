# Implementation Plan: UrbanFit Jobs Frontend

## Overview

This plan builds the UrbanFit Jobs frontend as a React 18 + TypeScript single-page application using Vite, Tailwind CSS (with the reference design tokens), React Router, Leaflet (react-leaflet), and Chart.js. Work proceeds bottom-up: first the project scaffold and design tokens, then the pure logic layer (`src/domain/`) that is the primary property-test surface, then shared design-system components, the app shell and routing, the four feature screens, and finally end-to-end wiring. Property-based tests (fast-check + Vitest) validate the 17 correctness properties from the design; unit, component, and integration tests cover styling, layout, timing, and interaction wiring.

## Tasks

- [x] 1. Set up project scaffold, tooling, and design tokens
  - [x] 1.1 Initialize Vite + React 18 + TypeScript project and testing tooling
    - Create the Vite React-TS project structure with `src/domain/`, `src/components/`, `src/screens/`, `src/shell/`, and `src/i18n/` directories
    - Add and configure Vitest, React Testing Library, jsdom, and fast-check
    - Add a test script and ensure `vitest --run` executes an empty smoke test successfully
    - _Requirements: 1.1_

  - [x] 1.2 Configure Tailwind CSS with the reference design tokens
    - Configure Tailwind and map the surface tokens (surface-container-lowest #010409, surface-container-low #0d1117, surface-container #161b22), primary #4edea3, secondary #a2c9ff, warning #f2cc60, error/destructive #f85149
    - Load Be Vietnam Pro (Google Fonts) with a system sans-serif fallback that preserves the typography scale, and load Material Symbols Outlined
    - Define the headline/body/label typography scale as Tailwind tokens
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.10_

  - [x] 1.3 Define shared view-model types and i18n string table
    - Create TypeScript interfaces for `Job`, `Coordinate`, `TransitLine`, `DiscoveryState`, `ChatMessage`, `ContextTable`, `AssessmentState`, `RadarSeries`, `RadarData`, `CandidateSummary`, `HRShortlist`, `WorkModel`, `TransitLineType`, and `I18nTable`
    - Create the Thai-first string table with default-text entries
    - _Requirements: 1.8_

- [ ] 2. Implement the pure logic layer (`src/domain/`)
  - [x] 2.1 Implement `clampPercent`
    - Return the nearest integer within [0, 100] for any real input; bound out-of-range values to 0 or 100
    - _Requirements: 4.4, 10.2, 13.1, 13.2, 13.8_

  - [ ]* 2.2 Write property test for `clampPercent`
    - **Property 1: Percentage clamping stays within bounds**
    - **Validates: Requirements 4.4, 10.2, 13.1, 13.2, 13.8**

  - [x] 2.3 Implement `orderJobs`
    - Return a permutation ordered by `urbanFitScore` descending, with company name A→Z as the tiebreak
    - _Requirements: 4.1, 4.2_

  - [ ]* 2.4 Write property test for `orderJobs`
    - **Property 2: Job ordering is a sorted total order (score desc, company A–Z tiebreak)**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 2.5 Implement `filterByTolerance`
    - Retain only jobs whose commuting time is ≤ the maximum; preserve descending Urban-Fit-Score order of retained jobs
    - _Requirements: 6.5_

  - [ ]* 2.6 Write property test for `filterByTolerance`
    - **Property 3: Tolerance filtering excludes over-limit jobs and preserves ordering**
    - **Validates: Requirements 6.5**

  - [x] 2.7 Implement `formatMonthlyCostTHB`
    - Produce thousands-grouped digits followed by "บ./เดือน" for integer baht in 0..999,999
    - _Requirements: 4.6_

  - [ ]* 2.8 Write property test for `formatMonthlyCostTHB`
    - **Property 4: Monthly travel cost formatting round-trips**
    - **Validates: Requirements 4.6**

  - [x] 2.9 Implement `formatMMSS`
    - Produce zero-padded `MM:SS`; floor at `00:00` for values at or below zero
    - _Requirements: 8.1, 8.5_

  - [ ]* 2.10 Write property test for `formatMMSS`
    - **Property 9: Timer formatting is MM:SS with a floor at zero**
    - **Validates: Requirements 8.1, 8.5**

  - [x] 2.11 Implement `largestShortfall`
    - Return the dimension with the maximal positive (benchmark − candidate) gap and that shortfall; return null when no dimension is below benchmark
    - _Requirements: 11.1, 11.5_

  - [ ]* 2.12 Write property test for `largestShortfall`
    - **Property 13: Largest-shortfall advice selects the true maximum gap**
    - **Validates: Requirements 11.1, 11.5**

  - [x] 2.13 Implement `resolveText`
    - Resolve a key from the i18n table; return the defined default text when missing; never return an empty string or the raw key
    - _Requirements: 1.9_

  - [ ]* 2.14 Write property test for `resolveText`
    - **Property 17: Translation resolution never yields an empty string or a raw key**
    - **Validates: Requirements 1.9**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement shared design-system components
  - [x] 4.1 Implement `Icon` and `T` (translation) components
    - `Icon` wraps Material Symbols Outlined with an optional fill variant
    - `T` renders `resolveText` output, guaranteeing non-empty output and default-text fallback
    - _Requirements: 1.4, 1.8, 1.9_

  - [x] 4.2 Implement `ProgressBar` and `ProgressRing`
    - Filled proportion equals `clampPercent(percent) / 100`; displayed numeric label equals `clampPercent(percent)`
    - _Requirements: 4.4, 13.2, 13.8_

  - [ ]* 4.3 Write property test for progress indicators
    - **Property 6: Progress indicator fill matches its percentage**
    - **Validates: Requirements 4.4, 13.2, 13.8**

  - [ ]* 4.4 Write unit tests for design tokens and contrast
    - Assert surface/accent/warning/error tokens are applied and no light-mode surface colors are used
    - Compute WCAG contrast ratios over the defined token pairs (≥4.5:1 body/label, ≥3:1 headline ≥24px)
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.10_

- [x] 5. Implement the app shell and routing
  - [x] 5.1 Implement `AppShell` and `NavItem` with routing
    - Declare routes `/jobs`, `/assessment`, `/radar`, `/hr`; render side nav (≥768px) vs bottom nav (<768px); display the "UrbanFit Jobs" product name
    - Apply distinct active styling to the nav entry matching the active route
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ]* 5.2 Write property test for active-navigation styling
    - **Property 16: Active-navigation styling is unique**
    - **Validates: Requirements 2.3**

  - [x] 5.3 Implement navigation timing and route-failure error boundary
    - Ensure navigation completes within 1 second via client-side/code-split routes; wrap screens in an error boundary that keeps the current screen active and surfaces a non-blocking error indication on route-load failure
    - _Requirements: 2.4, 2.5_

  - [ ]* 5.4 Write component tests for nav destinations and failure handling
    - Verify all four destinations, product name, active-change behavior, and route-failure indication
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Screen 1 — Job Discovery
  - [x] 7.1 Implement `DiscoveryHeader`, `ResidenceInput`, and `ToleranceSlider`
    - Header with title + subtitle; `ResidenceInput` free text hard-capped at 100 chars with whitespace-only causing no residence-based change; `ToleranceSlider` range 15–120 step 5 displaying `"{value} นาที"`
    - _Requirements: 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

  - [ ]* 7.2 Write property test for capped text inputs
    - **Property 11: Text inputs never exceed their maximum length**
    - **Validates: Requirements 6.1, 6.6, 9.2, 9.7**

  - [x] 7.3 Implement `JobCard` and `JobList`
    - `JobCard` renders title, company, Lifestyle-Fit-Score with progress indicator, commuting time + route, monthly cost (via `formatMonthlyCostTHB`), and exactly one Work-Model tag; selected state visually distinct
    - `JobList` renders the ordered+filtered list and an empty-state message when zero
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.4 Write property test for work-model tag rendering
    - **Property 5: Work model renders exactly one tag**
    - **Validates: Requirements 4.7**

  - [x] 7.5 Implement `JobDiscoveryScreen` composition and selection state
    - Own `selectedJobId`, `residenceText`, `toleranceMinutes`; derive the visible list via `orderJobs` then `filterByTolerance`; apply 1024px split vs <1024px stacked layout; keep single-selection highlight in sync between list and map
    - _Requirements: 3.1, 3.2, 4.1, 6.4, 6.5, 14.1_

  - [ ]* 7.6 Write property test for single-selection invariant
    - **Property 7: At most one selection is active (job cards and company pins)**
    - **Validates: Requirements 4.8, 5.8, 5.9**

  - [x] 7.7 Implement `TransitMap`, `CompanyPin`, and legend
    - Leaflet map plotting one pin per job with a valid coordinate; BTS/MRT/BRT polylines with distinct styles + legend; highlight the pin matching `selectedJobId`; show unplottable-count indicator and no-locations message; pins show job title + whole-minute time or an unavailable indicator; disable one-finger pan below 768px
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 14.6_

  - [ ]* 7.8 Write property test for pin/coordinate partition
    - **Property 8: Company pins partition the job list by coordinate validity**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 7.9 Write component/integration tests for discovery layout and map
    - Verify 1024px split vs stacked layout, slider display/update, empty states, map legend/overlays, pin popups, and one-finger-pan disabling below 768px
    - _Requirements: 3.1, 3.2, 4.9, 5.3, 5.4, 5.5, 5.6, 5.7, 5.10, 6.3, 6.4, 14.1, 14.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Screen 2 — AI Roleplay Assessment
  - [x] 9.1 Implement `PromptTimer`
    - Display `MM:SS` (via `formatMMSS`) in error red; count down using monotonic timestamp deltas within ±1s; stop and hold at `00:00`; show a time-ended indication; show a descriptive per-prompt label
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 9.2 Implement `ContextDataTable`
    - Render rows/columns with visible headers; vertical scroll with sticky headers on overflow; "no context data" message preserving layout when empty
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 9.3 Implement `ChatInterface`
    - Distinct alignment/labels for AI vs candidate; text input ≤2,000 chars with send control; append + clear on valid submit; reject empty/whitespace; loading/typing indicator; streaming render; retain scroll to all messages; auto-scroll to newest
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 9.10_

  - [ ]* 9.4 Write property test for valid chat submission
    - **Property 10: Valid chat submission appends the message and clears the input**
    - **Validates: Requirements 9.3**

  - [x] 9.5 Implement `CodeEditor`
    - Multi-line input ≤20,000 chars; submit control; reject empty/whitespace submit with a "non-empty required" indication and retained content
    - _Requirements: 9.7, 9.8, 9.11_

  - [x] 9.6 Implement `AssessmentScreen` composition
    - Top bar hosting `PromptTimer` above split regions; desktop split (Context on left, Chat + Code on right) with no horizontal scroll; stack into a single column below 768px
    - _Requirements: 7.1, 7.2, 14.2_

  - [ ]* 9.7 Write component tests for assessment layout and interactions
    - Verify top-bar placement, split/stacked layout, table headers/scroll/empty, timer lifecycle/styling/label, chat distinction/loading/streaming/scroll, and code-editor empty-submit handling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.2, 8.3, 8.4, 8.6, 8.7, 9.1, 9.4, 9.5, 9.6, 9.8, 9.9, 9.10, 9.11, 14.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Screen 3 — Market-Benchmarked Radar
  - [x] 11.1 Implement `RadarChart`
    - Chart.js radar with ≥3 labeled axes scaled 0–100; plot Candidate (#4edea3), Requirement (dotted gray), Market (orange/tertiary) series with one clamped value per dimension; legend; omit unavailable series and report which was omitted
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write property test for radar series mapping
    - **Property 12: Radar series map one clamped value per dimension**
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [x] 11.3 Implement `AdviceAlert`
    - Compute the largest shortfall via `largestShortfall`; show the skill-gap message in warning amber; enabled "ค้นหาคอร์สอัปสกิล" CTA that navigates within 1s; show a no-gap confirmation when no dimension is below benchmark
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 11.4 Implement `RadarScreen` composition
    - Center the `RadarChart` with `AdviceAlert` below; vertical-scroll-only layout with no horizontal scrollbar on desktop and single-column stack on mobile
    - _Requirements: 14.4, 14.5_

  - [ ]* 11.5 Write component tests for radar and advice
    - Verify chart centrality/axes/legend, series omission message, advice styling, and CTA state/navigation
    - _Requirements: 10.1, 10.5, 10.6, 11.2, 11.3, 11.4_

- [x] 12. Implement Screen 4 — Zero-Filter HR Dashboard
  - [x] 12.1 Implement `CandidateCard`
    - Overall Urban-Fit Score as the largest text; Skill Match and Commuting Feasibility breakdowns each with a matching progress bar; scrollable `AI_Summary`; primary "นัดหมายสัมภาษณ์" button and destructive red "ปฏิเสธและส่งรายงานช่องว่างทักษะ" button with activation feedback; placeholder for any unavailable score
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

  - [x] 12.2 Implement `HRDashboardScreen` composition
    - Header title including candidate count and target role; no search/filter/sort controls; order candidates by Urban-Fit Score descending; one card per candidate equal to the title count; empty-state message when none; one card per row on mobile
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 14.3_

  - [ ]* 12.3 Write property test for HR card count
    - **Property 14: HR card count matches the shortlist**
    - **Validates: Requirements 12.3**

  - [ ]* 12.4 Write property test for HR ordering
    - **Property 15: HR candidates render in descending Urban-Fit-Score order**
    - **Validates: Requirements 12.4**

  - [ ]* 12.5 Write component tests for HR card contents and controls
    - Verify title, absence of filter controls, empty state, card contents, button styling, action callbacks, activation feedback, and missing-score placeholder
    - _Requirements: 12.1, 12.2, 12.5, 13.1, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9, 13.10_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration and wiring
  - [x] 14.1 Wire screens into the app shell with view-model providers
    - Connect all four routed screens to their view models through the `AppShell`, ensuring navigation, active-route indication, and per-screen state are integrated with no orphaned components
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 7.1, 12.1_

  - [ ]* 14.2 Write integration and smoke tests
    - Verify Leaflet map initialization with pin plotting and one-finger-pan disabling below 768px, web-font load with system-sans fallback path, and cross-screen navigation flows
    - _Requirements: 1.3, 5.1, 5.10, 14.6_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP.
- Each task references specific requirements for traceability; property test tasks additionally reference the design property they validate.
- Property-based tests use fast-check with Vitest (minimum 100 generated cases each) and target the pure logic layer and the data-driven rendering derived from it.
- Property tests are placed close to the code they validate so ordering/filtering/formatting/selection errors are caught early.
- Checkpoints ensure incremental validation before moving to the next screen.
- The pure logic layer (`src/domain/`) is framework-free and deterministic — the primary correctness surface.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.3", "2.5", "2.7", "2.9", "2.11", "2.13"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12", "2.14", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "7.1", "9.1", "9.2", "11.1", "12.1"] },
    { "id": 6, "tasks": ["5.4", "7.2", "7.3", "9.3", "9.5", "11.2", "11.3", "12.2"] },
    { "id": 7, "tasks": ["7.4", "7.5", "9.4", "9.6", "11.4", "11.5", "12.3", "12.4", "12.5"] },
    { "id": 8, "tasks": ["7.6", "7.7", "9.7"] },
    { "id": 9, "tasks": ["7.8", "7.9", "14.1"] },
    { "id": 10, "tasks": ["14.2"] }
  ]
}
```
