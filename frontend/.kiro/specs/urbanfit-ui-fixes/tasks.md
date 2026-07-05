# Implementation Plan

## Overview

This plan follows the exploratory bugfix workflow for the UrbanFit UI fixes spec. Exploration tests
(Property 1: Bug Condition) and preservation tests (Property 2: Preservation) are written and run
against the UNFIXED code first, then the fix is applied across the shell, Assessment, and Radar
components, and finally both test sets are re-run to confirm the defects are resolved without
regressions.

## Tasks

- [x] 1. Write bug condition exploration tests (BEFORE implementing the fix)
  - **Property 1: Bug Condition** - Corrected Shell, Assessment, and Radar UI
  - **CRITICAL**: These tests MUST FAIL on the unfixed code - failure confirms the defects exist
  - **DO NOT attempt to fix the tests or the code when they fail** at this stage
  - **NOTE**: These tests encode the expected corrected behavior - they will validate the fix once they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate defects 1.1-1.10 exist on the current UI
  - **Scoped PBT Approach**: These are deterministic, per-region defects; scope each property to the concrete failing UI state (specific screen + component render) for reproducibility, using the existing Vitest + Testing Library + jsdom + fast-check setup
  - Encode the Bug Condition from design (`isBugCondition(X)` over `UIState`):
    - Render `AppShell`; assert the desktop `<nav>` carries sticky/full-height (`md:sticky md:top-0 md:h-screen`) positioning classes (1.1) - expect FAIL (nav is only `md:w-64`)
    - Render the shell; assert a bottom-right floating POV toggle with "มุมมองผู้สมัคร"/"มุมมอง HR" exists (1.2) - expect FAIL (no such element)
    - Render `AssessmentScreen`; assert 3 challenge cards render and the coding split is hidden until a card is clicked (1.3) - expect FAIL (split renders immediately)
    - Render the coding view; assert a Monaco-style editor (line numbers / editor container) instead of `code-editor-textarea` (1.4) - expect FAIL (`<textarea>` present)
    - Render `RadarScreen`; assert a two-column desktop layout with chart left and advice right (1.5) and the chart filling its column (1.6) - expect FAIL (single `flex-col`, `max-w-md` cap)
    - Call `buildRadarChartConfig(defaultData)`; assert `labels.length === 6` including "Statistics" and "Business Logic" (1.7) - expect FAIL (4 labels)
    - Inspect built Chart.js options for `pointLabels` color/size (1.8) and `ticks` backdrop settings (1.9) - expect FAIL (options absent)
    - Render `RadarChart`; assert exactly one legend region (1.10) - expect FAIL (Chart.js legend AND DOM `<ul data-testid="radar-legend">` both present)
  - The test assertions match the Expected Behavior in Property 1 of the design
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the defects exist)
  - Document counterexamples found (e.g. "nav lacks sticky/h-screen classes", "no POV widget in tree", "assessment split renders with no preceding selection view", "code-editor-textarea present", "RadarScreen is a single column", "buildRadarChartConfig returns 4 labels", "two legend nodes found")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Write preservation property tests (BEFORE implementing the fix)
  - **Property 2: Preservation** - Unchanged Non-Buggy Behavior
  - **IMPORTANT**: Follow the observation-first methodology - run the UNFIXED code for non-buggy UI states (cases where `isBugCondition` returns false), record actual outputs, then write property-based tests asserting those observed outputs across the input domain
  - Property-based testing (fast-check) is recommended for stronger preservation guarantees across generated inputs
  - Observe and lock in the preserved behaviors from the Preservation Requirements in design:
    - Dark Mode + Thai text: assert rendered strings resolve to Thai and dark surface classes remain across shell and screens (3.1)
    - Nav destinations + active highlight: assert the four `NavItem`s render with the "UrbanFit Jobs" product name and exactly one active entry (`aria-current="page"`) per route (3.2)
    - Mobile layout: assert the mobile bottom nav and stacked layouts still render below 768px, undisturbed by the pinned-sidebar / two-column-radar changes (3.3)
    - Timer/chat/context/code cap: property test `capCode` (code > 20,000 chars is truncated) and submit-validation (whitespace-only submit rejected with `role="alert"` indication, valid submit delegates) - identical before and after (3.4)
    - Radar series: property test `buildRadarChartConfig` over random `RadarData` - Candidate/Requirement(dotted)/Market colors, dashed requirement, clamped 0-100 values, and null-series omission unchanged (3.5)
    - Advice alert: assert the skill-gap warning with the "ค้นหาคอร์สอัปสกิล" CTA and the no-gap confirmation behave identically for gap and no-gap inputs (3.6)
    - Timer start gating: assert the timer starts only upon entering the coding view (3.7)
  - Generate random inputs where useful: varied `RadarData`, candidate/benchmark maps, code strings (including at/over the 20,000-char cap and whitespace-only), and varied active routes
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix the UrbanFit UI defects across shell, Assessment, and Radar

  - [x] 3.1 Pin the desktop sidebar and mount the POV widget in the shell
    - In `src/shell/AppShell.tsx`, add `md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto` to the desktop `<nav>` so it stays pinned while `<main>` scrolls; keep `hidden md:flex md:w-64 md:shrink-0` and the product name + four `NavItem`s untouched
    - Create `src/shell/pov-context.ts` with a POV state model (`"candidate" | "hr"`) in a React context/provider mounted by `AppShell`
    - Create `src/shell/PovToggle.tsx` styled as a sleek toggle switch / FAB fixed to the bottom-right (`fixed bottom-... right-... z-...`), above the mobile bottom nav so it never overlaps; labels use new i18n keys `povCandidate` → "มุมมองผู้สมัคร" and `povHr` → "มุมมอง HR"
    - Render `<PovToggle/>` once in the shell (outside both navs, inside the root container) so it appears on every screen
    - _Bug_Condition: isBugCondition(X) where X.sidebarPinned = false (1.1) OR X.povWidgetPresent = false (1.2)_
    - _Expected_Behavior: result.sidebarPinned = true AND result.povWidgetPresent = true AND result.povWidgetPosition = "bottom-right" (Property 1 from design)_
    - _Preservation: product name + four nav destinations with active highlighting (3.2), Dark Mode + Thai (3.1), mobile bottom nav (3.3)_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add the challenge-selection phase and Monaco-style editor to the Assessment screen
    - In `src/screens/assessment/AssessmentScreen.tsx`, add `assessmentPhase` state initialized to `"selection"`; render a new `ChallengeSelection` before the existing split, and switch to `"coding"` on card click (rendering the EXISTING timer + `ContextDataTable` + `ChatInterface` + `CodeEditor` split unchanged)
    - Create `src/screens/assessment/ChallengeSelection.tsx` + `src/screens/assessment/ChallengeCard.tsx` rendering 3 cards in Dark Mode with Thai Title/Description/Required Skills/Difficulty, a stable `data-testid`, and an `onSelect` callback:
      - Card 1 — "วิเคราะห์ข้อมูลฝุ่น PM 2.5" / "ทำความสะอาดและหาค่าเฉลี่ยฝุ่น PM 2.5 จาก API ของ กทม." / "Python, Pandas" / "ปานกลาง"
      - Card 2 — "ปรับปรุง Query ฐานข้อมูล" / "ลดเวลาการดึงข้อมูลการจราจรจากฐานข้อมูลที่มีขนาดใหญ่" / "SQL, Database Optimization" / "ยาก"
      - Card 3 — "สร้าง Dashboard สรุปยอด" / "สรุปข้อมูลการเดินทางของพนักงานในรูปแบบที่เข้าใจง่าย" / "Data Visualization" / "ง่าย"
    - Add the new card strings to the i18n table (Thai)
    - In `src/screens/assessment/CodeEditor.tsx`, replace the `<textarea>` with `@monaco-editor/react` (added to `package.json`) configured for a dark theme with line numbers and syntax highlighting, OR a lightweight Monaco-style component (gutter with line numbers + token-colored code over a dark surface) if the dependency/test environment is constrained; degrade gracefully under jsdom (guarded like the Chart.js canvas)
    - Preserve the controlled `value`/`onChange` contract, the `CODE_MAX_LENGTH` (20,000) cap via `capCode`, the empty/whitespace submit rejection with `role="alert"`, and the submit button behavior
    - _Bug_Condition: isBugCondition(X) where X.screen = "assessment" AND X.assessmentPhase = "coding" AND X.challengeSelectionShown = false (1.3) OR X.screen = "assessment" AND X.codeInputKind = "plain-textarea" (1.4)_
    - _Expected_Behavior: X.screen = "assessment" IMPLIES (challengeSelectionPrecedesCoding(result) AND result.challengeCards = 3 AND result.codeInputKind = "monaco") (Property 1 from design)_
    - _Preservation: timer/chat/context/code-cap and submit-validation unchanged (3.4), timer starts only on entering coding view (3.7), Dark Mode + Thai (3.1)_
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Rework the Radar screen into a readable two-column, six-axis report
    - In `src/screens/radar/RadarScreen.tsx`, replace the single `max-w-3xl flex-col` column with a responsive two-column layout at `md:` (e.g. `md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]` or `md:flex md:flex-row`): `RadarChart` in the LEFT column sized to fill it; header text, explanations/summary, and the `AdviceAlert` in the RIGHT column; collapse to a single stacked column below 768px
    - In `src/screens/radar/RadarChart.tsx`, remove the `max-w-md` cap on the canvas wrapper so the chart fills the left column (keep `aspect-square` or a column-filling size), retaining `maintainAspectRatio: false`
    - Extend `defaultData.dimensions` to the six-axis hexagon `["Data Cleaning","SQL","Python","Visualization","Statistics","Business Logic"]` and add corresponding candidate/requirement/market values (`buildRadarChartConfig` already maps over `dimensions` and clamps values)
    - Add Chart.js `scales.r.pointLabels` options — larger `font.size` and light-gray/white `color` — for readable contrast on the dark background
    - Add `scales.r.ticks.backdropColor` (semi-transparent dark), `backdropPadding`, and `showLabelBackdrop: true` so 20/40/60/80/100 render inside dark pills; keep `stepSize: 20` and the 0-100 min/max
    - Keep the Chart.js top legend (`plugins.legend.display: true, position: "top"`) and REMOVE the duplicate DOM `<ul data-testid="radar-legend">` block; preserve the omitted-series `role="status"` message
    - _Bug_Condition: isBugCondition(X) where X.screen = "radar" AND (radarLayout = "single-column" (1.5) OR radarFillsColumn = false (1.6) OR radarAxisCount <> 6 (1.7) OR axisLabelReadable = false (1.8) OR scaleLabelReadable = false (1.9) OR legendCount > 1 (1.10))_
    - _Expected_Behavior: X.screen = "radar" IMPLIES (result.radarLayout = "two-column" AND result.radarFillsColumn = true AND result.radarAxisCount = 6 AND result.axisLabelReadable = true AND result.scaleLabelReadable = true AND result.legendCount = 1) (Property 1 from design)_
    - _Preservation: three radar series (Candidate, Requirement dotted, Market) on 0-100 scale unchanged (3.5), advice alert + no-gap confirmation (3.6), mobile stacked layout (3.3)_
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.4 Verify the bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Corrected Shell, Assessment, and Radar UI
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected corrected behavior; when they pass, they confirm the defects (1.1-1.10) are resolved
    - Run the bug condition exploration tests from task 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms the defects are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.5 Verify the preservation property tests still pass
    - **Property 2: Preservation** - Unchanged Non-Buggy Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run the preservation property tests from task 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after the fix (no regressions) for Dark Mode + Thai, nav destinations + active highlight, mobile layout, timer/chat/context/code-cap, radar series, advice alert, and timer start gating
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite and ensure all unit, property-based, and integration tests pass
  - Confirm the exploration tests (Property 1) pass and the preservation tests (Property 2) still pass
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Write and run exploration tests (must FAIL) and preservation tests (must PASS) against the unfixed code."
    },
    {
      "wave": 2,
      "tasks": ["3.1", "3.2", "3.3"],
      "description": "Apply the fix across shell, Assessment, and Radar. Independent of each other.",
      "dependsOn": ["1", "2"]
    },
    {
      "wave": 3,
      "tasks": ["3.4", "3.5"],
      "description": "Re-run exploration tests (now PASS) and preservation tests (still PASS).",
      "dependsOn": ["3.1", "3.2", "3.3"]
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "description": "Checkpoint - ensure the full test suite passes.",
      "dependsOn": ["3.4", "3.5"]
    }
  ]
}
```

```
Task 1 (Bug Condition exploration tests — must FAIL on unfixed code)
Task 2 (Preservation tests — must PASS on unfixed code)
   │  (both written and run before any fix)
   ▼
