// Feature: urbanfit-jobs-frontend
// Screen 3 — Radar dashboard: RadarScreen composition.
//
// Composes a comprehensive candidate dashboard:
//   - CandidateHeader: candidate name, applied role, and a large overall
//     match score.
//   - A 2-column CSS grid (left column narrower than the right):
//       Left column:
//         - Card 1 "Skill DNA": the existing 6-axis Radar Chart, scaled down
//           to fit within the card.
//         - Card 2 "ทักษะทางเทคนิคที่ผ่านการตรวจสอบ": pass/fail status tags
//           for each verified technical skill.
//       Right column:
//         - Card 3 "ทักษะที่แนะนำให้พัฒนา (Upskill Priority)": upskill
//           recommendations derived from skill gaps in the radar data, plus
//           a CTA to explore an upskill challenge.
//         - Card 4 "ข้อมูลดิบจากการทำงาน": a grid of raw performance metric
//           stat boxes.
//   - The existing market-benchmark AdviceAlert is kept below the grid so the
//     skill-gap advice + upskilling CTA (Req 11) continues to work.
//
// Layout: vertical scrolling only at any viewport — `overflow-x-hidden` on
// the outer section guarantees no horizontal scrollbar is produced. The grid
// collapses to a single stacked column below the `md:` breakpoint.

import { useMemo } from "react";
import {
  resolveText,
  type CandidateProfile,
  type RadarData,
  type RadarSeries,
  type RawMetric,
  type TechnicalSkillCheck,
  type UpskillRecommendation,
} from "../../domain";
import { K, strings } from "../../i18n";
import { RadarChart } from "./RadarChart";
import { AdviceAlert } from "./AdviceAlert";
import { CandidateHeader } from "./CandidateHeader";
import { TechnicalSkillsCard } from "./TechnicalSkillsCard";
import { UpskillPriorityCard } from "./UpskillPriorityCard";
import { RawMetricsCard } from "./RawMetricsCard";

export interface RadarScreenProps {
  /** The radar view model to render. Defaults to an in-file sample so the
   *  routed screen (rendered with no props) shows real content. */
  data?: RadarData;
  /** Candidate identity + application context for the dashboard header. */
  profile?: CandidateProfile;
  /** Verified technical skill pass/fail checks (Card 2). */
  technicalSkills?: TechnicalSkillCheck[];
  /** Upskill recommendations derived from radar skill gaps (Card 3). */
  upskillRecommendations?: UpskillRecommendation[];
  /** Raw performance metrics (Card 4). */
  rawMetrics?: RawMetric[];
  /** Optional handler for the AdviceAlert "ค้นหาคอร์สอัปสกิล" CTA. Defaults to
   *  a no-op so the routed screen is safe without a /courses route. */
  onFindCourses?: () => void;
  /** Optional handler for the "ค้นหา challenge อัปสกิล" CTA in Card 3. Defaults
   *  to a no-op so the routed screen is safe without a /challenges route. */
  onFindChallenge?: () => void;
}

/**
 * Build a plain `dimension -> value` map from a radar series over the chart's
 * dimension list, so it can be handed to AdviceAlert (which takes
 * `Record<string, number>`). A missing dimension value is treated as 0. A
 * `null` series yields an empty map (AdviceAlert then shows the no-gap
 * confirmation, since there is nothing to compare).
 */
function seriesToMap(
  series: RadarSeries | null,
  dimensions: string[],
): Record<string, number> {
  if (series === null) {
    return {};
  }
  const map: Record<string, number> = {};
  for (const dimension of dimensions) {
    map[dimension] = series.values[dimension] ?? 0;
  }
  return map;
}

/**
 * Sample radar data so the routed screen renders real content. Six skill
 * dimensions forming a hexagon (Req 2.7) with candidate/requirement/market
 * series scored 0..100. The candidate sits BELOW the market benchmark on
 * "Data Cleaning" (60 vs 78) and "Visualization" (72 vs 76), so AdviceAlert
 * surfaces a gap (largest shortfall = Data Cleaning, 18%).
 */
const defaultData: RadarData = {
  dimensions: [
    "Data Cleaning",
    "SQL",
    "Python",
    "Visualization",
    "Statistics",
    "Business Logic",
  ],
  candidate: {
    values: {
      "Data Cleaning": 60,
      SQL: 85,
      Python: 88,
      Visualization: 72,
      Statistics: 74,
      "Business Logic": 80,
    },
  },
  requirement: {
    values: {
      "Data Cleaning": 65,
      SQL: 70,
      Python: 75,
      Visualization: 70,
      Statistics: 65,
      "Business Logic": 70,
    },
  },
  market: {
    values: {
      "Data Cleaning": 78,
      SQL: 80,
      Python: 82,
      Visualization: 76,
      Statistics: 72,
      "Business Logic": 75,
    },
  },
};

