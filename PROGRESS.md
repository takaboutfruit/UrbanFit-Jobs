### 1. Project Dependencies

**dependencies**
| Package | Version |
|---|---|
| chart.js | ^4.5.1 |
| leaflet | ^1.9.4 |
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-leaflet | ^4.2.1 |
| react-router-dom | ^6.28.0 |

**devDependencies**
| Package | Version |
|---|---|
| @types/leaflet | ^1.9.21 |
| @types/react | ^18.3.18 |
| @types/react-dom | ^18.3.5 |
| @vitejs/plugin-react | ^4.3.4 |
| autoprefixer | ^10.4.20 |
| postcss | ^8.4.49 |
| tailwindcss | ^3.4.17 |
| typescript | ^5.7.2 |
| vite | ^5.4.11 |

- **Routing:** react-router-dom ^6.28.0
- **State management:** None (no Redux/Zustand/MobX/etc.); state is local `useState` + one React Context (`pov-context`).
- **Map/API libraries:** leaflet ^1.9.4 + react-leaflet ^4.2.1 (OpenStreetMap tiles); chart.js ^4.5.1 (radar chart). No HTTP/data-fetching library; all data is in-file mock constants.

### 2. Directory Structure

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── vite-env.d.ts
├── components/
│   ├── Icon.tsx
│   ├── ProgressBar.tsx
│   ├── ProgressRing.tsx
│   ├── T.tsx
│   └── index.ts
├── domain/
│   ├── clamp-percent.ts
│   ├── clamp-tolerance.ts
│   ├── filter-by-commute-boundary.ts
│   ├── filter-by-tolerance.ts
│   ├── filter-by-viewport.ts
│   ├── format-cost.ts
│   ├── format-financial.ts
│   ├── format-fit.ts
│   ├── format-primary-row.ts
│   ├── format-time.ts
│   ├── format-tolerance.ts
│   ├── geo.ts
│   ├── index.ts
│   ├── largest-shortfall.ts
│   ├── order-by-commute-fit.ts
│   ├── order-jobs.ts
│   ├── resolve-text.ts
│   ├── transit-icon.ts
│   ├── transit.ts
│   └── types.ts
├── i18n/
│   ├── index.ts
│   ├── keys.ts
│   └── strings.ts
├── screens/
│   ├── AssessmentScreen.tsx        (re-export)
│   ├── HRDashboardScreen.tsx       (re-export)
│   ├── JobDiscoveryScreen.tsx
│   ├── RadarScreen.tsx             (re-export)
│   ├── index.ts
│   ├── assessment/
│   │   ├── AssessmentScreen.tsx
│   │   ├── ChallengeCard.tsx
│   │   ├── ChallengeSelection.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── ContextDataTable.tsx
│   │   └── PromptTimer.tsx
│   ├── discovery/
│   │   ├── BoundaryLabel.tsx
│   │   ├── CompanyPin.tsx
│   │   ├── DiscoveryHeader.tsx
│   │   ├── FinancialComparisonRow.tsx
│   │   ├── FitBadges.tsx
│   │   ├── HomePin.tsx
│   │   ├── IsochroneOverlay.tsx
│   │   ├── JobCard.tsx
│   │   ├── JobList.tsx
│   │   ├── JobMetaRow.tsx
│   │   ├── PrimaryRow.tsx
│   │   ├── ResidenceInput.tsx
│   │   ├── SalaryTag.tsx
│   │   ├── ToleranceSlider.tsx
│   │   ├── TransitChainRow.tsx
│   │   ├── TransitMap.tsx
│   │   ├── ViewportWatcher.tsx
│   │   ├── transit-lines.ts
│   │   └── index.ts
│   ├── hr/
│   │   ├── CandidateCard.tsx
│   │   ├── HRDashboardScreen.tsx
│   │   └── index.ts
│   └── radar/
│       ├── AdviceAlert.tsx
│       ├── CandidateHeader.tsx
│       ├── RadarChart.tsx
│       ├── RadarScreen.tsx
│       ├── RawMetricsCard.tsx
│       ├── TechnicalSkillsCard.tsx
│       ├── UpskillPriorityCard.tsx
│       └── index.ts
└── shell/
    ├── AppShell.tsx
    ├── NavItem.tsx
    ├── PovToggle.tsx
    ├── RouteErrorBoundary.tsx
    ├── pov-context.ts
    ├── routes.tsx
    └── index.ts
