# UrbanFit UI Fixes Bugfix Design

## Overview

The UrbanFit Jobs frontend (React + TypeScript + Vite + Tailwind, Dark Mode, Thai-only) has a
cluster of UI defects spread across three regions: the global app shell, the Assessment screen,
and the Radar Chart screen. None of these are logic bugs in the domain layer — they are all
presentation/composition defects in the shell and screen components.

The fix approach is deliberately localized and additive:

- **Global shell** (`src/shell/AppShell.tsx`): pin the desktop side navigation to the viewport and
  mount a new floating POV-toggle widget fixed to the bottom-right corner.
- **Assessment** (`src/screens/assessment/AssessmentScreen.tsx`): introduce a challenge-selection
  phase that renders three challenge cards before the existing split coding view, and replace the
  plain `<textarea>` inside `CodeEditor.tsx` with a Monaco-style editor (syntax highlighting + line
  numbers).
- **Radar** (`src/screens/radar/RadarScreen.tsx` + `RadarChart.tsx`): move from a single stacked
  column to a two-column layout (chart left, explanations/summary/warning right), enlarge the chart
  to fill its column, extend from 4 to 6 axes, improve axis-label contrast/size, wrap scale numbers
  in semi-transparent dark pills, and remove the duplicate bottom legend so only the top legend
  remains.

The strategy keeps all existing domain logic, i18n strings, series data, timer/chat/context/code-cap
behavior, navigation destinations, and responsive mobile layouts intact. Every change is made under
two hard constraints: the UI stays in **Dark Mode** and all visible text stays strictly in **Thai**.

## Glossary

- **Bug_Condition (C)**: The condition that triggers a defect — a UI state `X` in which any of the
  ten observed layout/rendering defects (1.1–1.10) is present.
- **Property (P)**: The desired corrected behavior for a buggy UI state — the pinned sidebar, the
  POV widget, the challenge-selection-then-Monaco assessment flow, and the enlarged, readable,
  six-axis two-column radar with a single legend.
- **Preservation**: Existing behaviors that must remain byte-for-byte identical for non-buggy UI
  states — Dark Mode + Thai text, four nav destinations with active highlighting, mobile bottom
  nav, timer/chat/context/code-cap behavior, the three radar series, and the skill-gap advice alert.
- **AppShell**: The layout component in `src/shell/AppShell.tsx` that renders the product name, the
  desktop side `<nav>`, the mobile bottom `<nav>`, and the routed `<Outlet/>`.
- **POV widget**: A new floating control (bottom-right) that switches the app between
  "มุมมองผู้สมัคร" (Candidate POV) and "มุมมอง HR" (HR POV).
- **AssessmentScreen**: The Screen 2 composition in `src/screens/assessment/AssessmentScreen.tsx`
  that currently renders the timer top bar + a context/chat/code split immediately.
- **CodeEditor**: The controlled answer-code input in `src/screens/assessment/CodeEditor.tsx`,
  currently a plain `<textarea>` capped at `CODE_MAX_LENGTH` (20,000 chars).
- **RadarScreen / RadarChart**: The Screen 3 composition (`RadarScreen.tsx`) and the Chart.js radar
  (`RadarChart.tsx`) with its pure `buildRadarChartConfig` helper.
- **assessmentPhase**: The phase of the Assessment screen — `"selection"` (challenge cards) or
  `"coding"` (split coding view). Currently only the coding view exists.

## Bug Details

### Bug Condition

