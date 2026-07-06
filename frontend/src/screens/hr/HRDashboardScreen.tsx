// Feature: urbanfit-jobs-frontend
// Screen 4 — Zero-Filter HR Dashboard: HRDashboardScreen (task 12.2).
//
// Composes the shortlist header + the CandidateCard list:
//   - A header title that INCLUDES both the number of shortlisted candidates
//     and the target job role (Req 12.1), e.g.
//     "5 อันดับผู้สมัครสูงสุดสำหรับตำแหน่ง Data Analyst". The title is composed
//     from the K.hrTitleTemplate string with {count}/{role} interpolated.
//   - NO search input, NO filter control, and NO sort control (Req 12.2).
//   - Candidates ordered by Urban-Fit Score DESCENDING (Req 12.4 / Property 15),
//     with a null score sorted to the end (lowest).
//   - Exactly one CandidateCard per candidate; the number of cards equals the
//     count stated in the title (Req 12.3 / Property 14).
//   - An empty-state message (K.hrEmpty) when there are no candidates (Req 12.5).
//   - One card per row on mobile (<768px); a wider grid at >=768px (Req 14.3).

import { useMemo } from "react";
import { resolveText, type CandidateSummary, type HRShortlist } from "../../domain";
import { T } from "../../components";
import { K, strings } from "../../i18n";
import { CandidateCard } from "./CandidateCard";

export interface HRDashboardScreenProps {
  /** The shortlist view model to render. Defaults to an in-file sample so the
   *  routed screen (rendered with no props) shows real content. */
  shortlist?: HRShortlist;
  /** Fired with the candidate id when a card's schedule-interview button is used. */
  onScheduleInterview?: (id: string) => void;
  /** Fired with the candidate id when a card's reject-and-report button is used. */
  onReject?: (id: string) => void;
}

/**
 * Order candidates by Urban-Fit Score descending (Req 12.4 / Property 15).
 * A null score is treated as the lowest possible value so unavailable-score
 * candidates sort to the end. Uses a stable sort over a copy (never mutates
 * the input) and does NOT re-order by any other field.
 */
function orderCandidatesByScoreDesc(candidates: CandidateSummary[]): CandidateSummary[] {
  const scoreOf = (c: CandidateSummary): number =>
    c.urbanFitScore === null ? Number.NEGATIVE_INFINITY : c.urbanFitScore;
  return [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a));
}

/**
 * Compose the shortlist title from the template, interpolating the candidate
 * count and target role (Req 12.1). resolveText guarantees a non-empty,
 * non-raw-key template (Property 17); interpolation preserves that guarantee.
 */
function buildTitle(count: number, targetRole: string): string {
  return resolveText(K.hrTitleTemplate, strings)
    .replace("{count}", String(count))
    .replace("{role}", targetRole);
}

/** Sample shortlist of 5 candidates so the routed screen renders real content
 *  matching the zero-filter "top 5" shortlist (Req 12.1, 12.3). */
const defaultShortlist: HRShortlist = {
  targetRole: "Data Analyst",
  candidates: [
    {
      id: "c1",
      name: "สมชาย ใจดี",
      urbanFitScore: 92,
      skillMatch: 88,
      commutingFeasibility: 95,
      aiSummary:
        "ผู้สมัครแสดงการคิดเชิงวิเคราะห์ที่ดีเยี่ยม สื่อสารชัดเจน และแก้ปัญหาข้อมูลได้อย่างเป็นระบบภายใต้เวลาจำกัด",
    },
    {
      id: "c2",
      name: "อารยา วงศ์ทอง",
      urbanFitScore: 87,
      skillMatch: 91,
      commutingFeasibility: 80,
      aiSummary:
        "มีทักษะการทำความสะอาดข้อมูลและการทำงานเป็นทีมโดดเด่น เหมาะกับงานที่ต้องประสานหลายฝ่าย",
    },
    {
      id: "c3",
      name: "ธนกร ศรีสุข",
      urbanFitScore: 79,
      skillMatch: 74,
      commutingFeasibility: 88,
      aiSummary:
        "พื้นฐานสถิติแน่น เรียนรู้เร็ว แต่ควรพัฒนาการนำเสนอผลลัพธ์ให้เข้าใจง่ายขึ้น",
    },
    {
      id: "c4",
      name: "พิมพ์ชนก แสงทอง",
      urbanFitScore: 75,
      skillMatch: 70,
      commutingFeasibility: 82,
      aiSummary:
        "ถามคำถามเพื่อทำความเข้าใจโจทย์ก่อนลงมือทำ มีวิธีคิดเป็นขั้นเป็นตอน แต่ยังใช้เวลานานกับการเขียน Query ที่ซับซ้อน",
    },
    {
      id: "c5",
      name: "วรากร ทองสุข",
      urbanFitScore: 71,
      skillMatch: 68,
      commutingFeasibility: 75,
      aiSummary:
        "พื้นฐาน Python และการแสดงผลข้อมูลอยู่ในระดับดี สื่อสารตรงประเด็น แต่ควรฝึกการวิเคราะห์เชิงสถิติเพิ่มเติม",
    },
  ],
};

export function HRDashboardScreen({
  shortlist = defaultShortlist,
  onScheduleInterview,
  onReject,
}: HRDashboardScreenProps) {
  const ordered = useMemo(
    () => orderCandidatesByScoreDesc(shortlist.candidates),
    [shortlist.candidates]
  );

  const count = shortlist.candidates.length;
  const title = buildTitle(count, shortlist.targetRole);

  // No-op fallbacks: the actual schedule/reject actions are out of scope here;
  // CandidateCard already fires these callbacks (Req 13.6/13.7).
  const handleSchedule = onScheduleInterview ?? (() => {});
  const handleReject = onReject ?? (() => {});

  return (
    <section className="flex flex-col gap-space-lg p-space-lg">
      {/* Shortlist header title including count + target role (Req 12.1). */}
      <header>
        <h2 data-testid="hr-title" className="text-headline-md font-bold text-on-surface">
          {title}
        </h2>
      </header>

      {count === 0 ? (
        // Empty-state message when there are no candidates (Req 12.5).
        <T
          k={K.hrEmpty}
          as="p"
          className="rounded-md border border-outline bg-surface-container p-space-lg text-body-md text-on-surface-variant"
        />
      ) : (
        // One card per candidate. Single column on mobile (<768px), a wider
        // grid at >=768px, capping at 3 columns on large screens so cards
        // wrap onto additional rows instead of stretching/squishing
        // (Req 14.3).
        <div
          data-testid="candidate-grid"
          className="grid grid-cols-1 gap-space-lg md:grid-cols-2 xl:grid-cols-3"
        >
          {ordered.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onScheduleInterview={handleSchedule}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </section>
  );
}
