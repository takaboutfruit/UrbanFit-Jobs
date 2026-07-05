# Requirements Document

## Introduction

BKK UrbanTalent Match (product name: UrbanFit Jobs) is a modern, dark-mode, data-driven Tech talent matching platform for Bangkok. This specification covers the **frontend** only: the presentation layer, layout, visual components, and client-side interactions for four core screens.

The platform matches Tech workers to jobs not only by resume but by combining AI-assessed skill scores with urban data (commuting time, travel cost, transit routes). This document defines the frontend requirements for:

1. **Candidate Job Discovery** — a split-screen job list (sorted by Urban-Fit Score) plus an interactive Bangkok transit map.
2. **AI Roleplay Assessment** — a timed, split-screen skill test with a raw-data context panel and an AI chat plus code editor.
3. **Market-Benchmarked Radar** — a single-view report centered on a radar chart comparing candidate, company, and market scores, with an automated advice alert.
4. **Zero-Filter HR Dashboard** — a premium, controls-free shortlist of the top candidates with score breakdowns, AI summaries, and action buttons.

The UI is Thai-language, uses a dark-mode design system (Be Vietnam Pro font, Material Symbols Outlined icons, Tailwind CSS), and is responsive with a desktop side navigation and a mobile bottom navigation.

Scope note: This spec addresses only frontend rendering and interaction behavior. Data is supplied to the frontend as view models; backend scoring algorithms, AI model behavior, routing computation, and persistence are out of scope. Where requirements reference values such as scores or commuting times, they refer to displaying and reacting to data already provided to the frontend.

## Glossary

- **Frontend**: The client-side web application composed of the four core screens, navigation chrome, and the shared design system.
- **Design_System**: The shared set of color tokens, typography (Be Vietnam Pro), iconography (Material Symbols Outlined), spacing, and radius tokens applied across the Frontend.
- **App_Shell**: The persistent navigation chrome consisting of the desktop side navigation, desktop top bar, and mobile bottom navigation.
- **Urban_Fit_Score**: A percentage value (0-100) representing overall suitability of a job or candidate, combining lifestyle/skill and commuting factors.
- **Lifestyle_Fit_Score**: A percentage value (0-100) shown on a Job Card indicating lifestyle suitability of a job.
- **Job_Discovery_Screen**: Screen 1, the split-screen job list plus Bangkok transit map.
- **Job_Card**: A card in the Job_Discovery_Screen list showing one job's title, company, fit score, commuting time and route, estimated monthly travel cost, and work model tag.
- **Job_List**: The scrollable, ordered collection of Job_Cards in the Job_Discovery_Screen.
- **Transit_Map**: The interactive Bangkok map showing company pins overlaid with BTS/MRT/BRT transit routes.
- **Company_Pin**: A marker plotted on the Transit_Map at a company's location.
- **Residence_Input**: The header input where a candidate pins their residence location in Bangkok.
- **Tolerance_Slider**: The header slider that sets the maximum acceptable commuting time in minutes.
- **Work_Model_Tag**: A label on a Job_Card indicating On-site, Hybrid, or Remote work model.
- **Assessment_Screen**: Screen 2, the timed AI roleplay skill test.
- **Prompt_Timer**: The countdown timer showing time remaining for the current prompt, displayed in MM:SS format.
- **Context_Data_Table**: The left-panel table of raw data (e.g., PM2.5 values, traffic coordinates) the candidate must use.
- **Chat_Interface**: The right-panel conversation area between the candidate and the AI assistant.
- **Code_Editor**: The input area within the Assessment_Screen where the candidate enters answer code.
- **Radar_Screen**: Screen 3, the single-view market-benchmarked report.
- **Radar_Chart**: The spider/radar chart plotting skill dimensions with three overlaid series.
- **Candidate_Series**: The Radar_Chart series representing the candidate's own scores (primary/blue-emerald color).
- **Requirement_Series**: The Radar_Chart series representing the company's minimum requirement (dotted gray).
- **Market_Series**: The Radar_Chart series representing the market average (orange/tertiary color).
- **Advice_Alert**: The automated advice/skill-gap alert box on the Radar_Screen.
- **HR_Dashboard_Screen**: Screen 4, the zero-filter HR candidate shortlist.
- **Candidate_Card**: A card on the HR_Dashboard_Screen showing one candidate's overall score, score breakdown, AI summary, and action buttons.
- **AI_Summary**: A text box summarizing a candidate's assessed behavior and ability in place of a resume.
- **User**: A person interacting with the Frontend (candidate or HR user, depending on screen).