```

### 3. Core Components Mapping

**App** — `src/App.tsx`
- Props: none
- State: none
- Side Effects/API Calls: none (renders `<BrowserRouter><AppRoutes/></BrowserRouter>`)

**AppRoutes** — `src/shell/routes.tsx`
- Props: none
- State: none
- Side Effects/API Calls: `React.lazy` dynamic `import()` of the 4 screen modules (code-split chunk loads); `<Navigate>` redirect `/` → `/jobs`

**AppShell** — `src/shell/AppShell.tsx`
- Props: none
- State: none directly; consumes `usePov()` context; reads `useLocation()`
- Side Effects/API Calls: none (render-time redirect via `<Navigate>`; renders `<Outlet/>` inside `<Suspense>` + `RouteErrorBoundary`)

**NavItem** — `src/shell/NavItem.tsx`
- Props: `icon: string`, `labelKey: I18nKey`, `route: string`, `isActive: boolean`, `orientation?: "horizontal"|"vertical"`
- State: none
- Side Effects/API Calls: none (renders react-router `<Link>`)

**PovToggle** — `src/shell/PovToggle.tsx`
- Props: none
- State: none (consumes `usePov()`)
- Side Effects/API Calls: none

**PovProvider** — `src/shell/pov-context.ts`
- Props: `children: ReactNode`, `initialPov?: Pov` (default `"candidate"`)
- State: `useState<Pov>` (`pov`, `setPov`)
- Side Effects/API Calls: none (Context provider)

**RouteErrorBoundary** — `src/shell/RouteErrorBoundary.tsx` (class component)
- Props: `children: ReactNode`, `resetKey?: string`
- State: `{ hasError: boolean }`
- Side Effects/API Calls: `getDerivedStateFromError`, `componentDidCatch` (`console.error`), `componentDidUpdate` (resets on `resetKey` change)

**Icon** — `src/components/Icon.tsx`
- Props: `name: string`, `filled?: boolean`, `className?: string`, `title?: string`, plus spread `AriaAttributes`
- State: none
- Side Effects/API Calls: none

**T** — `src/components/T.tsx`
- Props: `k: I18nKey`, `table?: I18nTable`, `as?: keyof JSX.IntrinsicElements`, `className?: string`
- State: none
- Side Effects/API Calls: none (calls pure `resolveText`)

**ProgressBar** — `src/components/ProgressBar.tsx`
- Props: `percent: number`, `showValue?: boolean`, `className?: string`, `ariaLabel?: string`
- State: none
- Side Effects/API Calls: none (calls pure `clampPercent`)

**ProgressRing** — `src/components/ProgressRing.tsx`
- Props: `percent: number`, `size?: number` (64), `strokeWidth?: number` (6), `showValue?: boolean` (true), `className?: string`, `ariaLabel?: string`
- State: none
- Side Effects/API Calls: none

**JobDiscoveryScreen** — `src/screens/JobDiscoveryScreen.tsx`
- Props: `jobs?: Job[]` (default in-file `sampleJobs`, 23 entries), `home?: Coordinate|null` (default `sampleHome`), `initialToleranceMinutes?: number` (default `TOLERANCE_TARGET`=20)
- State: `selectedJobId: string|null`, `toleranceMinutes: number`, `viewportBounds: MapBounds|null`
- Side Effects/API Calls: no network; `useMemo` deriving `commuteBoundaryJobs` and `visibleJobs` (pure `filterJobsByCommuteBoundary`/`filterJobsByViewport`/`orderByCommuteFit`); **imports in-file mock data** `sampleJobs`, `sampleHome`

**DiscoveryHeader** — `src/screens/discovery/DiscoveryHeader.tsx`
- Props: `toleranceMinutes: number`, `onToleranceChange: (minutes:number)=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none