The bug manifests whenever a screen is rendered in a UI state where the shell chrome, the Assessment
flow, or the Radar report deviates from the intended design. The `AppShell`, `AssessmentScreen`,
`CodeEditor`, `RadarScreen`, and `RadarChart` components either omit required UI (POV widget,
challenge-selection view, extra radar axes), use the wrong composition (scrolling sidebar,
single-column radar, plain textarea), or render elements with poor readability (small/low-contrast
axis labels, scale numbers clashing with grid lines) or duplication (two radar legends).

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type UIState   // { screen, scrolled, sidebarPinned, povWidgetPresent,
                             //   assessmentPhase, challengeSelectionShown, challengeCards,
                             //   codeInputKind, radarLayout, radarFillsColumn,
                             //   radarAxisCount, axisLabelReadable, scaleLabelReadable,
                             //   legendCount }
  OUTPUT: boolean

  RETURN
    // Global layout
    (X.sidebarPinned = false)                                             // 1.1
    OR (X.povWidgetPresent = false)                                       // 1.2
    // Assessment
    OR (X.screen = "assessment" AND X.assessmentPhase = "coding"
        AND X.challengeSelectionShown = false)                            // 1.3
    OR (X.screen = "assessment" AND X.codeInputKind = "plain-textarea")   // 1.4
    // Radar
    OR (X.screen = "radar" AND X.radarLayout = "single-column")           // 1.5
    OR (X.screen = "radar" AND X.radarFillsColumn = false)                // 1.6
    OR (X.screen = "radar" AND X.radarAxisCount <> 6)                     // 1.7
    OR (X.screen = "radar" AND X.axisLabelReadable = false)               // 1.8
    OR (X.screen = "radar" AND X.scaleLabelReadable = false)              // 1.9
    OR (X.screen = "radar" AND X.legendCount > 1)                         // 1.10
