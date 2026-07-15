// Feature: job-discovery-live-search
// Screen 1 — Candidate Job Discovery: Map-First composition + interaction
// state, wired to the live GET /search endpoint (task 13).
//
// The candidate's Job Role and Residence are already pre-selected during
// onboarding, so this screen no longer owns editable residence text — the
// header shows a static role/residence context block instead of a search
// input.
//
// This screen OWNS the local interaction state (Req 2.2, 2.8, 9.1):
//   - toleranceMinutes : number         — 15..120 step 5, default
//                                         TOLERANCE_TARGET (20); any restored
//                                         initial value is clamped via
//                                         `clampToleranceStep` (Req 2.8).
//   - selectedJobId    : string | null  — the single selected job.
//   - viewportBounds   : MapBounds | null — the current settled map
//                                         viewport bounds (Req 9.1).
//
// Job source (Req 1.1, 1.2, 1.5-1.7, 6.1-6.3): when the screen is rendered
// without an explicit `jobs` prop (the routed, no-props case), jobs come
// from the live `useJobSearch(home, toleranceMinutes)` hook — no more
// in-file sample dataset or client-side commute-boundary gate. When an
// explicit `jobs` prop IS provided, it's used directly (bypassing the live
// fetch — the hook is fed a `null` home in that case so its own validation
// gate never issues a request) for backward compatibility with callers that
// already have a job list.
//   - Map pins: every job with a valid coordinate is passed to `TransitMap`,
//     which plots one pin per job with a valid `location` — no
//     commute-boundary gate (Req 6.1, 6.2, 6.4).
//   - List cards: `orderByCommuteFit(filterJobsByViewport(jobs,
//     viewportBounds))` — restricted to the current map viewport (so the
//     list only ever shows what's currently visible on the map, not
//     off-screen pins), then ordered by descending Commute Fit with an A→Z
//     tiebreak (Req 9.5, 6.3). `JobList` already renders its own empty-state
//     (K.jobsEmpty) when given zero cards (Req 8.5, 9.4, 5.5).
//   - List region status (Req 5.1, 5.5, 5.6): while sourcing from
//     `useJobSearch`, the list region renders `LoadingState` while a request
//     is in flight, `ErrorState` (wired to `retry`) when the latest request
//     failed, and the `JobList` otherwise. The map region is unaffected by
//     `status` — it always renders the current `jobs`, regardless of
//     whether the list region is showing Loading_State or Error_State.
//
// Layout (Req 3.1 / 3.2 / 3.3):
//   - <1024px  : a single stacked column; the JobList is the primary,
//                full-width region (map region stacks beneath it).
//   - >=1024px : a 35/65 two-region split (`lg:grid-cols-[35fr_65fr]`) —
//                JobList on the LEFT occupying ~35% width and the map region
//                on the RIGHT occupying ~65% width, both visible
//                simultaneously with no horizontal scrolling.
//   - All three regions (header, list, map) use dark-mode surface tokens
//     (Req 3.3).

import { useMemo, useState } from "react";
import {
  clampToleranceStep,
  filterJobsByViewport,
  orderByCommuteFit,
  resolveText,
  TOLERANCE_TARGET,
  type Coordinate,
  type Job,
  type MapBounds,
} from "../domain";
import {
  DiscoveryHeader,
  ErrorState,
  JobList,
  LoadingState,
  TransitMap,
  useJobSearch,
  type SearchStatus,
} from "./discovery";
import { K, strings } from "../i18n";

/**
 * Default candidate home coordinate (ย่านอารีย์-ish) for the routed screen,
 * used when no `home` prop is supplied. This is the same coordinate the
 * screen has always defaulted to (previously named `sampleHome`); only the
 * in-file `sampleJobs` dataset was removed by task 13 — the default home
 * source is unchanged per the design's key decision 5.
 */
const DEFAULT_HOME: Coordinate = { lat: 13.7745, lng: 100.5392 };

export interface JobDiscoveryScreenProps {
  /**
   * Optional explicit job list. When provided, it is rendered directly and
   * the live `useJobSearch` fetch is bypassed (backward compatibility for
   * callers that already have a job list). When omitted (the routed,
   * no-props case), jobs are sourced from the live `useJobSearch(home,
   * toleranceMinutes)` hook. The screen filters and orders this list
   * internally — callers pass the raw, unordered set.
   */
  jobs?: Job[];
  /**
   * Candidate home/residence coordinate; null/invalid renders the
   * home-not-set state on the map (Req 7.2) and, while sourcing from the
   * live hook, suppresses Search_Request issuance (Req 1.6, 1.7). Defaults
   * to `DEFAULT_HOME` when omitted.
   */
  home?: Coordinate | null;
  /**
   * Initial tolerance in minutes; defaults to TOLERANCE_TARGET (20).
   * Restored values are clamped to the nearest valid 15-120 step-5 value
   * (Req 2.8).
   */
  initialToleranceMinutes?: number;
}

/**
 * Job Discovery screen composition + interaction state.
 */
