// Feature: job-discovery-map-first
// Screen 1 — Candidate Job Discovery: Map-First composition + interaction
// state (task 12.1).
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
// Two SEPARATE derivation pipelines run in parallel because the requirements
// assign them different sources (see design.md "State ownership and data
// flow"):
//   - Map pins: `filterJobsByIsochrone(jobs, buildIsochrone(home,
//     toleranceMinutes))` in a single `useMemo`, so the isochrone rebuilds
//     and re-filters synchronously whenever `home`/`toleranceMinutes` change
//     (Req 7.4, 8.4). The filtered pins are passed to `TransitMap`, which
//     also applies the same isochrone filter internally (task 11.5) as a
//     defensive no-op.
//   - List cards: `orderByCommuteFit(filterJobsByViewport(jobs,
//     viewportBounds))` (Req 9.1, 9.4, 9.5) — filtered by the current map
//     viewport, then ordered by descending Commute Fit with an A→Z tiebreak.
//     `JobList` already renders its own empty-state (K.jobsEmpty) when given
//     zero cards (Req 8.5, 9.4).
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
  buildIsochrone,
  clampToleranceStep,
  filterByTolerance,
  filterJobsByIsochrone,
  filterJobsByViewport,
  isValidCoordinate,
  orderByCommuteFit,
  resolveText,
  TOLERANCE_TARGET,
  type Coordinate,
  type Job,
  type MapBounds,
} from "../domain";
import { DiscoveryHeader, JobList, TransitMap } from "./discovery";
import { K, strings } from "../i18n";

/**
 * In-file sample dataset so the routed screen renders real content and has
 * coordinates to plot. All jobs share the candidate's pre-selected role
 * ("Data Analyst" — Req: single-role Job Discovery); the variation across
 * cards is limited to company, Bangkok neighborhood/location, salary-driving
 * commute cost, commuting time, work model, and the Commute/Skill Fit scores:
 *   - Card 1 (high commute fit): TechNova BKK, ย่านอารีย์ (ใกล้ BTS), Hybrid.
 *   - Card 2 (medium commute fit): DataSphere Tech, ย่านสาทร, On-site.
 *   - Card 3 (low commute fit, for contrast): Global Analytics, ย่านบางนา,
 *     On-site — its coordinate is farther from the sample home, demonstrating
 *     isochrone/viewport filtering the same as before.
 */
const sampleJobs: Job[] = [
  {
    id: "j1",
    title: "Data Analyst",
    company: "TechNova BKK",
    urbanFitScore: 95,
    lifestyleFitScore: 95,
    commutingMinutes: 12,
    routeDescription: "12 นาที เดิน (ย่านอารีย์)",
    monthlyTravelCostBaht: 0,
    perTripCostBaht: 0,
    salaryBaht: 32000,
    monthlyCommuteCostBaht: 0,
    transitSegments: [{ mode: "Walk", minutes: 12 }],
    commuteFitScore: 98,
    skillFitScore: 85,
    workModel: "Hybrid",
    location: { lat: 13.7797, lng: 100.5448 }, // ย่านอารีย์ (ใกล้ BTS)
  },
  {
    id: "j2",
    title: "Junior Data Analyst",
    company: "DataSphere Tech",
    urbanFitScore: 88,
    lifestyleFitScore: 88,
    commutingMinutes: 18,
    routeDescription: "18 นาที ผ่าน วิน + MRT (ย่านสาทร)",
    monthlyTravelCostBaht: 1540,
    perTripCostBaht: 35,
    salaryBaht: 28000,
    monthlyCommuteCostBaht: 1540,
    transitSegments: [
      { mode: "Win", minutes: 3 },
      { mode: "MRT", minutes: 15 },
    ],
    commuteFitScore: 88,
    skillFitScore: 91,
    workModel: "On-site",
    location: { lat: 13.7205, lng: 100.5286 }, // ย่านสาทร
  },
  {
    id: "j3",
    title: "Data Analyst",
    company: "Global Analytics",
    urbanFitScore: 45,
    lifestyleFitScore: 45,
    commutingMinutes: 105, // "1 ชม. 45 นาที" — outside the default 20-min tolerance
    routeDescription: "1 ชม. 45 นาที ผ่าน BTS + เรือ (ย่านบางนา)",
    monthlyTravelCostBaht: 3800,
    perTripCostBaht: 90,
    salaryBaht: 40000,
    monthlyCommuteCostBaht: 3960,
    transitSegments: [
      { mode: "BTS", minutes: 60 },
      { mode: "Walk", minutes: 45 },
    ],
    commuteFitScore: 45,
    skillFitScore: 74,
    workModel: "On-site",
    location: { lat: 13.669, lng: 100.605 }, // ย่านบางนา
  },
];