Task 3 (Apply the fix)
   ├─ 3.1 Pin sidebar + mount POV widget
   ├─ 3.2 Challenge-selection phase + Monaco editor
   ├─ 3.3 Two-column, six-axis, readable Radar
   ├─ 3.4 Verify Task 1 exploration tests now PASS  (depends on 3.1, 3.2, 3.3)
   └─ 3.5 Verify Task 2 preservation tests still PASS (depends on 3.1, 3.2, 3.3)
   ▼
Task 4 (Checkpoint — all tests pass; depends on Task 3)
```

- Tasks 1 and 2 are independent of each other but MUST both precede Task 3.
- Sub-tasks 3.1, 3.2, and 3.3 are independent and can be done in any order.
- Sub-tasks 3.4 and 3.5 depend on 3.1-3.3 being complete.
- Task 4 depends on all of Task 3.

## Notes

- **Property format**: Property 1 covers the Bug Condition (exploration test, task 1) and its
  post-fix validation (task 3.4). Property 2 covers Preservation (tasks 2 and 3.5). The
  `**Property N:**` headings enable hover status tracking.
- **Test-first discipline**: Do NOT fix code while task 1 tests fail — that failure is the expected
  signal that the defects exist. Only tasks 3.x apply the actual fix.
- **Hard constraints**: Every change keeps the UI in Dark Mode and all visible text strictly in Thai.
- **Environment**: Use the existing Vitest + Testing Library + jsdom + fast-check setup. Run tests
  with a single-run flag (e.g. `vitest --run`) rather than watch mode.
- **Monaco fallback**: If `@monaco-editor/react` is constrained under jsdom, use a lightweight
  Monaco-style component and ensure it degrades gracefully so tests never crash.
