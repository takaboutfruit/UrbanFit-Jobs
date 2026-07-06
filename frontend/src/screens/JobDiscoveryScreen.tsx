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
 * In-file sample dataset so the routed screen renders real content and has
 * coordinates to plot. All jobs share the candidate's pre-selected role
 * ("Data Analyst" — Req: single-role Job Discovery); the variation across
 * cards is limited to company, Bangkok neighborhood/location, salary-driving
 * commute cost, commuting time, work model, and the Urban-Fit match score:
 *   - Card 1 (high score): TechNova BKK, ย่านอารีย์ (ใกล้ BTS), Hybrid, 95%.
 *   - Card 2 (medium score): DataSphere Tech, ย่านสาทร, On-site, 78%.
 *   - Card 3 (low score, for contrast): Global Analytics, ย่านบางนา, On-site,
 *     45%; its 105-minute commute exceeds the default 60-minute tolerance, so
 *     it is filtered out until the slider is raised — demonstrating the
 *     tolerance filter same as before.
 */
const sampleJobs: Job[] = [
  {
    id: "j1",
    title: "Data Analyst",
    company: "TechNova BKK",
    urbanFitScore: 95,
    lifestyleFitScore: 95,
    commutingMinutes: 25,
    routeDescription: "25 นาที ผ่าน BTS (ย่านอารีย์)",
    monthlyTravelCostBaht: 1200,
    workModel: "Hybrid",
    location: { lat: 13.7797, lng: 100.5448 }, // ย่านอารีย์ (ใกล้ BTS)
  },
  {
    id: "j2",
    title: "Data Analyst",
    company: "DataSphere Tech",
    urbanFitScore: 78,
    lifestyleFitScore: 78,
    commutingMinutes: 50,
    routeDescription: "50 นาที ผ่าน MRT (ย่านสาทร)",
    monthlyTravelCostBaht: 2500,
    workModel: "On-site",
    location: { lat: 13.7205, lng: 100.5286 }, // ย่านสาทร
  },
  {
    id: "j3",
    title: "Data Analyst",
    company: "Global Analytics",
    urbanFitScore: 45,
    lifestyleFitScore: 45,
    commutingMinutes: 105, // "1 ชม. 45 นาที"
    routeDescription: "1 ชม. 45 นาที ผ่าน BTS + เรือ (ย่านบางนา)",
    monthlyTravelCostBaht: 3800,
    workModel: "On-site",
    location: { lat: 13.669, lng: 100.605 }, // ย่านบางนา
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