**ToleranceSlider** — `src/screens/discovery/ToleranceSlider.tsx`
- Props: `value: number`, `onChange: (minutes:number)=>void`, `className?: string`
- State: none (controlled; clamps via `clampToleranceStep`)
- Side Effects/API Calls: none

**ResidenceInput** — `src/screens/discovery/ResidenceInput.tsx` (defined but not mounted by the current screen)
- Props: `value: string`, `onChange: (value:string)=>void`, `className?: string`
- State: none (controlled; 100-char hard cap via `capResidence`)
- Side Effects/API Calls: none

**JobList** — `src/screens/discovery/JobList.tsx`
- Props: `jobs: Job[]`, `selectedJobId: string|null`, `onSelect: (id:string)=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none

**JobCard** — `src/screens/discovery/JobCard.tsx`
- Props: `job: Job`, `isSelected: boolean`, `onSelect: (id:string)=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none (composes PrimaryRow/SalaryTag/TransitChainRow/JobMetaRow/FinancialComparisonRow/FitBadges)

**PrimaryRow** — `src/screens/discovery/PrimaryRow.tsx`
- Props: `commuteMinutes: number|null`, `perTripCostBaht: number`, `className?: string`
- State: none
- Side Effects/API Calls: none (`formatPrimaryRow`)

**SalaryTag** — `src/screens/discovery/SalaryTag.tsx`
- Props: `salaryBaht: number`, `className?: string`
- State: none
- Side Effects/API Calls: none (`formatMonthlyBaht`)

**TransitChainRow** — `src/screens/discovery/TransitChainRow.tsx`
- Props: `segments: TransitSegment[]|null`, `className?: string`
- State: none
- Side Effects/API Calls: none (`resolveTransitIcon`, `formatSegmentDuration`)

**JobMetaRow** — `src/screens/discovery/JobMetaRow.tsx`
- Props: `title: string`, `company: string`, `className?: string`
- State: none
- Side Effects/API Calls: none

**FinancialComparisonRow** — `src/screens/discovery/FinancialComparisonRow.tsx`
- Props: `salaryBaht: number`, `monthlyCommuteCostBaht: number`, `className?: string`
- State: none
- Side Effects/API Calls: none (`formatMonthlyBaht`, `formatCommutePercentOfSalary`, `commuteCostSeverity`)

**FitBadges** — `src/screens/discovery/FitBadges.tsx`
- Props: `commuteFitScore: number|null`, `skillFitScore: number|null`, `className?: string`
- State: none
- Side Effects/API Calls: none (`formatFitBadge`)

**TransitMap** — `src/screens/discovery/TransitMap.tsx`
- Props: `jobs: Job[]`, `selectedJobId: string|null`, `onSelect: (id:string)=>void`, `home: Coordinate|null`, `toleranceMinutes: number`, `onViewportSettle?: (bounds:MapBounds)=>void`, `transitLines?: TransitLine[]` (default in-file `SAMPLE_TRANSIT_LINES`), `className?: string`
- State: `isMobile: boolean` (via `useIsMobileViewport`)
- Side Effects/API Calls: `useEffect` adds/removes `window resize` listener; uses `window.matchMedia`/`innerWidth`; renders react-leaflet `<MapContainer>`/`<TileLayer>` loading **OpenStreetMap tiles** (`https://{s}.tile.openstreetmap.org/...`); imports `SAMPLE_TRANSIT_LINES` mock

**CompanyPin** — `src/screens/discovery/CompanyPin.tsx`
- Props: `job: Job`, `isSelected: boolean`, `onSelect: (id:string)=>void`
- State: none
- Side Effects/API Calls: builds Leaflet `divIcon`; renders `<Marker>`/`<Popup>`

**HomePin** — `src/screens/discovery/HomePin.tsx`
- Props: `home: Coordinate|null`
- State: none
- Side Effects/API Calls: builds Leaflet `divIcon`; renders `<Marker>`