END FUNCTION
```

### Examples

- **Sidebar scroll (1.1)**: On the Radar screen with content taller than the viewport, scrolling the
  page scrolls the `md:w-64` side `<nav>` out of view. *Expected*: the nav stays pinned to the
  viewport (`md:sticky md:top-0 md:h-screen`).
- **Missing POV widget (1.2)**: On any screen there is no control to switch between
  "มุมมองผู้สมัคร" and "มุมมอง HR". *Expected*: a floating toggle fixed to the bottom-right.
- **No challenge selection (1.3)**: Navigating to `/assessment` renders the timer + context/chat/code
  split immediately. *Expected*: a challenge-selection view with 3 cards is shown first.
- **Plain textarea (1.4)**: `CodeEditor` renders `<textarea data-testid="code-editor-textarea">`
  with no syntax highlighting or line numbers. *Expected*: a Monaco-style editor.
- **Single-column radar (1.5)**: `RadarScreen` uses `mx-auto ... max-w-3xl flex-col` so chart and
  advice stack. *Expected*: two-column (chart left, explanations right) on desktop.
- **Small chart (1.6)**: `RadarChart` wraps the canvas in `max-w-md`, leaving it small. *Expected*:
  the chart fills the left column.
- **Four axes (1.7)**: `defaultData.dimensions` is `["Data Cleaning","SQL","Python","Visualization"]`.
  *Expected*: 6 axes adding "Statistics" and "Business Logic".
- **Low-contrast axis labels (1.8)**: Chart.js default `pointLabels` are small/muted on the dark
  background. *Expected*: larger, light-gray/white labels.
- **Scale numbers clash (1.9)**: The `ticks` (20,40,60,80,100) render directly over grid lines.
  *Expected*: each wrapped in a semi-transparent dark pill (tick backdrop).
- **Duplicate legend (1.10)**: `RadarChart` shows the Chart.js top legend AND a DOM `<ul>` legend
  below. *Expected*: only the top legend remains.
- **Edge case**: At <768px the mobile bottom nav is shown and layouts stack — the sidebar-pinning
  and two-column radar changes must NOT alter this responsive behavior (preserved, see 3.3).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Dark Mode is retained and every visible string stays strictly in Thai (Req 3.1).
- The sidebar still shows the "UrbanFit Jobs" product name and all four destinations
  (งาน/แบบประเมิน, เรดาร์, HR) with correct active-route highlighting (Req 3.2).
- Below 768px the mobile bottom navigation and stacked layouts continue to render (Req 3.3).
- In the coding view, the prompt timer, chat interface, and context data table remain, and code
  entry, the 20,000-char cap, and submit/validation behavior are unchanged (Req 3.4).
- The radar still plots the Candidate, Company Requirement (dotted), and Market Average series with
  their existing colors on the 0–100 scale (Req 3.5).
- The skill-gap warning alert (with the "ค้นหาคอร์สอัปสกิล" CTA) and the no-gap confirmation still
  behave as before (Req 3.6).
- The timer still starts only once the coding view is entered (Req 3.7) — now gated behind the new
  challenge-selection phase.

**Scope:**
All UI states that do NOT satisfy any clause of `isBugCondition` must be completely unaffected by
this fix. This includes:
- The mobile (<768px) bottom-nav layout and stacked screen layouts.
- All domain logic and pure helpers (`buildRadarChartConfig`, `largestShortfall`, `resolveText`,
  ordering/formatting helpers) and the i18n string table entries that already exist.
- The Job Discovery and HR Dashboard screens, other than mounting the shared floating POV widget.

**Note:** The concrete corrected behavior is specified in the Correctness Properties section
(Property 1). This section enumerates what must NOT change.

## Hypothesized Root Cause

Based on the defect analysis and the current source, the causes are:

1. **Non-pinned sidebar (1.1)**: In `AppShell.tsx` the desktop `<nav>` is `hidden md:flex md:w-64
   md:shrink-0 ...` inside a `md:flex` row, but it has no sticky/fixed positioning and no
   `h-screen`, so it participates in normal document flow and scrolls with `<main>`.

2. **No POV concept exists (1.2)**: There is no POV state, context, or widget anywhere in the app.
   The shell renders only the two navs and the outlet, so nothing switches Candidate/HR viewpoints.

3. **Assessment has no selection phase (1.3)**: `AssessmentScreen` renders the timer top bar and the
   context/chat/code split unconditionally; there is no `assessmentPhase` state and no
   challenge-selection component.

4. **Plain textarea editor (1.4)**: `CodeEditor.tsx` renders a native `<textarea>`; there is no
   Monaco integration and `@monaco-editor/react` is not a dependency in `package.json`.

5. **Single-column radar composition (1.5, 1.6)**: `RadarScreen` uses a centered `max-w-3xl
   flex-col` column and `RadarChart` caps the canvas at `max-w-md aspect-square`, so the chart is
   small and everything stacks vertically.

6. **Chart config too limited (1.7–1.9)**: `defaultData.dimensions` lists only 4 skills; the
   Chart.js `options` set `scales.r.ticks.stepSize` but no `pointLabels` color/font and no tick
   `backdropColor`, so axis labels are low-contrast and scale numbers sit directly on the grid.

7. **Two legends rendered (1.10)**: `RadarChart` enables the Chart.js legend
   (`plugins.legend.display: true, position: "top"`) AND renders a separate DOM `<ul>` legend below
   the canvas — producing a visible duplicate.

## Correctness Properties

Property 1: Bug Condition - Corrected Shell, Assessment, and Radar UI

_For any_ UI state where the bug condition holds (isBugCondition returns true), the fixed components
SHALL render the corrected UI: the desktop sidebar stays pinned to the viewport; a floating POV
toggle for "มุมมองผู้สมัคร"/"มุมมอง HR" is present at the bottom-right; the Assessment screen shows a
challenge-selection view of exactly 3 cards before entering the coding view, whose code input is a
Monaco-style editor with syntax highlighting and line numbers; and the Radar screen uses a
two-column layout with the chart filling the left column, 6 hexagon axes ("Data Cleaning", "SQL",
"Python", "Visualization", "Statistics", "Business Logic"), larger light-gray/white axis labels,
scale numbers wrapped in semi-transparent dark pills, and exactly one (top) legend.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Unchanged Non-Buggy Behavior

_For any_ UI state where the bug condition does NOT hold (isBugCondition returns false), the fixed
code SHALL produce the same result as the original code, preserving Dark Mode and Thai-only text,
the product name and four nav destinations with active highlighting, the mobile bottom navigation
and stacked layouts, the timer/chat/context/code-cap and submit-validation behavior, the three radar
series (Candidate, Company Requirement dotted, Market Average) on the 0–100 scale, and the skill-gap
advice alert with its no-gap confirmation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root-cause analysis is correct:

**File**: `src/shell/AppShell.tsx`

**Function**: `AppShell`

1. **Pin the desktop sidebar (2.1)**: Add sticky positioning and full viewport height to the desktop
   `<nav>` — e.g. `md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto` — so it stays in
   place while `<main>` scrolls. Keep `hidden md:flex md:w-64 md:shrink-0` and all existing children
   (product name + four `NavItem`s) untouched (preserves 3.2).
2. **Mount the POV widget (2.2)**: Render a new `<PovToggle/>` once in the shell (outside both navs,
   inside the root container) so it appears on every screen.

**File**: `src/shell/PovToggle.tsx` (new) + `src/shell/pov-context.ts` (new)

3. **POV state + floating widget (2.2)**: Introduce a small POV state model (`"candidate" | "hr"`)
   held in a React context/provider mounted by `AppShell`, and a `PovToggle` component styled as a
   sleek toggle switch / FAB fixed to the bottom-right (`fixed bottom-... right-... z-...`). Labels
   use new i18n keys `povCandidate` → "มุมมองผู้สมัคร" and `povHr` → "มุมมอง HR" (Dark Mode + Thai,
   preserves 3.1). The widget sits above the mobile bottom nav (higher offset/z-index) so it never
   overlaps it (preserves 3.3).

**File**: `src/screens/assessment/AssessmentScreen.tsx`

**Function**: `AssessmentScreen`

4. **Add challenge-selection phase (2.3)**: Add `assessmentPhase` state initialized to `"selection"`.
   In the selection phase render a new `ChallengeSelection` component with 3 challenge cards, each
   showing Title, Description, Required Skills, and Difficulty:
   - Card 1 — "วิเคราะห์ข้อมูลฝุ่น PM 2.5" / "ทำความสะอาดและหาค่าเฉลี่ยฝุ่น PM 2.5 จาก API ของ กทม." /
     "Python, Pandas" / "ปานกลาง".
   - Card 2 — "ปรับปรุง Query ฐานข้อมูล" / "ลดเวลาการดึงข้อมูลการจราจรจากฐานข้อมูลที่มีขนาดใหญ่" /
     "SQL, Database Optimization" / "ยาก".
   - Card 3 — "สร้าง Dashboard สรุปยอด" / "สรุปข้อมูลการเดินทางของพนักงานในรูปแบบที่เข้าใจง่าย" /
     "Data Visualization" / "ง่าย".
   Clicking a card sets phase to `"coding"` and renders the EXISTING split (timer top bar +
   `ContextDataTable` + `ChatInterface` + `CodeEditor`) unchanged (preserves 3.4). The timer starts
   only when the coding view is entered (preserves 3.7). New card strings go in the i18n table (Thai).

**File**: `src/screens/assessment/ChallengeSelection.tsx` (new) + `ChallengeCard.tsx` (new)

5. **Challenge cards (2.3)**: New presentational components rendering the three cards in Dark Mode
   with Thai text, exposing a stable `data-testid` and an `onSelect` callback.

**File**: `src/screens/assessment/CodeEditor.tsx`

**Function**: `CodeEditor`

6. **Monaco-style editor (2.4)**: Replace the `<textarea>` with `@monaco-editor/react` (added to
   `package.json`) configured for a dark theme with line numbers and syntax highlighting; OR, if the
   dependency/test environment is constrained, a lightweight Monaco-style component that renders a
   gutter with line numbers and token-colored code over a dark surface. Preserve the controlled
   `value`/`onChange` contract, the `CODE_MAX_LENGTH` (20,000) cap applied via `capCode`, the
   empty/whitespace submit rejection with the `role="alert"` required indication, and the submit
   button behavior (preserves 3.4). Under jsdom the editor must degrade gracefully (guarded like the
   Chart.js canvas) so tests never crash.

**File**: `src/screens/radar/RadarScreen.tsx`

**Function**: `RadarScreen`

7. **Two-column layout (2.5, 2.6)**: Replace the single `max-w-3xl flex-col` column with a
   responsive two-column layout at `md:` (e.g. `md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]`
   or `md:flex md:flex-row`): the `RadarChart` in the LEFT column sized to fill it, and the header
   text, explanations/summary, and the `AdviceAlert` warning box in the RIGHT column. Below 768px it
   collapses back to a single stacked column (preserves 3.3). The existing `AdviceAlert` wiring
   (candidate vs market) is unchanged (preserves 3.6).

**File**: `src/screens/radar/RadarChart.tsx`

**Functions**: `buildRadarChartConfig`, `RadarChart`

8. **Fill the column (2.6)**: Remove the `max-w-md` cap on the canvas wrapper so the chart grows to
   fill the left column (keep `aspect-square` or switch to a column-filling size), retaining
   `maintainAspectRatio: false`.
9. **Six axes (2.7)**: Extend `defaultData.dimensions` to the six-axis hexagon
   `["Data Cleaning","SQL","Python","Visualization","Statistics","Business Logic"]` and add
   corresponding values for the candidate/requirement/market series. `buildRadarChartConfig` already
   maps over `dimensions` and clamps values, so it needs no structural change (preserves 3.5).
10. **Readable axis labels (2.8)**: Add Chart.js `scales.r.pointLabels` options — a larger
    `font.size` and a light-gray/white `color` — for contrast on the dark background.
11. **Scale-number pills (2.9)**: Add `scales.r.ticks.backdropColor` (semi-transparent dark),
    `backdropPadding`, and `showLabelBackdrop: true` so each of 20/40/60/80/100 renders inside a
    dark pill; keep `stepSize: 20` and the 0–100 min/max (preserves 3.5).
12. **Single legend (2.10)**: Keep the Chart.js top legend (`plugins.legend.display: true, position:
    "top"`) and REMOVE the duplicate DOM `<ul data-testid="radar-legend">` block. Preserve the
    omitted-series `role="status"` message so unavailable series are still reported.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
each defect on the UNFIXED code, then verify the fix produces the corrected behavior and preserves
existing behavior. Because these are presentation/composition defects, tests assert on rendered DOM
structure, `data-testid` presence, class/positioning intent, and the pure `buildRadarChartConfig`
output, using the existing Vitest + Testing Library + jsdom setup and fast-check for property tests.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each defect BEFORE implementing the fix. Confirm
or refute the root-cause analysis. If refuted, re-hypothesize.

**Test Plan**: Render each affected component/screen and assert the corrected expectation; run
against the UNFIXED code to observe the failures documented below.

**Test Cases**:
1. **Sidebar pinning (2.1)**: Render `AppShell`; assert the desktop `<nav>` carries sticky/full-height
   positioning classes (will fail on unfixed code — nav is only `md:w-64`).
2. **POV widget present (2.2)**: Render the shell; assert a bottom-right POV toggle with
   "มุมมองผู้สมัคร"/"มุมมอง HR" exists (will fail — no such element).
3. **Challenge selection first (2.3)**: Render `AssessmentScreen`; assert 3 challenge cards render
   and the coding split is hidden until a card is clicked (will fail — split renders immediately).
4. **Monaco editor (2.4)**: Render the coding view; assert a Monaco-style editor (line numbers /
   editor container) rather than the plain textarea (will fail — `<textarea>` present).
5. **Two-column radar (2.5)**: Render `RadarScreen`; assert a two-column desktop layout with chart
   left and advice right (will fail — single `flex-col` column).
6. **Six axes (2.7)**: Call `buildRadarChartConfig(defaultData)`; assert `labels.length === 6`
   including "Statistics" and "Business Logic" (will fail — 4 labels).
7. **Single legend (2.10)**: Render `RadarChart`; assert exactly one legend region (will fail —
   both the Chart.js legend and the DOM `<ul>` exist).
8. **Edge case — axis label / scale styling (2.8, 2.9)**: Inspect the built Chart.js options for
   `pointLabels` color/size and `ticks` backdrop settings (will fail — options absent).

**Expected Counterexamples**:
- The desktop nav lacks sticky/`h-screen` classes; no POV widget in the tree; the assessment split
  renders with no preceding selection view; `code-editor-textarea` is present; `RadarScreen` is a
  single column; `buildRadarChartConfig` returns 4 labels; two legend nodes are found.
- Possible causes: missing positioning classes, missing components/state, four-item `dimensions`,
  and dual legend rendering — matching the Hypothesized Root Cause.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed components produce the
expected corrected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := renderFixed(X)
  ASSERT
    result.sidebarPinned = true
    AND result.povWidgetPresent = true AND result.povWidgetPosition = "bottom-right"
    AND (X.screen = "assessment" IMPLIES
          (challengeSelectionPrecedesCoding(result)
           AND result.challengeCards = 3
           AND result.codeInputKind = "monaco"))
    AND (X.screen = "radar" IMPLIES
          (result.radarLayout = "two-column"
           AND result.radarFillsColumn = true
           AND result.radarAxisCount = 6
           AND result.axisLabelReadable = true
           AND result.scaleLabelReadable = true
           AND result.legendCount = 1))
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces
the same result as the original code.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderOriginal(X) = renderFixed(X)
  // Dark Mode + Thai text, four nav destinations + active highlighting,
  // mobile bottom nav + stacked layouts, timer/chat/context/code-cap + submit
  // validation, the three radar series on the 0-100 scale, and the advice
  // alert / no-gap confirmation all remain identical (Req 3.1-3.7).
END FOR
```

