# Requirements Document

## Introduction

This feature refactors the existing Job Discovery screen (Screen 1 of UrbanFit Jobs) to strictly enforce the "20-Minute City" hyper-local concept, transitioning it from a list-heavy layout to a Map-First interface. The map becomes the dominant region (approximately 65% of screen width) and the job list becomes a narrower supporting panel (approximately 35% width) whose cards are re-engineered to prioritize commute metrics over job titles.

The refactor introduces four coordinated behaviors:

1. A restated header that frames the screen around finding jobs reachable within 20 minutes, with the commute-tolerance slider defaulting to a 20-minute target that carries a mint-green neon accent.
2. Restructured job cards that lead with commute time and per-trip cost, show a visual transit chain (walk / BTS / MRT), demote the job title and company to supporting text, and replace the single unified fit ring with two distinct pill badges (Commute Fit and Skill Fit).
3. A map-first right panel with a mint-green isochrone overlay radiating from the candidate's home location, an on-map boundary label, and job pins filtered to only those inside the 20-minute boundary.
4. Real-time viewport syncing so panning, dragging, or zooming the map re-filters the job list to only the jobs currently visible within the map's bounds.

All visible UI text SHALL be rendered in Thai. The refactor preserves the existing dark-theme aesthetic (dark background, mint-green #4edea3 primary accent, muted gray secondary text) and the existing Thai-first i18n mechanism (Thai string with a guaranteed non-empty default fallback).

Scope note: This specification addresses only frontend rendering and interaction behavior. Job data, commute times, transit chains, per-trip costs, fit scores, and location coordinates are supplied to the frontend as view models. Backend scoring, real routing/isochrone computation, and persistence are out of scope. Where a requirement references an isochrone boundary or a fit score, it refers to rendering and reacting to values already provided to or derived on the frontend from provided inputs.

## Glossary

- **Frontend**: The client-side web application; this spec concerns only the Job_Discovery_Screen.
- **Design_System**: The shared dark-mode color tokens, typography (Be Vietnam Pro), iconography (Material Symbols Outlined), spacing, and radius tokens.
- **Job_Discovery_Screen**: Screen 1, refactored into a Map-First interface with a left Job_List panel and a right Transit_Map panel.
- **Discovery_Header**: The header region containing the main title, subtitle, and Tolerance_Slider.
- **Tolerance_Slider**: The control that sets the maximum acceptable commuting time in minutes.
- **Tolerance_Target_Indicator**: The visual marker on the Tolerance_Slider representing the currently selected maximum commuting time.
- **Job_List**: The left panel collection of Job_Cards, occupying approximately 35% of the screen width at desktop size.
- **Job_Card**: A card in the Job_List, restructured into a Primary_Row, Transit_Chain_Row, Job_Meta_Row, and Fit_Badges.
- **Primary_Row**: The top row of a Job_Card displaying commuting time and per-trip cost in large, bold, high-contrast text.
- **Transit_Chain_Row**: The row of a Job_Card rendering a horizontal timeline of transit segments (Walk, BTS, MRT) using minimal icons and per-segment minutes.
- **Transit_Segment**: One leg of a Transit_Chain_Row, consisting of a transport mode (Walk, BTS, or MRT) and a whole-minute duration.
- **Job_Meta_Row**: The row of a Job_Card displaying the job title and company name in smaller muted-gray text.
- **Fit_Badges**: The pair of pill-shaped badges on a Job_Card: the Commute_Fit_Badge and the Skill_Fit_Badge.
- **Commute_Fit_Badge**: A pill badge showing the Commute_Fit_Score with a mint-green treatment.
- **Skill_Fit_Badge**: A pill badge showing the Skill_Fit_Score with a muted-gray/bordered treatment.
- **Commute_Fit_Score**: A percentage value (0-100) representing location/commute compatibility for a job.
- **Skill_Fit_Score**: A percentage value (0-100) representing AI-assessed skill compatibility for a job.
- **Transit_Map**: The interactive Bangkok map panel, occupying approximately 65% of the screen width at desktop size.
- **Home_Pin**: The marker on the Transit_Map at the candidate's home/residence location coordinate.
- **Isochrone_Overlay**: The semi-transparent mint-green polygon layer on the Transit_Map radiating from the Home_Pin, representing the commute-time boundary for the current Tolerance_Slider value.
- **Boundary_Label**: The floating text badge anchored on the shaded Isochrone_Overlay area.
- **Company_Pin**: A marker plotted on the Transit_Map at a job's company location.
- **Map_Viewport**: The currently visible geographic bounding box of the Transit_Map, changing as the User pans, drags, or zooms.
- **User**: The candidate interacting with the Job_Discovery_Screen.

## Requirements

### Requirement 1: Header Title and Subtitle

**User Story:** As a candidate, I want the screen to clearly frame jobs around a 20-minute commute, so that I immediately understand the hyper-local intent.

#### Acceptance Criteria

1. WHEN the Discovery_Header is rendered, THE Discovery_Header SHALL display a main title containing exactly the Thai text "หางานใกล้บ้านภายใน 20 นาที" with no truncation and no leading or trailing characters added.
2. WHEN the Discovery_Header is rendered, THE Discovery_Header SHALL display a subtitle containing exactly the Thai text "เพื่อคุณภาพชีวิตที่ดียิ่งขึ้น" as the element immediately following the main title in vertical reading order, with no other visible content placed between the main title and the subtitle.
3. THE Discovery_Header SHALL render the main title at a headline typography size and SHALL render the subtitle at a rendered font size that is strictly smaller than the main title's rendered font size.
4. THE Discovery_Header SHALL render both the main title and the subtitle as Thai-language strings sourced from the Thai i18n string set.
5. IF the Thai i18n string for the main title or the subtitle cannot be resolved at render time, THEN THE Discovery_Header SHALL display a non-empty placeholder in place of the missing string and SHALL preserve the title-above-subtitle vertical layout without collapsing the header.

### Requirement 2: Commute Tolerance Slider

**User Story:** As a candidate, I want the commute slider to default to 20 minutes with a clear accent, so that the 20-minute city concept is enforced by default.

#### Acceptance Criteria

1. THE Tolerance_Slider SHALL display a component label with the exact Thai text "ระยะเวลาเดินทางสูงสุดที่รับได้:".
2. WHEN the Job_Discovery_Screen loads without a previously selected commute time, THE Tolerance_Slider SHALL initialize the selected maximum commuting time to 20 minutes.
3. THE Tolerance_Slider SHALL display the currently selected maximum commuting time as a whole number followed by a single space and the Thai minutes unit label "นาที".
4. THE Tolerance_Slider SHALL allow the User to select a maximum commuting time within the inclusive range of 15 to 120 minutes in increments of exactly 5 minutes.
5. WHILE the selected maximum commuting time equals exactly 20 minutes, THE Tolerance_Target_Indicator SHALL display a mint-green (#4edea3) glow accent effect.
6. WHEN the User changes the Tolerance_Slider value, THE Job_Discovery_Screen SHALL update the displayed maximum commuting time value to match the new selection within 1 second.
7. WHILE the selected maximum commuting time is not equal to 20 minutes, THE Tolerance_Target_Indicator SHALL NOT display the mint-green glow accent effect.
8. IF a restored maximum commuting time value is outside the 15 to 120 minute range or is not a multiple of 5, THEN THE Tolerance_Slider SHALL clamp the value to the nearest valid step within the range.

### Requirement 3: Map-First Split Layout

**User Story:** As a candidate, I want the map to dominate the screen with a supporting job list, so that I evaluate opportunities by location first.

#### Acceptance Criteria

1. WHILE the viewport width is 1024 px or greater, THE Job_Discovery_Screen SHALL display the Job_List in the left region occupying 35% (±2 percentage points) of the available screen width and the Transit_Map in the right region occupying 65% (±2 percentage points) of the available screen width, with both regions fully visible simultaneously and no horizontal scrolling present.
2. WHILE the viewport width is less than 1024 px, THE Job_Discovery_Screen SHALL display the Job_List and the Transit_Map as a single vertically stacked column with the Job_List positioned above the Transit_Map, with no horizontal scrolling present.
3. THE Job_Discovery_Screen SHALL apply the Design_System dark-mode surface colors to the header region, the Job_List region, and the Transit_Map region.

### Requirement 4: Job Card Primary Commute Metrics

**User Story:** As a candidate, I want each job card to lead with commute time and cost, so that transit impact is the first thing I evaluate.

#### Acceptance Criteria

1. THE Job_Card SHALL display a Primary_Row at the top of the card showing the job's commuting time as a whole number of minutes (0 to 999) and its per-trip travel cost as a whole number of baht (0 to 999,999).
2. THE Primary_Row SHALL format its text as the commuting time, a single space, the Thai minutes unit "นาที", a padded bullet separator " • ", and the per-trip cost in the pattern "฿{cost} / เที่ยว", producing for example "15 นาที • ฿45 / เที่ยว" and "10 นาที • ฿0 / เที่ยว".
3. THE Primary_Row SHALL render its text in a white on-surface color at a font size and font weight that are both strictly greater than those of the Job_Meta_Row text.
4. WHERE a job's per-trip travel cost is zero, THE Primary_Row SHALL display the cost as "฿0 / เที่ยว".
5. IF a job's commuting time is unavailable, THEN THE Primary_Row SHALL display a commute-unavailable indicator in place of the commuting time value.

### Requirement 5: Job Card Transit Chain

**User Story:** As a candidate, I want to see the sequence of transit legs for each job, so that I understand how I would travel there.

#### Acceptance Criteria

1. WHEN a job provides between 1 and 10 Transit_Segments, THE Transit_Chain_Row SHALL render those Transit_Segments as a single horizontal, left-to-right sequence in the exact order they appear in the job's Transit_Segments list.
2. THE Transit_Chain_Row SHALL render each Transit_Segment as a transport-mode icon corresponding to its mode (Walk, BTS, or MRT) immediately followed by the segment duration expressed as a non-negative whole number of minutes (0 to 999) and the Thai minutes unit "นาที" (for example "[Walk] 5 นาที ── [BTS] 10 นาที").
3. WHERE a Transit_Chain_Row contains more than one Transit_Segment, THE Transit_Chain_Row SHALL render one visual connector between each adjacent pair of Transit_Segments, such that a row of N segments contains exactly N-1 connectors.
4. WHERE a job's Transit_Segments list contains exactly one Transit_Segment whose mode is Walk, THE Transit_Chain_Row SHALL render that single Walk Transit_Segment with its duration and no connector (for example "[Walk] 10 นาที").
5. THE Transit_Chain_Row SHALL render each transport-mode icon using the Material Symbols Outlined icon set, using a distinct icon per mode (Walk, BTS, MRT) that is applied consistently for the same mode across all job cards.
6. IF a job's Transit_Segments list is empty or null, THEN THE Transit_Chain_Row SHALL render the commute-unavailable indicator instead of any Transit_Segment, connector, or icon.
7. IF a Transit_Segment has a mode that is not Walk, BTS, or MRT, THEN THE Transit_Chain_Row SHALL render a default transit-mode icon for that segment and SHALL still render the segment's duration and Thai minutes unit.

### Requirement 6: Job Card Meta and Fit Badges

**User Story:** As a candidate, I want the job title demoted and fit shown as two clear badges, so that location compatibility and skill match are separately legible.

#### Acceptance Criteria

1. THE Job_Meta_Row SHALL display the job's non-empty title (up to 120 characters) and non-empty company name (up to 120 characters) in a muted-gray typography treatment whose font size is smaller than the Fit_Badges value text (for example "Senior Data Analyst - True Digital Park").
2. THE Job_Card SHALL display the Commute_Fit_Badge and the Skill_Fit_Badge as two distinct pill-shaped badges aligned horizontally on a single row, with the Commute_Fit_Badge positioned to the left of the Skill_Fit_Badge.
3. THE Commute_Fit_Badge SHALL display the Commute_Fit_Score rounded to the nearest whole number and clamped to between 0 and 100 inclusive as a percentage, using a mint-green (#4edea3) background with text meeting a WCAG AA contrast ratio of at least 4.5:1.
4. THE Skill_Fit_Badge SHALL display the Skill_Fit_Score rounded to the nearest whole number and clamped to between 0 and 100 inclusive as a percentage, using a muted-gray bordered treatment with no fill, visually distinct from the Commute_Fit_Badge.
5. THE Job_Card SHALL NOT display a single unified circular fit chart.
6. IF a job's Commute_Fit_Score is null or undefined, THEN THE Commute_Fit_Badge SHALL display a fit-unavailable indicator instead of a percentage value.
7. IF a job's Skill_Fit_Score is null or undefined, THEN THE Skill_Fit_Badge SHALL display a fit-unavailable indicator instead of a percentage value.

### Requirement 7: Map Panel and Isochrone Overlay

**User Story:** As a candidate, I want the map to show my 20-minute reachable area from home, so that I can see the hyper-local boundary visually.

#### Acceptance Criteria

1. WHEN the candidate's home location coordinate is a valid finite latitude/longitude pair, THE Transit_Map SHALL display a Home_Pin at that coordinate.
2. IF the candidate's home location coordinate is unavailable or invalid, THEN THE Transit_Map SHALL omit the Home_Pin and the Isochrone_Overlay and display a message indicating the home location is not set, while continuing to render the map.
3. WHEN a valid Home_Pin is displayed, THE Transit_Map SHALL render an Isochrone_Overlay as a mint-green (#4edea3) polygon layer with a fill opacity between 0.2 and 0.5 inclusive, radiating from the Home_Pin.
4. WHEN the User changes the Tolerance_Slider value within its range of 15 to 120 minutes in 5-minute increments, THE Isochrone_Overlay SHALL, within 1 second, redraw its boundary so that the shaded area represents the reachable region within the newly selected maximum commuting time.
5. WHEN a valid Isochrone_Overlay is rendered, THE Transit_Map SHALL anchor a Boundary_Label onto the shaded Isochrone_Overlay area displaying the exact Thai text "ขอบเขตเดินทาง 20 นาที".
6. THE Transit_Map SHALL be implemented using the existing Leaflet-based map rendering.

### Requirement 8: Job Pin Filtering by Isochrone

**User Story:** As a candidate, I want only reachable jobs pinned on the map, so that I am not distracted by jobs outside my commute boundary.

#### Acceptance Criteria

1. THE Transit_Map SHALL render a Company_Pin only for jobs whose company location coordinate falls inside the Isochrone_Overlay boundary, where a coordinate lying exactly on the boundary edge is treated as inside.
2. IF a job's company location coordinate falls outside the Isochrone_Overlay boundary, THEN THE Transit_Map SHALL omit that job's Company_Pin.
3. IF a job's company location coordinate is null or non-finite, THEN THE Transit_Map SHALL omit that job's Company_Pin and SHALL NOT count that job as inside the Isochrone_Overlay boundary.
4. WHEN the Isochrone_Overlay boundary rescales due to a Tolerance_Slider change, THE Transit_Map SHALL, within 500 ms, re-evaluate which Company_Pins are rendered, remove pins for jobs no longer inside the new boundary, and render pins for exactly the set of jobs inside the new boundary.
5. IF no job company location coordinate falls inside the Isochrone_Overlay boundary, THEN THE Transit_Map SHALL display no Company_Pins and the Job_List SHALL display an empty-state message indicating that no matching jobs were found.

### Requirement 9: Viewport Bounding-Box Synchronization

**User Story:** As a candidate, I want the job list to follow what I see on the map, so that panning and zooming narrows my results in real time.

#### Acceptance Criteria

1. WHEN the User pans, drags, or zooms the Transit_Map so that the Map_Viewport changes, THE Job_List SHALL, within 1000 ms of the Map_Viewport reaching a settled state, re-filter to display only the jobs whose company location coordinate falls within the current Map_Viewport bounds inclusive of the boundary edges.
2. WHILE a job's company location coordinate is strictly outside the current Map_Viewport bounds, THE Job_List SHALL exclude that job's Job_Card.
3. IF a job has no valid company location coordinate, THEN THE Job_List SHALL exclude that job's Job_Card from the viewport-filtered results.
4. IF the current Map_Viewport bounds contain no job company location coordinates, THEN THE Job_List SHALL display zero Job_Cards and display an empty-state message indicating that no matching jobs were found.
5. WHEN the Job_List re-filters after a Map_Viewport change, THE Job_List SHALL order the remaining visible Job_Cards by descending Commute_Fit_Score, with ties broken by company name in ascending A-to-Z order.

### Requirement 10: Thai Localization and Fallback

**User Story:** As a candidate, I want all screen text in Thai without broken labels, so that the interface is fully readable.

#### Acceptance Criteria

1. WHEN the Job_Discovery_Screen renders, THE Job_Discovery_Screen SHALL display every visible UI text string as the resolved Thai-first value for its translation key, and SHALL NOT display any raw translation key.
2. WHEN resolving a UI text element whose translation key has a Thai string containing at least one non-whitespace character, THE Job_Discovery_Screen SHALL display that Thai string.
3. IF the Thai string for a UI text element's translation key is absent or contains only whitespace, THEN THE Job_Discovery_Screen SHALL display the key's non-empty default text, where non-empty means containing at least one non-whitespace character.
4. IF a UI text element's translation key is absent from the string table, or both its Thai string and its default text are absent or contain only whitespace, THEN THE Job_Discovery_Screen SHALL display the guaranteed default fallback text, which SHALL contain at least one non-whitespace character.
5. WHEN displaying any UI text element, THE Job_Discovery_Screen SHALL render exactly one non-empty text value for that element and SHALL NOT render an empty element or a raw translation key.