**IsochroneOverlay** — `src/screens/discovery/IsochroneOverlay.tsx`
- Props: `home: Coordinate|null`, `toleranceMinutes: number`
- State: none
- Side Effects/API Calls: none (renders react-leaflet `<Polygon>` from pure `buildIsochrone`)

**BoundaryLabel** — `src/screens/discovery/BoundaryLabel.tsx`
- Props: `home: Coordinate|null`
- State: none
- Side Effects/API Calls: none

**ViewportWatcher** — `src/screens/discovery/ViewportWatcher.tsx`
- Props: `onSettle: (bounds:MapBounds)=>void`, `debounceMs?: number` (default 300)
- State: none (`useRef` timeout handle)
- Side Effects/API Calls: `useMapEvents` (Leaflet `moveend`/`zoomend`); debounced `setTimeout`; `useEffect` cleanup clearing timeout; renders `null`

**AssessmentScreen** — `src/screens/assessment/AssessmentScreen.tsx`
- Props: `initialMessages?: ChatMessage[]` (default `sampleMessages`), `contextTable?: ContextTable|null` (default `sampleContextTable`), `timeLimitSeconds?: number` (default 300), `promptId?: string` (default `"prompt-1"`), `timerRunning?: boolean` (default true)
- State: `assessmentPhase: "selection"|"coding"`, `messages: ChatMessage[]`, `codeText: string`, `loading: boolean` (const, always false)
- Side Effects/API Calls: no network; `handleCodeSubmit` logs via `console.log`; **imports in-file mock data** `sampleContextTable`, `sampleMessages`, `sampleAssessmentState`

**ChallengeSelection** — `src/screens/assessment/ChallengeSelection.tsx`
- Props: `onSelect: (id:string)=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none (renders 3 fixed `ChallengeCard`s with hardcoded ids `pm25-analysis`, `query-optimization`, `commute-dashboard`)

**ChallengeCard** — `src/screens/assessment/ChallengeCard.tsx`
- Props: `id: string`, `titleKey: I18nKey`, `descriptionKey: I18nKey`, `skillsKey: I18nKey`, `difficultyKey: I18nKey`, `onSelect: (id:string)=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none

**ChatInterface** — `src/screens/assessment/ChatInterface.tsx`
- Props: `messages: ChatMessage[]`, `onSubmit: (text:string)=>void`, `loading?: boolean` (default false), `className?: string`
- State: `draft: string`; refs `bottomRef`, `historyRef`
- Side Effects/API Calls: `useEffect` on `messages.length` → auto-scroll (`scrollIntoView`, `scrollTop`); 2,000-char input cap. (internal `ChatBubble` subcomponent: props `{ message: ChatMessage }`, no state)

**CodeEditor** — `src/screens/assessment/CodeEditor.tsx`
- Props: `value: string`, `onChange: (value:string)=>void`, `onSubmit: (code:string)=>void`, `variant?: "textarea"|"monaco"` (default `"textarea"`; screen uses `"monaco"`), `className?: string`
- State: `showRequired: boolean`
- Side Effects/API Calls: none; 20,000-char cap via `capCode`. (internal `MonacoStyleEditor` subcomponent: props `{ value, onChange }`, no state; local tokenizer)

**ContextDataTable** — `src/screens/assessment/ContextDataTable.tsx`
- Props: `table: ContextTable|null`, `className?: string`
- State: none
- Side Effects/API Calls: none

**PromptTimer** — `src/screens/assessment/PromptTimer.tsx`
- Props: `timeLimitSeconds: number`, `promptId?: string|number`, `onExpire?: ()=>void`, `running?: boolean` (default true), `className?: string`
- State: `remainingSeconds: number`, `isExpired: boolean`; refs `remainingRef`, `onExpireRef`, `expireFiredRef`
- Side Effects/API Calls: three `useEffect`s — sync `onExpireRef`; re-init on `promptId`/`limit`; countdown via `setInterval` (250ms) using `performance.now()`/`Date.now()`, cleanup clears interval

