// Feature: urbanfit-jobs-frontend
// Screen 1 — Candidate Job Discovery: composition + selection state.
//
// The candidate's Job Role and Residence are already pre-selected during
// onboarding, so this screen no longer owns editable residence text — the
// header shows a static role/residence context block instead of a search
// input.
//
// This screen OWNS the local interaction state (Req 4.1, 6.4/6.5, 14.1):
//   - selectedJobId : string | null   — the single selected job (Req 4.8)
//   - toleranceMinutes : number       — 15..120 step 5, default 60 (Req 6.2)
//
// It derives the VISIBLE list by ordering first and filtering second:
//   filterByTolerance(orderJobs(jobs), toleranceMinutes)
// so cards are ranked by Urban-Fit Score descending (Req 4.1) and then jobs
// whose commuting time exceeds the tolerance are removed (Req 6.5), with the
// remaining jobs keeping their descending order. Changing the slider re-derives
// the list synchronously (Req 6.4/6.5).
//
// Layout (Req 3.1 / 3.2 / 14.1):
//   - <1024px  : a single stacked column; the JobList is the primary,
//                full-width region (map region stacks beneath it).
//   - >=1024px : a two-region split (`lg:` breakpoint) — JobList on the LEFT and
//                the map region on the RIGHT, both visible simultaneously with
//                no horizontal scrolling.
//
// The Transit map itself is built in task 7.7. For now the right region is a
// labelled placeholder (data-testid="map-region"). Selection state is wired so
// 7.7 can drop the real <TransitMap> in with the SAME props already used by the
// JobList: `jobs={visibleJobs}`, `selectedJobId`, `onSelect={handleSelect}`.

import { useMemo, useState } from "react";
import {
  filterByTolerance,
  orderJobs,
  resolveText,
  type Job,
} from "../domain";
import { DiscoveryHeader, JobList, TransitMap } from "./discovery";
import { K, strings } from "../i18n";

/** Default maximum commute time (minutes) — within the 15..120 step-5 range. */
export const DEFAULT_TOLERANCE_MINUTES = 60;

/** Default pre-selected role shown in the header (onboarding-driven UX). */
export const DEFAULT_RECOMMENDED_ROLE = "Data Analyst";

export interface JobDiscoveryScreenProps {
  /**
   * The jobs to display. Optional so the routed screen (rendered with no props)
   * shows real sample content; tests pass their own dataset. The screen orders
   * and filters this list internally — callers pass the raw, unordered set.
   */
  jobs?: Job[];
  /** The candidate's pre-selected role from onboarding (defaults to a sample role). */
  recommendedRole?: string;
  /** Initial tolerance in minutes (defaults to DEFAULT_TOLERANCE_MINUTES). */
  initialToleranceMinutes?: number;
}

/**
 * In-file sample dataset so the routed screen renders real content and task 7.7
 * has coordinates to plot. Intentionally varied:
 *   - Some jobs have a `location` coordinate, some are null (unplottable).
 *   - Two jobs share urbanFitScore 88 (Agoda before Bitkub) to exercise the
 *     company A→Z tiebreak from `orderJobs`.
 *   - One job has `commutingMinutes: null` (unavailable) and one exceeds the
 *     default 60-minute tolerance so filtering is visibly meaningful.
 *   - All three work models appear.
 */
