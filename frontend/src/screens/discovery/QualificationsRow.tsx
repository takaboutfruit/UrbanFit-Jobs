// Feature: job-card-qualifications
// Job_Card — QualificationsRow: a subtitle line showing the job's required
// years of experience and career growth index, e.g.
// "ประสบการณ์ที่ต้องการ: 3 ปี • โอกาสเติบโต: สูง".

import { formatQualificationsSubtitle } from "../../domain";
import type { CareerGrowthIndex } from "../../domain";

export interface QualificationsRowProps {
  /** Whole years of required experience, or null when unavailable. */
  yearsExperienceRequired: number | null;
  /** The career growth bucket, or null when unavailable. */
  careerGrowthIndex: CareerGrowthIndex | null;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the qualifications subtitle line beneath the Job_Meta_Row, in the
 * same muted-gray small-text treatment as Job_Meta_Row so it reads as
 * secondary metadata rather than competing with the Primary_Row.
 */
export function QualificationsRow({
  yearsExperienceRequired,
  careerGrowthIndex,
  className,
}: QualificationsRowProps) {
  return (
    <span
      data-testid="qualifications-row"
      className={["truncate text-label-sm text-on-surface-variant", className]
        .filter(Boolean)
        .join(" ")}
    >
      {formatQualificationsSubtitle(yearsExperienceRequired, careerGrowthIndex)}
    </span>
  );
}