**RadarScreen** — `src/screens/radar/RadarScreen.tsx`
- Props: `data?: RadarData` (default `defaultData`), `profile?: CandidateProfile` (default `defaultProfile`), `technicalSkills?: TechnicalSkillCheck[]` (default `defaultTechnicalSkills`), `upskillRecommendations?: UpskillRecommendation[]` (default `defaultUpskillRecommendations`), `rawMetrics?: RawMetric[]` (default `defaultRawMetrics`), `onFindChallenge?: ()=>void`
- State: none
- Side Effects/API Calls: no network; **imports multiple in-file mock datasets** (`defaultData`, `defaultProfile`, `defaultTechnicalSkills`, `defaultUpskillRecommendations`, `defaultRawMetrics`)

**RadarChart** — `src/screens/radar/RadarChart.tsx`
- Props: `data: RadarData`, `className?: string`
- State: none; refs `canvasRef`, `chartRef`
- Side Effects/API Calls: `useEffect` instantiates **Chart.js** `new Chart(...)` on the canvas (guards missing 2D context), cleanup `chart.destroy()`; re-runs on `JSON.stringify(config)`

**CandidateHeader** — `src/screens/radar/CandidateHeader.tsx`
- Props: `profile: CandidateProfile`, `className?: string`
- State: none
- Side Effects/API Calls: none (`clampPercent`, `resolveText`)

**TechnicalSkillsCard** — `src/screens/radar/TechnicalSkillsCard.tsx`
- Props: `skills: TechnicalSkillCheck[]`, `className?: string`
- State: none
- Side Effects/API Calls: none

**UpskillPriorityCard** — `src/screens/radar/UpskillPriorityCard.tsx`
- Props: `recommendations: UpskillRecommendation[]`, `onFindChallenge?: ()=>void`, `className?: string`
- State: none
- Side Effects/API Calls: none

**RawMetricsCard** — `src/screens/radar/RawMetricsCard.tsx`
- Props: `metrics: RawMetric[]`, `className?: string`
- State: none
- Side Effects/API Calls: none

**AdviceAlert** — `src/screens/radar/AdviceAlert.tsx` (defined; not mounted by current `RadarScreen`)
- Props: `candidate: Record<string,number>`, `benchmark: Record<string,number>`, `benchmarkLabel: string`, `onFindCourses?: ()=>void`, `className?: string`
- State: none
- Side Effects/API Calls: `useNavigate()`; CTA navigates to `/courses` (pure `largestShortfall`)

**HRDashboardScreen** — `src/screens/hr/HRDashboardScreen.tsx`
- Props: `shortlist?: HRShortlist` (default `defaultShortlist`, 5 candidates), `onScheduleInterview?: (id:string)=>void`, `onReject?: (id:string)=>void`
- State: none
- Side Effects/API Calls: no network; `useMemo` orders candidates by score desc; **imports in-file mock data** `defaultShortlist`

**CandidateCard** — `src/screens/hr/CandidateCard.tsx`
- Props: `candidate: CandidateSummary`, `onScheduleInterview: (id:string)=>void`, `onReject: (id:string)=>void`, `className?: string`
- State: `activated: "schedule"|"reject"|null`
- Side Effects/API Calls: none (internal `ScoreBreakdown` props `{ labelKey, value }`, `ScorePlaceholder` no props)

Note: `src/screens/AssessmentScreen.tsx`, `src/screens/RadarScreen.tsx`, `src/screens/HRDashboardScreen.tsx` are pure re-export modules (no own props/state/effects).

### 4. Mock Data Schema

All mock data is hardcoded in component files (no API/fetch). Address/location is an **object** `{ lat: number, lng: number }` (`Coordinate`), not a string.