export function JobDiscoveryScreen({
  jobs: jobsProp,
  home = DEFAULT_HOME,
  initialToleranceMinutes = TOLERANCE_TARGET,
}: JobDiscoveryScreenProps = {}) {
  // --- Owned interaction state -------------------------------------------
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  // Req 2.2/2.8: default to TOLERANCE_TARGET (20); any restored/initial
  // value is clamped to a valid 15-120 step-5 value before use as state.
  const [toleranceMinutes, setToleranceMinutes] = useState(() =>
    clampToleranceStep(initialToleranceMinutes),
  );
  // Req 9.1: the current settled map viewport bounds; null until the map
  // reports its first settled viewport.
  const [viewportBounds, setViewportBounds] = useState<MapBounds | null>(
    null,
  );

  // Whether the routed, live-data path is active for this render. When an
  // explicit `jobs` prop is supplied, the hook is still called (Rules of
  // Hooks require it to run unconditionally) but is fed a `null` home so its
  // own validation gate (Req 1.5-1.7) never issues a Search_Request —
  // bypassing the live fetch for that call.
  const usingLiveSearch = jobsProp === undefined;
  const { jobs: liveJobs, status: liveStatus, retry } = useJobSearch(
    usingLiveSearch ? home : null,
    toleranceMinutes,
  );

  // --- Job source (Req 1.1, 1.2, 6.1) --------------------------------------
  // Live jobs come straight from `useJobSearch` — no client-side
  // commute-boundary gate is applied to them (Req 6.1). An explicit `jobs`
  // prop always wins and is treated as already-successful (Req backward
  // compatibility note above).
  const jobs = usingLiveSearch ? liveJobs : jobsProp;
  const status: SearchStatus = usingLiveSearch ? liveStatus : "success";

  // --- Map pins pipeline ---------------------------------------------------
  // Every job is a map pin candidate; `TransitMap` plots one pin per job
  // with a valid `location` — no commute-boundary gate (Req 6.1, 6.2, 6.4).
  const isochronePins = jobs;

  // --- List cards pipeline --------------------------------------------------
  // Restricted to the current map viewport (Req 6.2, 9.1-9.3), then ordered
  // by descending Commute Fit with an A→Z tiebreak (Req 6.3, 9.5). Re-derives
  // whenever the live `jobs` or the viewport bounds change.
  const visibleJobs = useMemo(
    () => orderByCommuteFit(filterJobsByViewport(jobs, viewportBounds)),
    [jobs, viewportBounds],
  );

  // Single-selection handler shared by the JobList and the map, so the
  // highlight stays in sync across both regions.
  const handleSelect = (id: string) => setSelectedJobId(id);

  return (
    <section
      data-testid="job-discovery-screen"
      className="flex h-full flex-col overflow-x-hidden"
    >
      <DiscoveryHeader
        toleranceMinutes={toleranceMinutes}
        onToleranceChange={setToleranceMinutes}
      />

      {/*
        Split body. Base (<1024px): a single stacked column (grid-cols-1) with
        the JobList as the primary full-width region, list above map by DOM
        order (Req 3.2). At the `lg:` (1024px) breakpoint it becomes an
        explicit 35/65 column split (`lg:grid-cols-[35fr_65fr]`) — JobList
        left (~35%), map right (~65%), both visible at once with no
        horizontal scroll (Req 3.1).
      */}
      <div
        data-testid="discovery-body"
        className="grid min-h-0 flex-1 grid-cols-1 gap-space-md overflow-x-hidden p-space-md lg:grid-cols-[35fr_65fr]"
      >
        {/* LEFT / primary region: while sourcing from the live hook, renders
            LoadingState/ErrorState/JobList based on `status` (Req 5.1, 5.5,
            5.6); JobList renders its own K.jobsEmpty empty-state when
            `visibleJobs` is empty (Req 8.5, 9.4). Dark-mode surface token on
            the region background (Req 3.3). */}
        <div
          data-testid="job-list-region"
          className="min-h-0 overflow-y-auto rounded-xl bg-surface-container-low lg:order-1"
        >
          {status === "loading" ? (
            <LoadingState />
          ) : status === "error" ? (
            <ErrorState onRetry={retry} />
          ) : (
            <JobList
              jobs={visibleJobs}
              selectedJobId={selectedJobId}
              onSelect={handleSelect}
            />
          )}
        </div>

        {/*
          RIGHT region: the interactive Transit map. It receives `home` and
          `toleranceMinutes` directly (its own pins derive internally from
          `jobs`, task 12) plus `onViewportSettle`, which updates the
          `viewportBounds` state driving the list pipeline above (Req 9.1).
          The map region is unaffected by `status` — it always renders the
          current `jobs`.

          `<main>` (AppShell) is now capped to the viewport height at `lg:`
          and scrolls its own content internally, so this section's
          `h-full` is a real, bounded viewport height rather than a value
          that grows with content. That lets the map region fill its grid
          row height (`h-full`) and stay fully visible while only the job
          list region (which keeps its own `overflow-y-auto`) scrolls
          internally — the map never moves and Leaflet's container never
          gets resized by page scroll, which is what caused the map to
          render weirdly (grey/half-loaded tiles) on scroll. Below `lg:` the
          map keeps stacking under the list (Req 3.2) with its own
          `min-h-64` floor.
        */}
        <div
          data-testid="map-region"
          role="region"
          aria-label={resolveText(K.mapLegendTitle, strings)}
          className="min-h-64 rounded-xl bg-surface-container-low lg:order-2 lg:h-full"
        >
          <TransitMap
            jobs={isochronePins}
            selectedJobId={selectedJobId}
            onSelect={handleSelect}
            home={home ?? null}
            toleranceMinutes={toleranceMinutes}
            onViewportSettle={setViewportBounds}
          />
        </div>
      </div>
    </section>
  );
}