## Requirements

### Requirement 1: Design System and Visual Consistency

**User Story:** As a User, I want a consistent modern dark-mode interface, so that data and visualizations are easy to read and the product feels professional.

#### Acceptance Criteria

1. THE Frontend SHALL apply dark-mode surface colors using the tokens surface-container-lowest (#010409), surface-container-low (#0d1117), and surface-container (#161b22) for background and surface elements, with no light-mode surface color applied to any screen.
2. THE Frontend SHALL render all text using the Be Vietnam Pro font family as the first declared font.
3. IF the Be Vietnam Pro font fails to load within 3 seconds, THEN THE Frontend SHALL render text using a system sans-serif fallback font and SHALL preserve the defined typography scale sizes.
4. THE Frontend SHALL render all icons using the Material Symbols Outlined icon set.
5. THE Frontend SHALL use the emerald/mint color #4edea3 as the primary accent color for primary interactive elements.
6. THE Frontend SHALL use the blue color #a2c9ff as the secondary accent color, the amber color #f2cc60 for warning states, and the red color #f85149 for error and destructive states, applying each color only to its designated state.
7. THE Frontend SHALL maintain a text-to-background contrast ratio of at least 4.5:1 for body and label text and at least 3:1 for headline text of 24px or larger.
8. THE Frontend SHALL render all UI text in the Thai language.
9. IF a Thai translation string is missing for a UI text element, THEN THE Frontend SHALL display the corresponding default text and SHALL not render an empty element or a raw translation key.
10. THE Frontend SHALL apply the Design_System typography scale, using headline sizes for screen titles and body/label sizes for all non-title supporting text.

### Requirement 2: Responsive Navigation Shell

**User Story:** As a User, I want navigation that adapts to my device, so that I can move between screens on both desktop and mobile.

#### Acceptance Criteria

1. WHERE the viewport width is greater than or equal to 768 pixels, THE App_Shell SHALL display a persistent left side navigation listing all primary destinations (the four core screens: Candidate Job Discovery, AI Roleplay Assessment, Market-Benchmarked Radar, and HR Dashboard).
2. WHERE the viewport width is less than 768 pixels, THE App_Shell SHALL display a fixed bottom navigation bar listing the same primary destinations instead of the left side navigation.
3. WHEN the active screen changes, THE App_Shell SHALL apply to the navigation entry corresponding to the active screen a visual style that is distinct from every inactive navigation entry.
4. WHEN a User selects a navigation destination, THE App_Shell SHALL navigate the Frontend to the corresponding screen within 1 second.
5. IF navigation to a selected destination fails, THEN THE App_Shell SHALL remain on the currently active screen and display an error indication informing the User that the destination could not be opened.
6. THE App_Shell SHALL display the "UrbanFit Jobs" product name in the navigation chrome.

### Requirement 3: Job Discovery Split-Screen Layout

**User Story:** As a candidate, I want a split view of jobs and a map, so that I can evaluate opportunities by both details and location at once.

#### Acceptance Criteria

1. WHERE the viewport width is 1024 px or greater (desktop size), THE Job_Discovery_Screen SHALL display the Job_List occupying the left region and the Transit_Map occupying the right region simultaneously within a single view without requiring horizontal scrolling.
2. WHERE the viewport width is less than 1024 px (mobile size), THE Job_Discovery_Screen SHALL display the Job_List occupying the full viewport width as the primary region rather than side by side with the Transit_Map.
3. THE Job_Discovery_Screen SHALL display a header region containing both the Residence_Input and the Tolerance_Slider.
4. THE Job_Discovery_Screen SHALL display a screen title and a supporting subtitle within the header region.

### Requirement 4: Job List Ordering and Cards

**User Story:** As a candidate, I want jobs ranked by how well they fit my urban lifestyle, so that the most relevant opportunities appear first.

#### Acceptance Criteria

1. THE Job_List SHALL order Job_Cards by Urban_Fit_Score from highest to lowest value.
2. IF two or more Job_Cards share the same Urban_Fit_Score, THEN THE Job_List SHALL order those Job_Cards alphabetically (A to Z) by company name.
3. THE Job_List SHALL display each Job_Card with a non-empty job title and a non-empty company name.
4. THE Job_List SHALL display each Job_Card's Lifestyle_Fit_Score as an integer percentage value between 0% and 100% inclusive, accompanied by a progress indicator (progress bar or circular indicator) whose filled proportion matches the same percentage value.
5. THE Job_List SHALL display each Job_Card's commuting time in minutes and its route description (for example "45 นาที ผ่าน BTS + BRT").
6. THE Job_List SHALL display each Job_Card's estimated monthly travel cost as a value in Thai Baht per month, ranging from 0 to 999,999 บ./เดือน (for example "1,200 บ./เดือน").
7. THE Job_List SHALL display each Job_Card's Work_Model_Tag with exactly one of the values On-site, Hybrid, or Remote.
8. WHEN a User selects a Job_Card, THE Job_Discovery_Screen SHALL apply a visually distinct active state to the selected Job_Card that differs from all unselected Job_Cards, and SHALL maintain that active state on only one Job_Card at a time.
9. IF the Job_List contains zero Job_Cards, THEN THE Job_Discovery_Screen SHALL display an empty-state message indicating that no matching jobs were found.

### Requirement 5: Interactive Transit Map

**User Story:** As a candidate, I want to see company locations and transit routes on a Bangkok map, so that I can understand the commute for each job.

#### Acceptance Criteria

1. WHEN the Job_List finishes loading, THE Transit_Map SHALL display a Bangkok map within 3 seconds and plot one Company_Pin for each job in the Job_List that has a valid location coordinate.
2. IF a job in the Job_List has no valid location coordinate, THEN THE Transit_Map SHALL omit its Company_Pin and display an indicator listing the count of jobs that could not be plotted.
3. IF the Job_List contains zero jobs, THEN THE Transit_Map SHALL display the Bangkok map with no Company_Pins and a message indicating that no company locations are available.
4. THE Transit_Map SHALL overlay transit route lines representing the BTS, MRT, and BRT routes, rendering each route type as a visually distinct line.
5. THE Transit_Map SHALL display a legend that identifies each of the BTS, MRT, and BRT transit route lines.
6. WHEN a User activates a Company_Pin, THE Transit_Map SHALL display that company's job title and commuting time expressed in whole minutes.
7. IF a User activates a Company_Pin whose commuting time is unavailable, THEN THE Transit_Map SHALL display the job title and an indicator that commuting time is unavailable.
8. WHEN a User selects a Job_Card in the Job_List, THE Transit_Map SHALL display the corresponding Company_Pin in a highlighted visual state distinct from all non-selected Company_Pins.
9. WHEN a User selects a Job_Card while another Company_Pin is highlighted, THE Transit_Map SHALL remove the highlighted state from the previously highlighted Company_Pin so that at most one Company_Pin is highlighted at any time.
10. THE Transit_Map SHALL be implemented using Leaflet.js (or Mapbox GL JS) to render the map tiles and vector overlay layers.

### Requirement 6: Residence Pin and Commuting Tolerance

**User Story:** As a candidate, I want to set my home location and maximum commute time, so that results reflect my travel constraints.

#### Acceptance Criteria

1. THE Residence_Input SHALL accept free-text entry of a Bangkok residence location up to a maximum of 100 characters.
2. THE Tolerance_Slider SHALL allow the User to select a maximum commuting time within the range of 15 to 120 minutes in increments of 5 minutes.
3. THE Tolerance_Slider SHALL display the currently selected maximum commuting time as a numeric value followed by a minutes unit label.
4. WHEN the User changes the Tolerance_Slider value, THE Job_Discovery_Screen SHALL update the displayed maximum commuting time value to match the new selection within 1 second.
5. WHEN the User changes the Tolerance_Slider value, THE Job_List SHALL update within 1 second so that Job_Cards whose commuting time exceeds the selected maximum commuting time are removed from the Job_List, while retaining the descending Urban_Fit_Score order of the remaining Job_Cards.
6. IF the User enters text into the Residence_Input beyond 100 characters, THEN THE Residence_Input SHALL prevent input beyond the 100-character limit and retain the first 100 characters entered.
7. IF the Residence_Input contains no non-whitespace characters, THEN THE Job_Discovery_Screen SHALL retain the current Job_List without applying a residence-based change.

### Requirement 7: Assessment Split-Screen Layout

**User Story:** As a candidate, I want the assessment context data and the answer area side by side, so that I can reference the data while writing my answer.

#### Acceptance Criteria

1. WHERE the viewport width is at desktop size, THE Assessment_Screen SHALL display the Context_Data_Table in a left region and the Chat_Interface with the Code_Editor in a right region simultaneously, with both regions fully visible without requiring horizontal scrolling.
2. THE Assessment_Screen SHALL display a top bar, positioned above the left and right regions, containing the Prompt_Timer.
3. THE Context_Data_Table SHALL display the provided raw context data as rows and columns, with each column presenting a visible text header label.
4. IF the Context_Data_Table row count exceeds the visible area of the left region, THEN THE Context_Data_Table SHALL provide vertical scrolling that keeps every row reachable while keeping the column header labels visible.
5. IF no context data is available for the current prompt, THEN THE Context_Data_Table SHALL display a message indicating that no context data is available and SHALL preserve the split-screen layout.

### Requirement 8: Prompt Countdown Timer

**User Story:** As a candidate, I want a visible countdown per prompt, so that I understand the time pressure and prevent cheating incentives.

#### Acceptance Criteria

1. THE Prompt_Timer SHALL display the remaining time in MM:SS format, using two digits for minutes and two digits for seconds with leading zeros (for example, 05:00).
2. THE Prompt_Timer SHALL display the remaining time text using the error red color (#f85149).
3. WHEN an assessment prompt becomes active, THE Prompt_Timer SHALL initialize the displayed remaining time to the configured time limit for that prompt and begin the countdown.
4. WHILE an assessment prompt is active and the displayed remaining time is greater than 00:00, THE Prompt_Timer SHALL decrease the displayed remaining time by one second every 1 second of elapsed real time, within a tolerance of ±1 second.
5. WHEN the Prompt_Timer reaches 00:00, THE Assessment_Screen SHALL stop the countdown and hold the displayed remaining time at 00:00.
6. WHEN the Prompt_Timer reaches 00:00, THE Assessment_Screen SHALL display a visible indication that the time for the current prompt has ended.
7. THE Assessment_Screen SHALL display a descriptive text label identifying the timer as the time remaining per prompt.

### Requirement 9: AI Chat and Code Editor

**User Story:** As a candidate, I want to converse with the AI and submit code, so that I can complete the roleplay assessment.

#### Acceptance Criteria

1. THE Chat_Interface SHALL display a history of messages in which AI messages and candidate messages are visually distinguished by distinct alignment and sender labeling.
2. THE Chat_Interface SHALL provide a text input that accepts up to 2,000 characters and a send control for the candidate to enter and submit a message.
3. WHEN the candidate submits a chat message containing at least one non-whitespace character, THE Chat_Interface SHALL append the message to the conversation history and clear the text input.
4. WHEN the candidate submits a chat message, THE Chat_Interface SHALL immediately display a loading indicator (for example, a typing animation) until the AI response begins rendering.
5. THE Chat_Interface SHALL support streaming (progressive/incremental) text rendering of AI responses as the response content arrives.
6. IF the candidate attempts to send a message that is empty or contains only whitespace characters, THEN THE Chat_Interface SHALL retain the current conversation history without appending a message and without clearing the text input.
7. THE Code_Editor SHALL accept multi-line text entry of up to 20,000 characters for the candidate's answer code.
8. THE Assessment_Screen SHALL provide a control to submit the candidate's answer code.
9. WHILE the message count exceeds the visible area, THE Chat_Interface SHALL retain scroll access to all messages in the conversation history.
10. WHEN a message is appended to the conversation history, THE Chat_Interface SHALL scroll the conversation history to display the most recently appended message.
11. IF the candidate submits the answer code while the Code_Editor is empty or contains only whitespace characters, THEN THE Assessment_Screen SHALL retain the entered content without submitting and SHALL display an indication that non-empty answer code is required.

### Requirement 10: Market-Benchmarked Radar Chart

**User Story:** As a candidate, I want to see my skills against company requirements and the market, so that I understand where I stand.

#### Acceptance Criteria

1. THE Radar_Screen SHALL display the Radar_Chart as the visually central element of the report, with at least 3 labeled skill dimension axes, each axis scaled from 0 to 100.
2. THE Radar_Chart SHALL plot the Candidate_Series using the primary accent color (#4edea3), plotting one value per skill dimension axis at the provided 0-100 score.
3. THE Radar_Chart SHALL plot the Requirement_Series using a dotted gray line style, plotting one value per skill dimension axis at the provided 0-100 score.
4. THE Radar_Chart SHALL plot the Market_Series using the orange/tertiary color, plotting one value per skill dimension axis at the provided 0-100 score.
5. THE Radar_Screen SHALL display a legend labeling the Candidate_Series, the Requirement_Series, and the Market_Series.
6. IF the data for a series is unavailable, THEN THE Radar_Chart SHALL omit that series from the plot and THE Radar_Screen SHALL display a message indicating which series could not be shown.

### Requirement 11: Automated Advice Alert

**User Story:** As a candidate, I want automated advice about my skill gaps, so that I know what to improve and how.

#### Acceptance Criteria

1. THE Advice_Alert SHALL display an advice message that names the skill dimension with the largest shortfall below its benchmark, identifies the benchmark being compared against, and states the shortfall as a percentage value (for example "แจ้งเตือนช่องว่างทักษะ: ทักษะ Data Cleaning ของคุณต่ำกว่าค่าเฉลี่ยตลาด 15%").
2. THE Advice_Alert SHALL display the skill gap message using the Design_System warning color treatment (amber #f2cc60).
3. THE Advice_Alert SHALL display a "ค้นหาคอร์สอัปสกิล" call-to-action control in an enabled and selectable state.
4. WHEN the User selects the "ค้นหาคอร์สอัปสกิล" control, THE Radar_Screen SHALL initiate navigation to the upskill courses destination within 1 second.
5. IF the candidate's scores meet or exceed the benchmark on every skill dimension, THEN THE Advice_Alert SHALL display a no-skill-gap confirmation message in place of the skill gap message.

### Requirement 12: Zero-Filter HR Shortlist

**User Story:** As an HR user, I want a curated shortlist with no filter controls, so that I can review the top candidates immediately without configuring searches.

#### Acceptance Criteria

1. THE HR_Dashboard_Screen SHALL display a header showing the shortlist title, and the shortlist title SHALL include the number of shortlisted candidates and the target job role (for example "5 อันดับผู้สมัครสูงสุดสำหรับตำแหน่ง Data Analyst").
2. THE HR_Dashboard_Screen SHALL NOT display any search input, filter control, or sort control for the candidate shortlist.
3. THE HR_Dashboard_Screen SHALL display exactly one Candidate_Card for each candidate in the shortlist, and the number of displayed Candidate_Cards SHALL equal the candidate count stated in the shortlist title.
4. THE HR_Dashboard_Screen SHALL order Candidate_Cards by Urban_Fit_Score in descending order.
5. IF the shortlist contains no candidates, THEN THE HR_Dashboard_Screen SHALL display an empty-state message indicating that no shortlisted candidates are available.

### Requirement 13: HR Candidate Card Contents

**User Story:** As an HR user, I want each candidate card to summarize fit, breakdown, and behavior, so that I can decide without opening a resume.

#### Acceptance Criteria

1. THE Candidate_Card SHALL display the candidate's overall Urban_Fit_Score as a whole-number percentage between 0 and 100, rendered at the largest typographic size on the card.
2. THE Candidate_Card SHALL display a Skill Match score breakdown as a whole-number percentage between 0 and 100 accompanied by a progress bar whose filled proportion matches the value.
3. THE Candidate_Card SHALL display the AI_Summary as a text box describing the candidate's assessed behavior and ability, and SHALL retain scroll access to the full text when the summary exceeds the visible area.
4. THE Candidate_Card SHALL display a "นัดหมายสัมภาษณ์" action button using the primary/green color treatment.
5. THE Candidate_Card SHALL display a "ปฏิเสธและส่งรายงานช่องว่างทักษะ" action button using the error/destructive (red #f85149) color treatment.
6. WHEN an HR user selects the "นัดหมายสัมภาษณ์" button on a Candidate_Card, THE HR_Dashboard_Screen SHALL initiate the schedule-interview action for that candidate.
7. WHEN an HR user selects the "ปฏิเสธและส่งรายงานช่องว่างทักษะ" button on a Candidate_Card, THE HR_Dashboard_Screen SHALL initiate the reject-and-send-gap-report action for that candidate.
8. THE Candidate_Card SHALL display a Commuting Feasibility score breakdown as a whole-number percentage between 0 and 100 accompanied by a progress bar whose filled proportion matches the value.
9. IF a required score for a Candidate_Card is unavailable, THEN THE Candidate_Card SHALL display a placeholder indicator in place of the missing score rather than an empty value.
10. WHEN an HR user selects an action button on a Candidate_Card, THE Candidate_Card SHALL display visual feedback confirming the button was activated.

### Requirement 14: Responsive Layout Behavior

**User Story:** As a User, I want each screen to remain usable on smaller viewports, so that I can use the platform on mobile devices.

#### Acceptance Criteria

1. WHERE the viewport width is less than 768 px (mobile size), THE Job_Discovery_Screen SHALL present the Job_List and Transit_Map as a single vertically stacked column rather than side by side in the same horizontal row.
2. WHERE the viewport width is less than 768 px (mobile size), THE Assessment_Screen SHALL present the Context_Data_Table and the Chat_Interface with Code_Editor as a single vertically stacked column rather than side by side in the same horizontal row.
3. WHERE the viewport width is less than 768 px (mobile size), THE HR_Dashboard_Screen SHALL present Candidate_Cards with exactly one Candidate_Card per row.
4. WHERE the viewport width is greater than or equal to 768 px (desktop size), THE Radar_Screen SHALL present the Radar_Chart and the supporting summary/advice content so that all content is reachable by vertical scrolling only and no horizontal scrollbar is produced.
5. WHERE the viewport width is less than 768 px (mobile size), THE Radar_Screen SHALL present the Radar_Chart and the supporting summary/advice content as a single vertically stacked column reachable by vertical scrolling only.
6. WHERE the viewport width is less than 768 px, THE Transit_Map SHALL disable one-finger drag-to-pan by default and SHALL require a specific gesture (for example, two-finger pan) to pan or interact with the map, so that the page can be scrolled with one finger.