Example 1 — `Job` object (from `sampleJobs` in `JobDiscoveryScreen.tsx`):
```json
{
  "id": "j2",
  "title": "Junior Data Analyst",
  "company": "DataSphere Tech",
  "urbanFitScore": 88,
  "lifestyleFitScore": 88,
  "commutingMinutes": 18,
  "routeDescription": "18 นาที ผ่าน วิน + MRT (ย่านสาทร)",
  "monthlyTravelCostBaht": 1540,
  "perTripCostBaht": 35,
  "salaryBaht": 28000,
  "monthlyCommuteCostBaht": 1540,
  "transitSegments": [
    { "mode": "Win", "minutes": 3 },
    { "mode": "MRT", "minutes": 15 }
  ],
  "commuteFitScore": 88,
  "skillFitScore": 91,
  "workModel": "On-site",
  "location": { "lat": 13.7205, "lng": 100.5286 }
}
```
Type notes: `id/title/company/routeDescription` = string; all `*Score`/`*Baht`/`commutingMinutes` = number; `commutingMinutes`, `commuteFitScore`, `skillFitScore`, `location` are nullable (`number|null` / `Coordinate|null`); `transitSegments` = `Array<{ mode: string, minutes: number }> | null`; `workModel` = `"On-site"|"Hybrid"|"Remote"`.

Example 2 — `CandidateSummary` object (from `defaultShortlist` in `hr/HRDashboardScreen.tsx`):
```json
{
  "id": "c1",
  "name": "สมชาย ใจดี",
  "urbanFitScore": 92,
  "skillMatch": 88,
  "commutingFeasibility": 95,
  "aiSummary": "ผู้สมัครแสดงการคิดเชิงวิเคราะห์ที่ดีเยี่ยม สื่อสารชัดเจน และแก้ปัญหาข้อมูลได้อย่างเป็นระบบภายใต้เวลาจำกัด"
}
```
Type notes: `id/name/aiSummary` = string; `urbanFitScore/skillMatch/commutingFeasibility` = `number | null`. Wrapping shape: `HRShortlist = { targetRole: string, candidates: CandidateSummary[] }`.

Supplementary — `RadarData` (from `defaultData` in `radar/RadarScreen.tsx`):
```json
{
  "dimensions": ["Data Cleaning", "SQL", "Python", "Visualization", "Statistics", "Business Logic"],
  "candidate": { "values": { "Data Cleaning": 60, "SQL": 85, "Python": 88, "Visualization": 72, "Statistics": 74, "Business Logic": 80 } },
  "requirement": { "values": { "Data Cleaning": 65, "SQL": 70, "Python": 75, "Visualization": 70, "Statistics": 65, "Business Logic": 70 } },
  "market": { "values": { "Data Cleaning": 78, "SQL": 80, "Python": 82, "Visualization": 76, "Statistics": 72, "Business Logic": 75 } }
}
```
Type notes: `dimensions` = `string[]`; each series = `{ values: Record<string, number> } | null`.

### 5. Routing & Entry Point

- `src/main.tsx`: creates the React root on `#root` (throws if missing) and renders `<StrictMode><App/></StrictMode>`; imports `./index.css`.
- `src/App.tsx`: renders `<BrowserRouter><AppRoutes/></BrowserRouter>` (client-side routing via react-router-dom v6).
- `src/shell/routes.tsx` (`AppRoutes`): declarative `<Routes>`. A single layout route `path="/"` renders `<AppShell/>`; children: `index` → `<Navigate to="/jobs" replace/>`, `jobs` → `JobDiscoveryScreen`, `assessment` → `AssessmentScreen`, `radar` → `RadarScreen`, `hr` → `HRDashboardScreen`. All four screens are `React.lazy` code-split (dynamic `import()` resolving the named export to a `default`).
- `src/shell/AppShell.tsx` (`AppShell`): wraps content in `PovProvider`. Renders persistent nav chrome (desktop left sidebar ≥768px, mobile bottom bar <768px) driven by the `DESTINATIONS` array + `useLocation`, plus the floating `PovToggle`. Routed screens render through `<Outlet/>` inside `<Suspense fallback={ScreenFallback}>` guarded by `RouteErrorBoundary` (reset on pathname change). POV gating: `candidate` sees `/jobs`, `/assessment`, `/radar`; `hr` sees `/hr`; disallowed routes render-redirect to the POV default (`/jobs` or `/hr`).
- Data flow: screens are mounted with no props, so each falls back to its in-file mock defaults; there is no store or router loader/data layer.