/** Sample candidate home coordinate (ย่านอารีย์-ish) for the routed screen. */
const sampleHome: Coordinate = { lat: 13.7745, lng: 100.5392 };

export interface JobDiscoveryScreenProps {
  /**
   * The jobs to display. Optional so the routed screen (rendered with no props)
   * shows real sample content; tests pass their own dataset. The screen
   * filters and orders this list internally — callers pass the raw,
   * unordered set.
   */
  jobs?: Job[];
  /**
   * Candidate home/residence coordinate; null/invalid renders the
   * home-not-set state on the map (Req 7.2). Optional so the routed screen
   * shows real sample content.
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
  jobs = sampleJobs,
  home = sampleHome,
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

  // --- Map pins pipeline ---------------------------------------------------
  // Rebuilds synchronously whenever `jobs`, `home`, or `toleranceMinutes`
  // change so the isochrone redraw + pin re-evaluation stays within the
  // 1s/500ms budgets (Req 7.4, 8.4). Jobs outside the isochrone (or with an
  // invalid/missing coordinate) never appear as pins (Req 8.1-8.4). Note:
  // `TransitMap` also derives an isochrone-filtered pin set internally from
  // its own `home`/`toleranceMinutes` props (task 11.5) — passing the
  // already-filtered `isochronePins` here is a harmless superset/no-op for
  // that internal filter, and keeps the screen's derivation explicit per
  // the design's data-flow contract.
  const isochronePins = useMemo(() => {
    if (!isValidCoordinate(home)) {
      return [];
    }
    // Hard threshold (Req: strict filter logic) applies to map pins too —
    // a job whose commute time exceeds `toleranceMinutes` never appears as a
    // pin, even if its coordinate falls inside the isochrone's geometric
    // approximation.
    return filterJobsByIsochrone(
      filterByTolerance(jobs, toleranceMinutes),
      buildIsochrone(home, toleranceMinutes),
    );
  }, [jobs, home, toleranceMinutes]);

  // --- List cards pipeline --------------------------------------------------
  // Hard threshold (Req: strict filter logic): jobs whose commute time
  // exceeds `toleranceMinutes` are excluded outright, regardless of viewport
  // or Commute Fit — the list can never show an out-of-bounds card. Then
  // filtered by the current map viewport (Req 9.1-9.3), then ordered by
  // descending Commute Fit with an A→Z tiebreak (Req 9.5). Re-derives
  // whenever the source jobs, tolerance, or the viewport bounds change.
  const visibleJobs = useMemo(
    () =>
      orderByCommuteFit(
        filterJobsByViewport(
          filterByTolerance(jobs, toleranceMinutes),
          viewportBounds,
        ),
      ),
    [jobs, toleranceMinutes, viewportBounds],
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
        {/* LEFT / primary region: the viewport-filtered + Commute-Fit-ordered
            job list. JobList renders its own K.jobsEmpty empty-state when
            `visibleJobs` is empty (Req 8.5, 9.4). Dark-mode surface token on
            the region background (Req 3.3). */}
        <div
          data-testid="job-list-region"
          className="min-h-0 overflow-y-auto rounded-xl bg-surface-container-low lg:order-1"
        >
          <JobList
            jobs={visibleJobs}
            selectedJobId={selectedJobId}
            onSelect={handleSelect}
          />
        </div>

        {/*
          RIGHT region: the interactive Transit map. It receives `home` and
          `toleranceMinutes` directly (its own isochrone-filtered pins derive
          internally, task 11.5) plus `onViewportSettle`, which updates the
          `viewportBounds` state driving the list pipeline above (Req 9.1).
        */}
        <div
          data-testid="map-region"
          role="region"
          aria-label={resolveText(K.mapLegendTitle, strings)}
          className="min-h-64 rounded-xl bg-surface-container-low lg:order-2"
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