/** Sample candidate identity + application context for the header. */
const defaultProfile: CandidateProfile = {
  name: "คุณานนท์ รัตนวิจิตร",
  appliedRole: "Backend Developer",
  overallMatchScore: 92,
};

/** Sample verified technical skill checks for Card 2. */
const defaultTechnicalSkills: TechnicalSkillCheck[] = [
  { skill: "Python", passed: true },
  { skill: "SQL", passed: false },
  { skill: "Git", passed: true },
  { skill: "Docker", passed: true },
];

/** Sample upskill recommendations for Card 3, derived from radar skill gaps. */
const defaultUpskillRecommendations: UpskillRecommendation[] = [
  {
    label: "ทักษะ Data Cleaning (ต่ำกว่าค่าเฉลี่ยตลาด 18%)",
    priority: "high",
  },
  {
    label: "ทักษะ Business Logic (ต่ำกว่าเกณฑ์บริษัท 10%)",
    subtext: "แนะนำให้ศึกษาเพิ่มเติมเกี่ยวกับ Case Study ในอุตสาหกรรม Tech",
    priority: "medium",
  },
];

/** Sample raw performance metrics for Card 4. */
const defaultRawMetrics: RawMetric[] = [
  { label: "เวลาที่ใช้ก่อนเริ่มเขียน", value: "45s" },
  { label: "ทดสอบผ่าน", value: "8/10" },
  { label: "เวลาประมวลผล", value: "150ms" },
  { label: "หน่วยความจำที่ใช้", value: "45MB" },
  { label: "เวลาที่ใช้คิด", value: "12m" },
];

export function RadarScreen({
  data = defaultData,
  profile = defaultProfile,
  technicalSkills = defaultTechnicalSkills,
  upskillRecommendations = defaultUpskillRecommendations,
  rawMetrics = defaultRawMetrics,
  onFindCourses,
  onFindChallenge,
}: RadarScreenProps) {
  // Compare the candidate against the MARKET series (Req 11.1). Derive the
  // dimension->value maps AdviceAlert needs from the radar series values.
  const candidateMap = useMemo(
    () => seriesToMap(data.candidate, data.dimensions),
    [data.candidate, data.dimensions],
  );
  const marketMap = useMemo(
    () => seriesToMap(data.market, data.dimensions),
    [data.market, data.dimensions],
  );

  // No-op fallback keeps the routed screen safe without a /courses route.
  const handleFindCourses = onFindCourses ?? (() => {});

  const marketLabel = resolveText(K.radarLegendMarket, strings);

  return (
    // overflow-x-hidden + a centered max-width column => vertical scroll only,
    // no horizontal scrollbar at any viewport (Req 14.4 / 14.5).
    <section
      data-testid="radar-screen"
      className="flex flex-col overflow-x-hidden p-space-lg"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-lg">
        <CandidateHeader profile={profile} />

        {/* 2-column CSS grid: left column narrower than the right. Below
            the `md:` breakpoint it collapses to a single stacked column. */}
        <div
          data-testid="radar-dashboard-grid"
          className="grid grid-cols-1 gap-space-lg md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start"
        >
          {/* LEFT column: Skill DNA (radar chart) + verified technical skills. */}
          <div className="flex flex-col gap-space-lg">
            <div
              data-testid="skill-dna-card"
              className="flex flex-col gap-space-md rounded-xl border border-outline bg-surface-container p-space-lg"
            >
              <h3 className="text-body-lg font-semibold text-on-surface">
                {resolveText(K.radarSkillDnaTitle, strings)}
              </h3>
              {/* Scaled down so the chart fits nicely within the card
                  instead of filling the whole screen (Req: Card 1). */}
              <RadarChart data={data} className="mx-auto max-w-sm" />
            </div>

            <TechnicalSkillsCard skills={technicalSkills} />
          </div>

          {/* RIGHT column: upskill priority recommendations + raw performance metrics. */}
          <div className="flex flex-col gap-space-lg">
            <UpskillPriorityCard
              recommendations={upskillRecommendations}
              onFindChallenge={onFindChallenge}
            />
            <RawMetricsCard metrics={rawMetrics} />
          </div>
        </div>

        {/* Market-benchmark skill-gap advice + upskilling CTA (Req 11). */}
        <AdviceAlert
          candidate={candidateMap}
          benchmark={marketMap}
          benchmarkLabel={marketLabel}
          onFindCourses={handleFindCourses}
        />
      </div>
    </section>
  );
}