**Testing Approach**: Property-based testing (fast-check) is recommended for preservation checking
because:
- It generates many inputs across the domain (varied radar `RadarData`, candidate/benchmark maps,
  code strings including at/over the 20,000-char cap, and varied active routes).
- It catches edge cases manual unit tests miss (e.g. missing dimension values, whitespace-only code).
- It gives strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on the UNFIXED code for the preserved concerns, then write tests that
lock that behavior in after the fix.

**Test Cases**:
1. **Dark Mode + Thai (3.1)**: Assert rendered strings resolve to Thai and dark surface classes
   remain across shell and screens.
2. **Nav destinations + active highlight (3.2)**: Assert the four `NavItem`s render with the product
   name and exactly one active entry (`aria-current="page"`) for a given route.
3. **Mobile layout (3.3)**: Assert the mobile bottom nav and stacked layouts still render below
   768px and are not disturbed by the pinned sidebar / two-column radar changes.
4. **Timer/chat/context/code cap (3.4)**: Property test `capCode` and submit-validation — code over
   20,000 chars is truncated, whitespace-only submit is rejected with the `role="alert"` indication,
   and valid submit delegates — identical before and after.
5. **Radar series (3.5)**: Property test `buildRadarChartConfig` — Candidate/Requirement(dotted)/
   Market colors, dashed requirement, clamped 0–100 values, and null-series omission are unchanged.
