// Feature: urbanfit-jobs-frontend
// Screen 4 — HR Dashboard: CandidateCard (Req 13.1–13.10).
//
// Renders one shortlisted candidate:
//   - Overall Urban-Fit Score as the LARGEST typographic text on the card
//     (Req 13.1), a whole-number percent via clampPercent, or a placeholder
//     when the score is unavailable (Req 13.9).
//   - Skill Match (Req 13.2) and Commuting Feasibility (Req 13.8) breakdowns,
//     each a label + a ProgressBar whose fill matches the value, or a
//     placeholder when unavailable (Req 13.9).
//   - A scrollable AI_Summary text box (Req 13.3).
//   - A primary/green "นัดหมายสัมภาษณ์" button (Req 13.4) that fires
//     onScheduleInterview (Req 13.6), and a destructive/red
//     "ปฏิเสธและส่งรายงานช่องว่างทักษะ" button (Req 13.5) that fires onReject
//     (Req 13.7).
//   - Visual activation feedback when either button is pressed (Req 13.10).

import { useState } from "react";
import { clampPercent, type CandidateSummary } from "../../domain";
import { ProgressBar, T } from "../../components";
import { K } from "../../i18n";

export interface CandidateCardProps {
  /** The candidate view model to render. */
  candidate: CandidateSummary;
  /** Fired with the candidate id when the schedule-interview button is activated (Req 13.6). */
  onScheduleInterview: (id: string) => void;
  /** Fired with the candidate id when the reject-and-report button is activated (Req 13.7). */
  onReject: (id: string) => void;
  /** Extra classes for the outer card element. */
  className?: string;
}

/** Which action button most recently received an activation, for feedback (Req 13.10). */
type ActivatedAction = "schedule" | "reject" | null;

/** Placeholder shown in place of an unavailable score (Req 13.9). */
function ScorePlaceholder() {
  return (
    <T
      k={K.hrScoreUnavailable}
      className="text-on-surface-variant"
    />
  );
}

/**
 * One score breakdown row: a label plus a matching ProgressBar, or a
 * placeholder when the score is unavailable (Req 13.2, 13.8, 13.9).
 */
function ScoreBreakdown({
  labelKey,
  value,
}: {
  labelKey: typeof K.hrSkillMatch | typeof K.hrCommutingFeasibility;
  value: number | null;
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <T k={labelKey} as="span" className="text-label-sm text-on-surface-variant" />
      {value === null ? (
        <ScorePlaceholder />
      ) : (
        <ProgressBar percent={value} showValue />
      )}
    </div>
  );
}

export function CandidateCard({
  candidate,
  onScheduleInterview,
  onReject,
  className,
}: CandidateCardProps) {
  // Local activation state powers the visual feedback (Req 13.10). It is set
  // synchronously on click (so a test can assert feedback appears) in addition
  // to firing the callback.
  const [activated, setActivated] = useState<ActivatedAction>(null);

  const handleSchedule = () => {
    setActivated("schedule");
    onScheduleInterview(candidate.id);
  };

  const handleReject = () => {
    setActivated("reject");
    onReject(candidate.id);
  };

  const overallUnavailable = candidate.urbanFitScore === null;

  return (
    <article
      data-testid="candidate-card"
      className={[
        "flex flex-col gap-space-md rounded-md border border-outline bg-surface-container p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header: candidate name + overall Urban-Fit Score (largest text). */}
      <header className="flex items-start justify-between gap-space-md">
        <h3 className="text-body-lg font-medium text-on-surface">{candidate.name}</h3>
        <div className="flex flex-col items-end">
          <T
            k={K.hrUrbanFitLabel}
            as="span"
            className="text-label-sm text-on-surface-variant"
          />
          {overallUnavailable ? (
            <span
              data-testid="overall-score"
              className="text-headline-lg font-bold text-on-surface-variant"
            >
              <ScorePlaceholder />
            </span>
          ) : (
            <span
              data-testid="overall-score"
              className="text-headline-lg font-bold tabular-nums text-primary"
            >
              {clampPercent(candidate.urbanFitScore as number)}%
            </span>
          )}
        </div>
      </header>

      {/* Score breakdowns: Skill Match (13.2) + Commuting Feasibility (13.8). */}
      <div className="flex flex-col gap-space-sm">
        <ScoreBreakdown labelKey={K.hrSkillMatch} value={candidate.skillMatch} />
        <ScoreBreakdown
          labelKey={K.hrCommutingFeasibility}
          value={candidate.commutingFeasibility}
        />
      </div>

      {/* AI summary: scrollable text box (Req 13.3). */}
      <div className="flex flex-col gap-space-xs">
        <T
          k={K.hrAiSummaryLabel}
          as="span"
          className="text-label-sm text-on-surface-variant"
        />
        <div
          data-testid="ai-summary"
          className="max-h-32 overflow-y-auto rounded border border-outline bg-surface-container-low p-space-md text-body-md text-on-surface"
        >
          {candidate.aiSummary}
        </div>
      </div>

      {/* Action buttons (Req 13.4–13.7) with activation feedback (Req 13.10).
          Both buttons use flex-1 so they stay evenly proportioned, with a
          balanced gap between them. */}
      <div className="flex flex-col gap-space-md sm:flex-row">
        <button
          type="button"
          data-testid="schedule-button"
          data-activated={activated === "schedule" ? "true" : undefined}
          aria-pressed={activated === "schedule"}
          onClick={handleSchedule}
          className={[
            "flex-1 rounded-md bg-primary px-space-md py-space-sm text-body-md font-medium text-on-primary",
            "transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary",
            activated === "schedule" ? "ring-2 ring-primary scale-95" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <T k={K.hrScheduleInterview} />
        </button>
        <button
          type="button"
          data-testid="reject-button"
          data-activated={activated === "reject" ? "true" : undefined}
          aria-pressed={activated === "reject"}
          onClick={handleReject}
          className={[
            "flex-1 rounded-md bg-error px-space-md py-space-sm text-body-md font-medium text-on-error",
            "transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-error",
            activated === "reject" ? "ring-2 ring-error scale-95" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <T k={K.hrRejectAndReport} />
        </button>
      </div>
    </article>
  );
}