const sampleJobs: Job[] = [
  {
    id: "j1",
    title: "Senior Data Analyst",
    company: "Ascend Money",
    urbanFitScore: 92,
    lifestyleFitScore: 88,
    commutingMinutes: 35,
    routeDescription: "35 นาที ผ่าน BTS",
    monthlyTravelCostBaht: 1800,
    workModel: "Hybrid",
    location: { lat: 13.746, lng: 100.535 },
  },
  {
    id: "j2",
    title: "Machine Learning Engineer",
    company: "Agoda",
    urbanFitScore: 88,
    lifestyleFitScore: 82,
    commutingMinutes: 50,
    routeDescription: "50 นาที ผ่าน MRT + BRT",
    monthlyTravelCostBaht: 2400,
    workModel: "On-site",
    location: { lat: 13.729, lng: 100.524 },
  },
  {
    id: "j3",
    title: "Frontend Developer",
    company: "Bitkub",
    urbanFitScore: 88, // tie with Agoda -> Agoda (A) sorts before Bitkub (B)
    lifestyleFitScore: 79,
    commutingMinutes: 25,
    routeDescription: "25 นาที ผ่าน BTS",
    monthlyTravelCostBaht: 1200,
    workModel: "Remote",
    location: null, // no coordinate -> unplottable on the map (Req 5.2)
  },
  {
    id: "j4",
    title: "Data Scientist",
    company: "LINE MAN Wongnai",
    urbanFitScore: 76,
    lifestyleFitScore: 71,
    commutingMinutes: null, // commuting time unavailable (Req 4.5 / 5.7)
    routeDescription: "",
    monthlyTravelCostBaht: 0,
    workModel: "Hybrid",
    location: { lat: 13.7563, lng: 100.5018 },
  },
  {
    id: "j5",
    title: "Backend Engineer",
    company: "SCB TechX",
    urbanFitScore: 64,
    lifestyleFitScore: 60,
    commutingMinutes: 95, // exceeds the default 60-min tolerance -> filtered out
    routeDescription: "95 นาที ผ่าน MRT",
    monthlyTravelCostBaht: 3200,
    workModel: "On-site",
    location: { lat: 13.701, lng: 100.539 },
  },
  {
    id: "j6",
    title: "DevOps Engineer",
    company: "Sea (Garena)",
    urbanFitScore: 58,
    lifestyleFitScore: 55,
    commutingMinutes: 45,
    routeDescription: "45 นาที ผ่าน BTS + เรือ",
    monthlyTravelCostBaht: 1500,
    workModel: "Remote",
    location: null,
  },
];

/**
 * Job Discovery screen composition + selection state.
 */
export function JobDiscoveryScreen({
  jobs = sampleJobs,
  recommendedRole = DEFAULT_RECOMMENDED_ROLE,
  initialToleranceMinutes = DEFAULT_TOLERANCE_MINUTES,
}: JobDiscoveryScreenProps = {}) {
  // --- Owned interaction state -------------------------------------------
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [toleranceMinutes, setToleranceMinutes] = useState(
    initialToleranceMinutes,
  );

  // --- Derived visible list ----------------------------------------------
  // Order FIRST (Req 4.1: score desc, company A→Z), then filter by tolerance
  // (Req 6.5) which preserves the ordering of the retained jobs. Re-derives
  // whenever the source jobs or the tolerance change (Req 6.4/6.5).
  const visibleJobs = useMemo(
    () => filterByTolerance(orderJobs(jobs), toleranceMinutes),
    [jobs, toleranceMinutes],
  );

  // Single-selection handler shared by the JobList and (task 7.7) the map, so
  // the highlight stays in sync across both regions (Req 4.8 / 5.8 / 5.9).
  const handleSelect = (id: string) => setSelectedJobId(id);

  return (
    <section
      data-testid="job-discovery-screen"
      className="flex h-full flex-col overflow-x-hidden"
    >
      <DiscoveryHeader
        recommendedRole={recommendedRole}
        toleranceMinutes={toleranceMinutes}
        onToleranceChange={setToleranceMinutes}
      />

      {/*
        Split body. Base (<1024px): a single stacked column (grid-cols-1) with
        the JobList as the primary full-width region (Req 3.2 / 14.1). At the
        `lg:` (1024px) breakpoint it becomes a two-column split — JobList left,
        map right, both visible at once with no horizontal scroll (Req 3.1).
      */}
      <div
        data-testid="discovery-body"
        className="grid min-h-0 flex-1 grid-cols-1 gap-space-md overflow-x-hidden p-space-md lg:grid-cols-2"
      >
        {/* LEFT / primary region: the ordered + filtered job list. */}
        <div
          data-testid="job-list-region"
          className="min-h-0 overflow-y-auto lg:order-1"
        >
          <JobList
            jobs={visibleJobs}
            selectedJobId={selectedJobId}
            onSelect={handleSelect}
          />
        </div>

        {/*
          RIGHT region: the interactive Transit map (task 7.7). It receives the
          SAME three props as the JobList (`visibleJobs`, `selectedJobId`,
          `handleSelect`) so the list and the map keep their single-selection
          highlight in sync (Req 5.8/5.9).
        */}
        <div
          data-testid="map-region"
          role="region"
          aria-label={resolveText(K.mapLegendTitle, strings)}
          className="min-h-64 lg:order-2"
        >
          <TransitMap
            jobs={visibleJobs}
            selectedJobId={selectedJobId}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </section>
  );
}
