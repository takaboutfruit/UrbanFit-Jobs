// Feature: urbanfit-jobs-frontend
// Screen 3 — Market-Benchmarked Radar: AdviceAlert (task 11.3).
//
// Computes the candidate's largest skill shortfall against a benchmark via the
// pure `largestShortfall` helper and renders automated advice (Req 11):
//   - When a gap exists: a warning-amber (#f2cc60) message that NAMES the skill
//     dimension, identifies the benchmark being compared against, and states
//     the shortfall as a whole-number percentage (Req 11.1, 11.2), plus an
//     ENABLED "ค้นหาคอร์สอัปสกิล" CTA that initiates navigation to the upskill
//     courses destination within 1s (Req 11.3, 11.4).
//   - When no dimension is below benchmark: a no-gap confirmation message shown
//     in place of the skill-gap message (Req 11.5).
//
// The message is composed here (not a static i18n string) because the dimension
// name, benchmark label, and shortfall percentage are dynamic. See
// `composeSkillGapMessage` below.

import { useNavigate } from "react-router-dom";
import { largestShortfall, resolveText } from "../../domain";
import { Icon, T } from "../../components";
import { K, strings } from "../../i18n";

/** Default client-side destination for the upskill-courses CTA (Req 11.4). */
export const UPSKILL_COURSES_PATH = "/courses";

/**
 * Compose the skill-gap advice message (Req 11.1).
 *
 * Produces, for example:
 *   "แจ้งเตือนช่องว่างทักษะ: ทักษะ Data Cleaning ของคุณต่ำกว่าค่าเฉลี่ยตลาด 15%"
 *
 * The prefix and body template come from the i18n table; the dimension name,
 * benchmark label, and shortfall percentage are substituted in. The shortfall
 * is rounded to a whole number.
 *
 * @param dimension - Name of the skill dimension with the largest shortfall.
 * @param shortfall - Raw shortfall (benchmark − candidate); rounded here.
 * @param benchmarkLabel - Human label of the benchmark being compared against.
 * @returns The fully composed Thai-first advice message.
 */
export function composeSkillGapMessage(
  dimension: string,
  shortfall: number,
  benchmarkLabel: string,
): string {
  const prefix = resolveText(K.adviceGapPrefix, strings);
  const body = resolveText(K.adviceGapTemplate, strings)
    .replace("{dimension}", dimension)
    .replace("{benchmark}", benchmarkLabel)
    .replace("{shortfall}", String(Math.round(shortfall)));
  return `${prefix}: ${body}`;
}

export interface AdviceAlertProps {
  /** Candidate scores: dimension -> 0..100. */
  candidate: Record<string, number>;
  /** Benchmark scores to compare against: dimension -> 0..100. */
  benchmark: Record<string, number>;
  /**
   * Name of the benchmark being compared against, e.g. "ค่าเฉลี่ยตลาด" (market)
   * or "ข้อกำหนดของบริษัท" (company requirement). The consuming screen decides
   * which benchmark is in play and passes its label.
   */
  benchmarkLabel: string;
  /**
   * Optional handler for the "ค้นหาคอร์สอัปสกิล" CTA. When provided it is
   * invoked on selection; otherwise the component navigates to
   * {@link UPSKILL_COURSES_PATH} via react-router (Req 11.4).
   */
  onFindCourses?: () => void;
  /** Optional extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Automated advice/skill-gap alert for the radar report (Req 11).
 */
export function AdviceAlert({
  candidate,
  benchmark,
  benchmarkLabel,
  onFindCourses,
  className,
}: AdviceAlertProps) {
  const navigate = useNavigate();
  const gap = largestShortfall(candidate, benchmark);

  const handleFindCourses = () => {
    // Synchronous, client-side — well within the 1s budget (Req 11.4).
    if (onFindCourses) {
      onFindCourses();
      return;
    }
    navigate(UPSKILL_COURSES_PATH);
  };

  const wrapperClasses = [
    "rounded-md p-space-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // No gap: show the confirmation message in place of the skill-gap message
  // (Req 11.5).
  if (gap === null) {
    return (
      <section
        className={[wrapperClasses, "bg-surface-container"].join(" ")}
        data-testid="advice-alert"
        data-has-gap="false"
      >
        <p
          role="status"
          data-testid="advice-no-gap"
          className="flex items-center gap-space-sm text-body-lg text-primary"
        >
          <Icon name="check_circle" aria-hidden />
          <T k={K.adviceNoGap} />
        </p>
      </section>
    );
  }

  const message = composeSkillGapMessage(
    gap.dimension,
    gap.shortfall,
    benchmarkLabel,
  );

  return (
    <section
      className={[
        wrapperClasses,
        // Warning amber treatment (Req 11.2).
        "border border-warning/40 bg-warning/10",
      ].join(" ")}
      data-testid="advice-alert"
      data-has-gap="true"
    >
      <p
        role="alert"
        data-testid="advice-gap-message"
        className="flex items-center gap-space-sm text-body-lg font-medium text-warning"
      >
        <Icon name="warning" aria-hidden className="text-warning" />
        {message}
      </p>

      {/* Enabled, selectable CTA that navigates within 1s (Req 11.3, 11.4). */}
      <button
        type="button"
        onClick={handleFindCourses}
        data-testid="advice-find-courses"
        className="mt-space-md inline-flex items-center gap-space-xs rounded-md bg-primary px-space-md py-space-sm text-label-sm font-medium text-on-primary"
      >
        <Icon name="school" aria-hidden />
        <T k={K.adviceFindCourse} />
      </button>
    </section>
  );
}