6. **Advice alert (3.6)**: Assert the skill-gap warning with the "ค้นหาคอร์สอัปสกิล" CTA and the
   no-gap confirmation behave identically for gap and no-gap inputs.
7. **Timer start gating (3.7)**: Assert the timer starts only upon entering the coding view.

### Unit Tests

- AppShell: desktop sidebar carries sticky/`h-screen` classes; POV widget mounts once at bottom-right;
  four destinations and product name unchanged.
- PovToggle: switches between "มุมมองผู้สมัคร" and "มุมมอง HR"; is keyboard-accessible; does not
  overlap the mobile bottom nav.
- AssessmentScreen/ChallengeSelection: renders 3 cards with correct Thai Title/Description/Skills/
  Difficulty; selecting a card reveals the coding split; timer starts on entry.
- CodeEditor: Monaco-style editor renders with line numbers; controlled value/onChange, cap, and
  submit-validation preserved; degrades safely under jsdom.
- RadarChart: `buildRadarChartConfig` returns 6 labels; options include `pointLabels` color/size and
  tick backdrop; exactly one legend region.

### Property-Based Tests

- Generate random `RadarData` (varied dimensions/series/nulls) and assert `buildRadarChartConfig`
  preserves series colors, dashing, clamping, and omission (preservation of 3.5).
- Generate random code strings (including > 20,000 chars and whitespace-only) and assert `capCode`
  and submit-validation behavior is unchanged (preservation of 3.4).
- Generate random active routes and assert exactly one nav destination is highlighted (preservation
  of 3.2).

### Integration Tests

- Full assessment flow: navigate to `/assessment`, see 3 challenge cards, select one, land in the
  coding split with timer/chat/context/Monaco editor working.
- Full radar flow: navigate to `/radar`, see the two-column layout with a full-size six-axis chart,
  readable labels, pill-wrapped scale numbers, a single legend, and the advice alert on the right.
- Shell behavior: scroll a tall screen and confirm the sidebar stays pinned; toggle POV via the
  floating widget; confirm the mobile bottom nav still appears below 768px.
