# Bugfix Requirements Document

## Introduction

The UrbanFit Jobs frontend (React + TypeScript + Vite + Tailwind, Dark Mode, Thai-only UI) has a set of UI defects across the global layout, the Assessment screen, and the Radar Chart screen. The sidebar scrolls away instead of staying pinned, there is no way to switch between the Candidate and HR points of view, the Assessment screen jumps straight into a plain-textarea coding view with no challenge selection, and the Radar screen is cramped into a single column with too few axes and hard-to-read labels.

This document captures each defect as an incorrect current behavior, the expected corrected behavior, and the surrounding behavior that must be preserved so no regressions are introduced. All fixes MUST keep the design in Dark Mode and all UI text strictly in Thai.

## Bug Analysis

### Current Behavior (Defect)

Global Layout & General Features:

1.1 WHEN the user scrolls a screen with content taller than the viewport THEN the system scrolls the left sidebar navigation away with the page instead of keeping it pinned.
1.2 WHEN any screen is displayed THEN the system provides no floating widget to switch between "มุมมองผู้สมัคร" (Candidate POV) and "มุมมอง HR" (HR POV).

Assessment Screen (หน้าแบบประเมินทักษะ):

1.3 WHEN the user opens the Assessment screen THEN the system shows the coding assessment interface immediately with no pre-assessment challenge-selection view.
1.4 WHEN the user reaches the coding view THEN the system renders the code input as a plain `<textarea>` with no syntax highlighting and no line numbers.

Radar Chart Screen (เรดาร์ทักษะ):

1.5 WHEN the Radar screen is displayed THEN the system arranges the chart and its explanations/summary/warning alert in a single vertically stacked column.
1.6 WHEN the Radar chart is rendered THEN the system displays it at a small size that leaves the chart looking empty and does not fill the available space.
1.7 WHEN the Radar chart is rendered THEN the system draws only 4 axes ("Data Cleaning", "SQL", "Python", "Visualization").
1.8 WHEN the Radar chart axis labels are rendered THEN the system displays them in a small, low-contrast font that is hard to read on the dark background.
1.9 WHEN the Radar chart scale numbers (20, 40, 60, 80, 100) are rendered THEN the system draws them directly over the chart grid lines so they clash and are hard to read.
1.10 WHEN the Radar screen is displayed THEN the system renders a duplicate legend at the bottom in addition to the top legend.

### Expected Behavior (Correct)

Global Layout & General Features:

2.1 WHEN the user scrolls a screen with content taller than the viewport THEN the system SHALL keep the left sidebar navigation fixed to the viewport (e.g. `position: sticky`/`fixed` with `h-screen`) so it stays in place.
2.2 WHEN any screen is displayed THEN the system SHALL show a floating widget fixed to the bottom-right corner, styled as a sleek toggle switch or floating action button, that switches between "มุมมองผู้สมัคร" (Candidate POV) and "มุมมอง HR" (HR POV).

Assessment Screen (หน้าแบบประเมินทักษะ):

2.3 WHEN the user opens the Assessment screen THEN the system SHALL first show a challenge-selection view containing 3 challenge cards, each with a Title, Description, Required Skills, and Difficulty:
  - Card 1: Title "วิเคราะห์ข้อมูลฝุ่น PM 2.5", Description "ทำความสะอาดและหาค่าเฉลี่ยฝุ่น PM 2.5 จาก API ของ กทม.", Skills "Python, Pandas", Difficulty "ปานกลาง".
  - Card 2: Title "ปรับปรุง Query ฐานข้อมูล", Description "ลดเวลาการดึงข้อมูลการจราจรจากฐานข้อมูลที่มีขนาดใหญ่", Skills "SQL, Database Optimization", Difficulty "ยาก".
  - Card 3: Title "สร้าง Dashboard สรุปยอด", Description "สรุปข้อมูลการเดินทางของพนักงานในรูปแบบที่เข้าใจง่าย", Skills "Data Visualization", Difficulty "ง่าย".
2.4 WHEN the user clicks a challenge card THEN the system SHALL show the split-screen assessment coding view and render the code input using `@monaco-editor/react` (or a component visually mocking Monaco with syntax highlighting and line numbers) instead of a plain `<textarea>`.

Radar Chart Screen (เรดาร์ทักษะ):

2.5 WHEN the Radar screen is displayed THEN the system SHALL use a balanced two-column layout with the Radar chart in the left column (main space) and all explanations, summaries, and the warning alert box in the right column.
2.6 WHEN the Radar chart is rendered THEN the system SHALL increase its overall size/radius so it fills the left column.
2.7 WHEN the Radar chart is rendered THEN the system SHALL draw 6 axes forming a hexagon: "Data Cleaning", "SQL", "Python", "Visualization", "Statistics", "Business Logic".
2.8 WHEN the Radar chart axis labels are rendered THEN the system SHALL display them at a larger font size in light gray or white for readable contrast on the dark background.
2.9 WHEN the Radar chart scale numbers (20, 40, 60, 80, 100) are rendered THEN the system SHALL wrap each in a small semi-transparent dark background pill so they are readable over the chart lines.
2.10 WHEN the Radar screen is displayed THEN the system SHALL render only the top legend (Candidate, Company Requirement, Market Average) and remove the duplicate bottom legend.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any screen is rendered THEN the system SHALL CONTINUE TO present the UI in Dark Mode with all text strictly in Thai.
3.2 WHEN the sidebar navigation is displayed THEN the system SHALL CONTINUE TO show the "UrbanFit Jobs" product name and all four destinations (งาน, แบบประเมิน, เรดาร์, HR) with correct active-route highlighting.
3.3 WHEN the viewport is below the desktop breakpoint (<768px) THEN the system SHALL CONTINUE TO show the mobile bottom navigation and stacked layouts.
3.4 WHEN the user is in the coding assessment view THEN the system SHALL CONTINUE TO show the prompt timer, chat interface, and context data table, and preserve code entry, the character cap, and submit/validation behavior.
3.5 WHEN the Radar chart plots its series THEN the system SHALL CONTINUE TO render the Candidate, Company Requirement (dotted), and Market Average series with their existing colors and 0–100 scale.
3.6 WHEN the candidate falls below a benchmark on the Radar screen THEN the system SHALL CONTINUE TO show the skill-gap warning alert with the "ค้นหาคอร์สอัปสกิล" call to action, and show the no-gap confirmation when there is no shortfall.
3.7 WHEN a challenge has not yet been selected on the Assessment screen THEN the system SHALL CONTINUE TO respect the timer starting behavior only once the coding view is entered.

## Bug Condition Derivation

The defects span multiple UI regions. Each is expressed as a bug condition `C(X)` over a UI-state input `X`, with a property `P` describing the corrected behavior. `F` is the current (unfixed) UI and `F'` is the fixed UI.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UIState   // { screen, scrolled, povWidgetPresent, assessmentPhase,
                             //   codeInputKind, radarLayout, radarAxisCount,
                             //   axisLabelReadable, scaleLabelReadable, legendCount }
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

```pascal
// Property: Fix Checking — corrected behavior for all buggy UI states
FOR ALL X WHERE isBugCondition(X) DO
  result ← F'(X)
  ASSERT
    result.sidebarPinned = true
    AND result.povWidgetPresent = true AND result.povWidgetPosition = "bottom-right"
    AND (result.screen = "assessment" IMPLIES
          (challengeSelectionPrecedesCoding(result)
           AND result.challengeCards = 3
           AND result.codeInputKind = "monaco"))
    AND (result.screen = "radar" IMPLIES
          (result.radarLayout = "two-column"
           AND result.radarFillsColumn = true
           AND result.radarAxisCount = 6
           AND result.axisLabelReadable = true
           AND result.scaleLabelReadable = true
           AND result.legendCount = 1))
END FOR
```

```pascal
// Property: Preservation Checking — non-buggy behavior is unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
  // Dark Mode + Thai text, four nav destinations, mobile bottom nav,
  // timer/chat/context/code-cap behavior, existing radar series & advice alert
  // all remain identical (Req 3.1–3.7).
END FOR
```
